const { combineRgb } = require('@companion-module/base')

module.exports = {
	initFeedbacks: function () {
		let self = this
		let feedbacks = {}

		const colorWhite = combineRgb(255, 255, 255) // White
		const colorRed = combineRgb(255, 0, 0) // Red

		feedbacks.mode = {
			type: 'boolean',
			name: 'Converter Mode',
			description: 'Change the button color based on the Converter Mode',
			defaultStyle: {
				color: colorWhite,
				bgcolor: colorRed,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Converter Mode',
					id: 'mode',
					default: self.CHOICES_CONVERTER_MODES[0].id,
					choices: self.CHOICES_CONVERTER_MODES,
				},
			],
			callback: function (feedback, bank) {
				let options = feedback.options
				if (options.mode == self.STATE.mode) {
					return true
				}
				return false
			},
		}

		if (self.STATE.mode === 'encoder') {
			feedbacks.videoSignal = {
				type: 'boolean',
				name: 'Encoder Video Signal is Online/Offline',
				description: 'If video signal is online or offline, change the colors of the button',
				defaultStyle: {
					color: colorWhite,
					bgcolor: colorRed,
				},
				options: [
					{
						type: 'dropdown',
						label: 'Change color if source is',
						id: 'compare',
						default: 'online',
						choices: [
							{ id: 'online', label: 'Online' },
							{ id: 'offline', label: 'Offline' },
						],
					},
				],
				callback: function (feedback, bank) {
					let options = feedback.options
					if (options.compare === 'online' && self.STATE.info.data.video_signal === true) {
						return true
					}
					if (options.compare === 'offline' && self.STATE.info.data.video_signal === false) {
						return true
					}

					return false
				},
			}

			feedbacks.audioSignal = {
				type: 'boolean',
				name: 'Encoder Audio Source is Online/Offline',
				description: 'If audio source is online or offline, change the colors of the button',
				defaultStyle: {
					color: colorWhite,
					bgcolor: colorRed,
				},
				options: [
					{
						type: 'dropdown',
						label: 'Change color if source is',
						id: 'compare',
						default: 'online',
						choices: [
							{ id: 'online', label: 'Online' },
							{ id: 'offline', label: 'Offline' },
						],
					},
				],
				callback: function (feedback, bank) {
					let options = feedback.options
					if (options.compare === 'online' && self.STATE.info.data.audio_signal === true) {
						return true
					}
					if (options.compare === 'offline' && self.STATE.info.dta.audio_signal === false) {
						return true
					}

					return false
				},
			}
		} else {
			//decoder feedbacks
			feedbacks.online = {
				type: 'boolean',
				name: 'Selected NDI Source is Online/Offline',
				description: 'If selected NDI source is online or offline, change the colors of the button',
				defaultStyle: {
					color: colorWhite,
					bgcolor: colorRed,
				},
				options: [
					{
						type: 'dropdown',
						label: 'Change color if source is',
						id: 'compare',
						default: 'online',
						choices: [
							{ id: 'online', label: 'Online' },
							{ id: 'offline', label: 'Offline' },
						],
					},
				],
				callback: function (feedback, bank) {
					let options = feedback.options
					if (options.compare === 'online' && self.STATE?.info?.data?.online === true) {
						return true
					}
					if (options.compare === 'offline' && self.STATE?.info?.data?.online === false) {
						return true
					}
					return false
				},
			}

			feedbacks.preset_enabled = {
				type: 'boolean',
				name: 'Selected Preset is Enabled',
				description: 'If selected preset is enabled, change the colors of the button',
				defaultStyle: {
					color: colorWhite,
					bgcolor: colorRed,
				},
				options: [
					{
						type: 'dropdown',
						label: 'Preset',
						id: 'preset',
						default: self.CHOICES_PRESETS[0].id,
						choices: self.CHOICES_PRESETS,
					},
				],
				callback: function (feedback, bank) {
					let options = feedback.options
					let preset = self.STATE.presets.data.find(
						(preset) => preset.id.toString() === options.preset.toString()
					)

					if (preset && preset.enable) {
						return true
					}

					return false
				},
			}

			feedbacks.preset_current = {
				type: 'boolean',
				name: 'Selected Preset is Current Preset',
				description: 'If selected preset is the current preset, change the colors of the button',
				defaultStyle: {
					color: colorWhite,
					bgcolor: colorRed,
				},
				options: [
					{
						type: 'dropdown',
						label: 'Preset',
						id: 'preset',
						default: self.CHOICES_PRESETS[0].id,
						choices: self.CHOICES_PRESETS,
					},
					{
						type: 'dropdown',
						label: 'Change color if preset is',
						id: 'compare',
						default: true,
						choices: [
							{ id: true, label: 'Current' },
							{ id: false, label: 'Not Current' },
						],
					},
				],
				callback: function (feedback, bank) {
					let options = feedback.options

					if (self.STATE.presets && self.STATE.presets.data) {
						let preset = self.STATE.presets.data.find(
							(preset) => preset.id.toString() === options.preset.toString()
						)

						if (preset && preset.current == options.compare) {
							return true
						}
					}

					return false
				},
			}
		}

		if (self.config.picManage == true) {
			/*feedbacks.picManage = {
				type: 'advanced',
				name: 'Picture Management - Show Picture',
				description: 'Show the picture of the selected picture management category',
				image: {
					width: 72,
					height: 72,
				},
				options: [
					{
						type: 'dropdown',
						label: 'Image Type',
						id: 'name',
						default: 'NOSIGNAL',
						choices: [
							{ id: 'NOSIGNAL', label: 'No Signal' },
							{ id: 'SPLASH', label: 'Decoding Mode' },
							{ id: 'UNSUPPORT_CODEC', label: 'Unsupported Codec' },
							{ id: 'UNSUPPORT', label: 'Unsupported Resolution' },
						],
					},
				],
				callback: async function (feedback, bank) {
					let options = feedback.options
					if (self.PICS[options.name] !== undefined) {
						console.log('attempting to draw...')
						const png64 = self.PICS[options.name]

						return {
							imageBuffer: Buffer.from(png64, 'base64'),
						}
					}

					console.log('No image found for feedback')
					return {}
				},
			}*/
		}

		self.setFeedbackDefinitions(feedbacks)
	},
}
