const { InstanceStatus } = require('@companion-module/base')

const kiloviewNDI = require('./kiloview')

module.exports = {
	// Action callbacks fire device calls without awaiting them. If the device ever returns
	// an error result (eg. a rejected/invalid request), authPost() throws - and an un-awaited
	// throw becomes an unhandled promise rejection, which crashes the whole module connection.
	// Route every action's device call through this so a single bad response just gets logged.
	runDeviceAction(promise, label) {
		let self = this
		Promise.resolve(promise).catch((e) => {
			self.log('error', `${label} failed: ${e.message}`)
		})
	},

	stopConnection() {
		let self = this

		// Invalidates any initConnection() still awaiting, so it can't start intervals after this
		self.CONNECTION_GENERATION++

		clearInterval(self.INTERVAL)
		clearInterval(self.INTERVAL_SOURCES)
		clearTimeout(self.RECONNECT_INTERVAL)
	},

	async initConnection() {
		let self = this

		self.stopConnection()
		const generation = self.CONNECTION_GENERATION

		if (self.config.host && self.config.host !== '') {
			self.updateStatus(InstanceStatus.Connecting)
			self.log('info', `Opening connection to ${self.config.host}`)
			self.STATE.mode = self.config.mode //set default mode

			self.DEVICE = new kiloviewNDI(
				self.config.host,
				self.config.username,
				self.config.password,
				self.config.useAuth !== false,
			)

			let authorized = false

			if (self.config.useAuth === false) {
				self.log('info', 'No authentication required. Connecting to device...')
				authorized = true
			} else {
				try {
					self.log('info', 'Attempting to authorize...')
					authorized = await self.DEVICE.authorize()
				} catch (error) {
					if (generation !== self.CONNECTION_GENERATION) {
						return
					}
					if (error.name === 'KiloviewNDIError') {
						self.log('error', 'Authorization failed. Check your username and password and try again.')
						self.updateStatus(InstanceStatus.ConnectionFailure, 'Authorization Failed. See log.')
					} else {
						self.log('error', 'Could not reach device. Retrying in 30 seconds.')
						self.updateStatus(InstanceStatus.ConnectionFailure)
						self.startReconnectInterval()
					}
					return
				}
			}

			if (generation !== self.CONNECTION_GENERATION) {
				return
			}

			if (authorized === true) {
				self.updateStatus(InstanceStatus.Ok)
				self.alias = self.DEVICE.alias
				self.log('info', `Connected to Device with user: ${self.alias}`)

				//reinitialize actions, feedbacks, variables, and presets because we changed the device mode
				this.initActions()
				this.initFeedbacks()
				this.initVariables()
				this.initPresets()

				//wait 8 seconds before moving on, because the device needs time to switch modes
				await new Promise((resolve) => setTimeout(resolve, 8000))
				if (generation !== self.CONNECTION_GENERATION) {
					return
				}

				// checkSources() depends on the mode that checkState() reads from the device
				await self.checkState()
				if (generation !== self.CONNECTION_GENERATION) {
					return
				}
				self.checkSources()
				self.startInterval()
				self.startNDISourcesInterval()
			} else {
				self.log('error', 'Authorization failed. Check your username and password and try again.')
				self.updateStatus(InstanceStatus.ConnectionFailure, 'Authorization Failed. See log.')
			}
		}
	},

	startReconnectInterval: function () {
		let self = this

		self.updateStatus(InstanceStatus.ConnectionFailure, 'Reconnecting')

		clearTimeout(self.RECONNECT_INTERVAL)

		self.log('info', 'Attempting to reconnect in 30 seconds...')

		self.RECONNECT_INTERVAL = setTimeout(self.initConnection.bind(this), 30000)
	},

	startInterval: function () {
		let self = this

		if (self.config.polling) {
			const rate = self.parsePollingRate(self.config.pollingrate, self.POLLINGRATE)

			self.log('info', `Starting Update Interval: Fetching new data from Device every ${rate}ms.`)
			self.INTERVAL = setInterval(self.checkState.bind(self), rate)
		} else {
			self.log(
				'info',
				'Polling is disabled. Module will not request new data at a regular rate. Feedbacks and Variables will not update.',
			)
		}
	},

	// The rate fields are free text, so anything non-numeric or under 1s falls back to the default
	parsePollingRate(value, fallback) {
		const rate = Number(value)
		if (!Number.isFinite(rate) || rate < 1000) {
			return fallback
		}
		return rate
	},

	async startNDISourcesInterval() {
		let self = this

		if (self.config.polling) {
			const rate = self.parsePollingRate(self.config.pollingrate_sources, self.POLLINGRATE_SOURCES)

			self.INTERVAL_SOURCES = setInterval(self.checkSources.bind(self), rate)
		} else {
			self.log('info', 'Polling is disabled. Module will not request new NDI sources at a regular rate.')
		}
	},

	async checkState() {
		let self = this

		if (!self.DEVICE) {
			return
		}

		try {
			const mode = await self.DEVICE.modeGet()
			if (mode.data.mode === 'encoder' || mode.data.mode === 'decoder') {
				self.updateStatus(InstanceStatus.Ok)

				if (self.STATE.mode !== mode.data.mode) {
					self.log('info', `Device mode is ${mode.data.mode}. Updating actions, feedbacks and variables.`)
					self.STATE.mode = mode.data.mode
					// info from the other mode has a different shape
					self.STATE.info = undefined
					self.initActions()
					self.initFeedbacks()
					self.initVariables()
					self.initPresets()
				}
			}
		} catch (e) {
			// Keep the last known mode instead of resetting to 'N/A' - a single failed poll
			// (eg. a brief hiccup while the device reconfigures after a source/mode switch)
			// shouldn't tear down the actions/feedbacks/choices built for the real mode.
			self.log('error', 'Error getting mode: ' + e.message)
			self.updateStatus(InstanceStatus.ConnectionFailure)
			return
		}

		try {
			if (self.STATE.mode === 'decoder') {
				const info = await self.DEVICE.decoderCurrentStatus()
				self.STATE.info = info

				//get presets
				const presets = await self.DEVICE.decoderPresets()
				//only update if different
				if (JSON.stringify(self.STATE.presets) !== JSON.stringify(presets)) {
					self.log('info', 'NDI Presets have changed. Updating Presets...')
					self.STATE.presets = presets
					self.initActions()
					self.initPresets()
				}
			} else if (self.STATE.mode == 'encoder') {
				const info = await self.DEVICE.encoderNdiStatus()
				self.STATE.info = info
			}
		} catch (e) {
			console.log('Error with info: ' + e.message)
		}

		try {
			const server_info = await self.DEVICE.sysServerInfo()
			self.STATE.server_info = server_info
		} catch (e) {
			console.log('Error with server_info: ' + e.message)
		}

		self.checkFeedbacks()
		self.checkVariables()
	},

	sourceId(source) {
		return Buffer.from(source.name + ':' + source.url).toString('base64')
	},

	findSourceById(id) {
		let self = this

		for (const source of self.STATE?.sources?.data ?? []) {
			if (self.sourceId(source) === id) {
				return source
			}
			const child = source.children?.find((subsource) => self.sourceId(subsource) === id)
			if (child) {
				return child
			}
		}

		return undefined
	},

	async checkSources() {
		let self = this

		if (!self.DEVICE) {
			return
		}

		let sourcesArray = []

		try {
			if (self.STATE.mode === 'decoder') {
				const sources = await self.DEVICE.decoderDiscoveryGet()

				if (sources && sources.data instanceof Array) {
					// cache the raw discovery data so actions can look up a source's "group" field,
					// which decoder/current/set requires on this firmware but isn't part of the button id
					self.STATE.sources = sources

					sources.data.forEach((source) => {
						sourcesArray.push({
							id: self.sourceId(source),
							label: source.name,
						})

						if (source.children?.length) {
							source.children.forEach((subsource) => {
								sourcesArray.push({
									id: self.sourceId(subsource),
									label: subsource.name,
								})
							})
						}
					})
				} else {
					sourcesArray = [{ id: 'null', url: '', label: '- No sources available -' }]
				}
			} else if (self.STATE.mode === 'encoder') {
				sourcesArray = [{ id: 'null', url: '', label: '- No sources available -' }]
			} else {
				// mode not known yet (eg. still connecting) - don't wipe out a previously valid source list
				return
			}
		} catch (e) {
			// A single failed/slow discovery poll (eg. right after switching sources, while the
			// device briefly rebuilds its NDI receive session) must not wipe out the previously
			// valid source list, and must not throw unhandled out of this interval callback.
			self.log('error', 'Error getting NDI sources: ' + e.message)
			return
		}

		//only update if sources have changed
		if (JSON.stringify(self.CHOICES_SOURCES) !== JSON.stringify(sourcesArray)) {
			self.log('info', 'NDI Sources have changed. Updating Choices.')
			self.CHOICES_SOURCES = sourcesArray
			self.initActions()
			self.initFeedbacks()
			self.initVariables()
			self.initPresets()
		}
	},
}
