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

				if (self.config.picManage == true) {
					//self.getPics()
				}
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

		//picture management
		if (self.config.picManage == true) {
			try {
				//self.getPics()
			} catch (e) {
				console.log('Error with getPics: ' + e.message)
			}
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

	async picManageAdd(name, path) {
		let self = this

		if (!self.DEVICE) {
			return
		}

		try {
			self.log('info', `Adding Picture: ${name}`)
			await self.DEVICE.picManageAdd(name, path)
		} catch (e) {
			console.log('Error with picManageAdd: ' + e.message)
		} finally {
			//self.getPics()
		}
	},

	async picManageReset(name) {
		let self = this

		if (!self.DEVICE) {
			return
		}

		try {
			self.log('info', `Resetting Picture: ${name}`)
			await self.DEVICE.picManageReset(name)
		} catch (e) {
			console.log('Error with picManageReset: ' + e.message)
		} finally {
			//self.getPics()
		}
	},

	async getPics() {
		let self = this

		if (!self.DEVICE) {
			return
		}

		try {
			if (self.config.verbose) {
				self.log('info', 'Fetching Pictures from Picture Management...')
				console.log('now: ' + new Date().toLocaleTimeString())
			}

			//request each png and store as base64 in self.PICS
			let pic_NOSIGNAL_FULL = await self.fetchAndEncodeImage('NOSIGNAL')
			let pic_SPLASH_FULL = await self.fetchAndEncodeImage('SPLASH')
			let pic_UNSUPPORT_CODEC_FULL = await self.fetchAndEncodeImage('UNSUPPORT_CODEC')
			let pic_UNSUPPORT_FULL = await self.fetchAndEncodeImage('UNSUPPORT')

			//now check and see if what is in self.PICS is different from what we just fetched, one by one
			if (self.PICS.NOSIGNAL_FULL !== pic_NOSIGNAL_FULL) {
				self.PICS.NOSIGNAL_FULL = pic_NOSIGNAL_FULL
				self.PICS.NOSIGNAL = await self.resize(pic_NOSIGNAL_FULL)
			}

			if (self.PICS.SPLASH_FULL !== pic_SPLASH_FULL) {
				self.PICS.SPLASH_FULL = pic_SPLASH_FULL
				self.PICS.SPLASH = await self.resize(pic_SPLASH_FULL)
			}

			if (self.PICS.UNSUPPORT_CODEC_FULL !== pic_UNSUPPORT_CODEC_FULL) {
				self.PICS.UNSUPPORT_CODEC_FULL = pic_UNSUPPORT_CODEC_FULL
				self.PICS.UNSUPPORT_CODEC = await self.resize(pic_UNSUPPORT_CODEC_FULL)
			}

			if (self.PICS.UNSUPPORT_FULL !== pic_UNSUPPORT_FULL) {
				self.PICS.UNSUPPORT_FULL = pic_UNSUPPORT_FULL
				self.PICS.UNSUPPORT = await self.resize(pic_UNSUPPORT_FULL)
			}

			if (self.config.verbose) {
				console.log('done: ' + new Date().toLocaleTimeString())
			}
		} catch (e) {
			console.log('Error with getPics(): ' + e.message)
		}
	},

	async fetchAndEncodeImage(name) {
		let self = this

		try {
			const response = await fetch(`http://${self.config.host}/img/${name}.png`)
			const arrayBuffer = await response.arrayBuffer()
			const buffer = Buffer.from(arrayBuffer)

			// Convert the buffer to a base64 string
			const base64EncodedImage = buffer.toString('base64')

			return base64EncodedImage
		} catch (error) {
			console.error('Error fetching or encoding image:', error)
			return undefined
		}
	},

	async resize(base64) {
		// Resize the image while maintaining aspect ratio, then add padding to make it 40x40
		const sharp = require('sharp')

		console.log('Resizing image...')

		// Convert the base64 image to a buffer
		const buffer = Buffer.from(base64, 'base64')

		// Resize the image to 40x40
		const resizedBuffer = await sharp(buffer)
			.resize(72, 72, {
				fit: 'inside', // Resize to fit within 40x40 while maintaining aspect ratio
				background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background (you can change to white or any color)
			})
			.toBuffer() // Output as a buffer

		// Convert the resized image buffer to base64
		const base64EncodedImage = resizedBuffer.toString('base64')

		return base64EncodedImage
	},
}
