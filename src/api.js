const { InstanceStatus } = require('@companion-module/base')

const kiloviewNDI = require('./kiloview')

module.exports = {
	async initConnection() {
		let self = this

		//clear any existing intervals
		clearInterval(self.INTERVAL)
		clearInterval(self.INTERVAL_SOURCES)
		clearInterval(self.RECONNECT_INTERVAL)

		if (self.config.host && self.config.host !== '') {
			self.updateStatus(InstanceStatus.Connecting)
			self.log('info', `Opening connection to ${self.config.host}`)
			self.STATE.mode = self.config.mode //set default mode

			self.DEVICE = new kiloviewNDI(self.config.host, self.config.username, self.config.password)

			let authorized = false

			if (self.config.useAuth === false) {
				self.log('info', 'No authentication required. Connecting to device...')
				authorized = true
			} else {
				try {
					self.log('info', 'Attempting to authorize...')
					authorized = await self.DEVICE.authorize()
				} catch (error) {
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

				self.checkState()
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

		if (self.RECONNECT_INTERVAL !== undefined) {
			clearInterval(self.RECONNECT_INTERVAL)
			self.RECONNECT_INTERVAL = undefined
		}

		self.log('info', 'Attempting to reconnect in 30 seconds...')

		self.RECONNECT_INTERVAL = setTimeout(self.initConnection.bind(this), 30000)
	},

	startInterval: function () {
		let self = this

		if (self.config.polling) {
			if (self.config.pollingrate === undefined || self.config.pollingrate < 1000) {
				self.config.pollingrate = 1000
			}

			self.log(
				'info',
				`Starting Update Interval: Fetching new data from Device every ${self.config.pollingrate}ms.`
			)
			self.INTERVAL = setInterval(self.checkState.bind(self), parseInt(self.config.pollingrate))
		} else {
			self.log(
				'info',
				'Polling is disabled. Module will not request new data at a regular rate. Feedbacks and Variables will not update.'
			)
		}
	},

	async startNDISourcesInterval() {
		let self = this

		if (self.config.polling) {
			if (self.config.pollingrate_sources === undefined || self.config.pollingrate_sources < 1000) {
				self.config.pollingrate_sources = 10000
			}

			self.INTERVAL_SOURCES = setInterval(self.checkSources.bind(self), parseInt(self.config.pollingrate_sources))
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
				self.STATE.mode = mode.data.mode
				self.updateStatus(InstanceStatus.Ok)
			}
		} catch (e) {
			self.log('error', 'Error getting mode: ' + e.message)
			self.updateStatus(InstanceStatus.ConnectionFailure)
			self.STATE.mode = 'N/A'
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

	async checkSources() {
		let self = this

		if (!self.DEVICE) {
			return
		}

		let sourcesArray = []

		if (self.STATE.mode === 'decoder') {
			const sources = await self.DEVICE.decoderDiscoveryGet()

			if (sources && sources.data instanceof Array) {
				sources.data.forEach((source) => {
					sourcesArray.push({
						id: Buffer.from(source.name + ':' + source.url).toString('base64'),
						label: source.name,
					})

					if (source.children?.length) {
						source.children.forEach((subsource) => {
							sourcesArray.push({
								id: Buffer.from(subsource.name + ':' + subsource.url).toString('base64'),
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
