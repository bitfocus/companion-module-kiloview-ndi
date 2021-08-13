const instance_skel = require('../../instance_skel')
const { initVariables } = require('./variables')
const { initFeedbacks } = require('./feedbacks')
const { initPresets } = require('./presets')
const kiloviewNDI = require('kiloview-ndi')
let debug = () => {}

const INTERVAL = 1000

/**
 * Companion instance class for the kiloview ndi endpoint.
 *
 * @extends instance_skel
 * @version 1.1.0
 * @since 1.0.0
 * @author Håkon Nessjøen <haakon@bitfocus.io>>
 */
class instance extends instance_skel {
	counter = 0
	sources = [{ id: 'null', url: '', label: '- No sources available -' }]

	state = {
		mode: 'N/A',
	}

	converterModes = [
		{
			id: 'encoder',
			label: 'Encoder',
		},
		{
			id: 'decoder',
			label: 'Decoder',
		},
	]

	/**
	 * Create an instance of a ndi module
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */
	constructor(system, id, config) {
		super(system, id, config)

		this.actions() // export actions
	}

	/**
	 * Setup the actions.
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @access public
	 * @since 1.0.0
	 */
	actions(system) {
		const actions = {}

		actions['modeSwitch'] = {
			label: 'Switch mode',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: 'decoder',
					choices: this.converterModes,
				},
			],
		}
		actions['setPreset'] = {
			label: 'Activate preset',
			options: [
				{
					type: 'number',
					label: 'Number',
					id: 'id',
					default: 1,
					min: 1,
					max: 10,
				},
			],
		}

		actions['setURL'] = {
			label: 'Set NDI source',
			options: [
				{
					type: 'dropdown',
					label: 'Source',
					id: 'url',
					choices: this.sources,
					default: this.sources[0].id,
				},
			],
		}

		this.setActions(actions)
	}

	/**
	 * Executes the provided action.
	 *
	 * @param {Object} action - the action to be executed
	 * @access public
	 * @since 1.0.0
	 */
	async action(action) {
		const opt = action.options

		if (!this.converter) {
			return
		}

		try {
			switch (action.action) {
				case 'modeSwitch':
					this.setVariable('mode', 'N/A')
					this.setVariable('online', 'N/A')
					this.setVariable('video_signal', 'N/A')
					this.state.online = undefined
					this.state.mode = undefined
					this.state.video_signal = undefined
					this.converter.modeSwitch(opt.mode)
					this.checkFeedbacks()
					break
				case 'setPreset':
					this.converter.decoderCurrentSetPreset(opt.id)
					break
				case 'setURL':
					const [name, ip, port] = Buffer.from(opt.url, 'base64').toString().split(/:/)
					this.converter.decoderCurrentSetUrl(name, ip + ':' + port)
					break
			}
		} catch (e) {
			this.log('error', 'Error running action ' + action.action + ': ' + e.message)
		}
	}

	/**
	 * Creates the configuration fields for web config.
	 *
	 * @returns {Array} the config fields
	 * @access public
	 * @since 1.0.0
	 */
	config_fields() {
		return [
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Information',
				value:
					'This modules currently supports Kiloview N40 devices. Make sure to enable HTTP API access on the user you are using, this is default off!',
			},
			{
				type: 'textinput',
				label: 'Target IP',
				id: 'address',
				width: 6,
				regex: this.REGEX_IP,
				required: true,
			},
			{
				type: 'textinput',
				label: 'Username',
				id: 'username',
				width: 3,
				default: 'admin',
				required: true,
			},
			{
				type: 'textinput',
				label: 'Password',
				id: 'password',
				width: 3,
				default: 'admin',
				required: true,
			},
			{
				type: 'checkbox',
				label: 'Periodically fetch available NDI sources from device',
				id: 'discovery',
				width: 12,
				default: false,
			},
		]
	}

	/**
	 * Clean up the instance before it is destroyed.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	destroy() {
		if (this.pollTimer !== undefined) {
			clearInterval(this.pollTimer)
		}

		debug('destroy', this.id)
	}

	/**
	 * Main initialization function called once the module
	 * is OK to start doing things.
	 *
	 * @access public
	 * @since 1.0.0
	 */
	init() {
		debug = this.debug

		try {
			this.status(this.STATUS_WARNING, 'Connecting')
			this.initFeedbacks()
			this.initPresets()
			this.initVariables()
		} catch (e) {
			console.error(e)
		}
		this.initConnection()
	}

	/**
	 * INTERNAL: initialize feedbacks.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initFeedbacks() {
		const feedbacks = initFeedbacks.bind(this)()
		this.setFeedbackDefinitions(feedbacks)
	}

	/**
	 * INTERNAL: initialize presets.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initPresets() {
		this.setPresetDefinitions(initPresets.bind(this)())
	}

	/**
	 * INTERNAL: initialize variables.
	 *
	 * @access protected
	 * @since 1.1.0
	 */
	initVariables() {
		initVariables(this)
	}

	/**
	 * INTERNAL: initalize the ndi connection.
	 *
	 * @access protected
	 * @since 1.0.0
	 */
	initConnection() {
		this.pollTimer = setInterval(() => this.checkState(), 2000)
		this.updateConfig(this.config)
	}

	async checkState() {
		if (!this.converter) {
			return
		}

		try {
			const mode = await this.converter.modeGet()
			this.setVariable('mode', mode.mode)
			this.state.mode = mode.mode
			this.status(this.STATUS_OK, 'Connected')
			this.checkFeedbacks('mode')
		} catch (e) {
			debug('Mode get error: %o', e.message)
			this.status(this.STATUS_ERROR, 'Error connecting to device')
			this.setVariable('mode', 'N/A')
			this.state.mode = 'N/A'
			return
		}

		try {
			if (this.state.mode === 'decoder') {
				const info = await this.converter.decoderCurrentStatus()

				let bitrate = info.bitrate
				if (bitrate < 1024) {
					bitrate = bitrate + ' Kbps'
				} else {
					bitrate = Math.round(bitrate / 1024) + ' Mbps'
				}
				this.setVariable('resolution', info.resolution || 'N/A')
				this.setVariable('bitrate', info.bitrate ? bitrate : 'N/A')
				this.setVariable('streamname', info.name || 'N/A')

				this.setVariable('online', info.online ? 'Yes' : 'No')
				if (this.state.online !== info.online) {
					this.state.online = info.online
				}
				this.checkFeedbacks('online')
				this.state.resolution = info.resolution
				this.state.bitrate = info.bitrate
				this.state.streamname = info.name
			} else if (this.state.mode === 'encoder') {
				const info = await this.converter.encoderNdiStatus()

				let bitrate = info.bitrate
				if (bitrate < 1024) {
					bitrate = bitrate + ' Kbps'
				} else {
					bitrate = Math.round(bitrate / 1024) + ' Mbps'
				}
				this.setVariable('resolution', info.resolution || 'N/A')
				this.setVariable('bitrate', info.bitrate ? bitrate : 'N/A')

				this.setVariable('video_signal', info.video_signal ? 'Yes' : 'No')
				if (this.state.video_signal !== info.video_signal) {
					this.state.video_signal = info.video_signal
					this.checkFeedbacks('video_signal')
				}

				this.state.resolution = info.resolution
				this.state.bitrate = info.bitrate
			}

			if (this.config.discovery && this.state.mode === 'decoder' && this.counter++ % 5 == 0) {
				// every 10 seconds
				const sources = await this.converter.decoderDiscoveryGet()
				this.sources = []

				if (sources && sources instanceof Array) {
					sources.forEach((source) => {
						this.sources.push({
							id: Buffer.from(source.name + ':' + source.url).toString('base64'),
							label: source.name,
						})

						if (source.children?.length) {
							source.children.forEach((subsource) => {
								this.sources.push({
									id: Buffer.from(subsource.name + ':' + subsource.url).toString('base64'),
									label: subsource.name,
								})
							})
						}
					})
				} else {
					this.sources = [{ id: 'null', url: '', label: '- No sources available -' }]
				}

				this.actions()
			}
		} catch (e) {
			debug('Error with info: ' + e.message)
			//
		}
	}

	/**
	 * Process an updated configuration array.
	 *
	 * @param {Object} config - the new configuration
	 * @access public
	 * @since 1.0.0
	 */
	updateConfig(config) {
		if (
			this.config.address !== config.address ||
			this.config.username !== config.username ||
			this.config.password !== config.password
		) {
			this.status(this.STATUS_WARNING, 'Connecting')
		}

		this.config = config

		if (config.address && config.username) {
			this.converter = new kiloviewNDI(config.address, config.username, config.password)
		} else {
			this.converter = null
		}

		this.actions()
		this.initFeedbacks()
		this.initVariables()
	}
}

exports = module.exports = instance
