module.exports = {
	initActions: function () {
		let self = this
		let actions = {}

		actions.modeSwitch = {
			name: 'Set Mode',
			options: [
				{
					type: 'dropdown',
					label: 'Mode',
					id: 'mode',
					default: self.CHOICES_CONVERTER_MODES[0].id,
					choices: self.CHOICES_CONVERTER_MODES,
				},
			],
			callback: function (action) {
				let options = action.options
				self.DEVICE.modeSwitch(options.mode)
			},
		}

		actions.toggleMode = {
			name: 'Toggle Mode',
			callback: function (action) {
				if (self.STATE.mode && self.STATE.mode === 'encoder') {
					self.DEVICE.modeSwitch('decoder')
				} else {
					self.DEVICE.modeSwitch('encoder')
				}
			},
		}

		actions.reboot = {
			name: 'Reboot Device',
			callback: function (action) {
				self.DEVICE.sysReboot()
			},
		}

		actions.reconnect = {
			name: 'Reset all NDI Connections',
			callback: function (action) {
				self.DEVICE.sysReconnect()
			},
		}

		actions.restore = {
			name: 'Restore to Factory Settings',
			callback: function (action) {
				self.DEVICE.sysRestore()
			},
		}

		if (self.STATE.mode === 'encoder') {
			actions.encoder_setType = {
				name: 'Set NDI Type',
				options: [
					{
						type: 'dropdown',
						label: 'Type',
						id: 'type',
						default: 'tcp',
						choices: [
							{ id: 'tcp', label: 'TCP' },
							{ id: 'multicast', label: 'Multicast' },
						],
					},
				],
				callback: function (action) {
					let options = action.options
					self.DEVICE.encoderSetType(options.type) // This is not working at the moment : encoderSetType function is missing in kiloview.js.
				},
			}

			actions.encoder_setAudioSignalType = {
				name: 'Set Audio Signal Type',
				options: [
					{
						type: 'dropdown',
						label: 'Audio Signal Type',
						id: 'type',
						default: 'embedded',
						choices: [
							{ id: 'embedded', label: 'Embedded' },
							{ id: 'analog', label: 'Analog' },
						],
					},
				],
				callback: function (action) {
					let options = action.options
					self.DEVICE.encoderNdiSetAudioSignalType(options.type)
				},
			}

			actions.encoder_setVolume = {
				name: 'Set Audio Volume',
				options: [
					{
						type: 'number',
						label: 'Volume',
						id: 'volume',
						tooltip: '(0-200)',
						min: 0,
						max: 200,
						default: 100,
						step: 1,
						required: true,
						range: false,
					},
				],
				callback: function (action) {
					let options = action.options
					self.DEVICE.encoderNdiSetAudioVolume(options.volume)
				},
			}
		} else {
			actions.setPreset = {
				name: 'Set Preset',
				options: [
					{
						type: 'dropdown',
						label: 'Preset',
						id: 'preset',
						default: self.CHOICES_PRESETS[0].id,
						choices: self.CHOICES_PRESETS,
					},
				],
				callback: async function (action) {
					let options = action.options
					self.DEVICE.decoderCurrentSetPreset(options.preset)
				},
			}

			actions.setSource = {
				name: 'Select NDI Source',
				options: [
					{
						type: 'dropdown',
						label: 'Source',
						id: 'url',
						default: self.CHOICES_SOURCES[0].id,
						choices: self.CHOICES_SOURCES,
					},
				],
				callback: function (action) {
					let options = action.options
					let [name, ip, port] = Buffer.from(options.url, 'base64').toString().split(/:/)
					self.DEVICE.decoderCurrentSetUrl(name, ip + ':' + port)
				},
			}

			actions.refreshSources = {
				name: 'Refresh NDI Sources',
				callback: function (action) {
					self.checkSources()
				},
			}

			actions.setOutputResolution = {
				name: 'Set Output Resolution',
				options: [
					{
						type: 'dropdown',
						label: 'Resolution',
						id: 'resolution',
						default: 'auto',
						choices: [
							{ id: 'auto', label: 'Auto' },
							{ id: 'deint', label: 'Deinterlaced (Progressive)' },
						],
					},
				],
				callback: function (action) {
					let options = action.options
					self.DEVICE.decoderSetOutputResolution(options.resolution)
				},
			}

			actions.setOutputFrameRate = {
				name: 'Set Output Frame Rate',
				options: [
					{
						type: 'dropdown',
						label: 'Frame Rate',
						id: 'frameate',
						default: 0,
						choices: [
							{ id: 0, label: 'Use NDI Source Frame Rate' },
							{ id: 23.98, label: '23.98' },
							{ id: 24, label: '24' },
							{ id: 25, label: '25' },
							{ id: 29.97, label: '29.97' },
							{ id: 30, label: '30' },
							{ id: 50, label: '50' },
							{ id: 59.94, label: '59.94' },
							{ id: 60, label: '60' },
						],
					},
				],
				callback: function (action) {
					let options = action.options
					self.DEVICE.decoderSetOutputFrameRate(options.frame_rate)
				},
			}

			actions.setOutputAudioSampleRate = {
				name: 'Set Output Audio Sample Rate',
				options: [
					{
						type: 'dropdown',
						label: 'Sample Rate',
						id: 'sample_rate',
						default: 0,
						choices: [
							{ id: 0, label: 'Use NDI Source Sample Rate' },
							{ id: 44100, label: '44.1 kHz' },
							{ id: 48000, label: '48 kHz' },
						],
					},
				],
				callback: function (action) {
					let options = action.options
					self.DEVICE.decoderSetOutputAudioSampleRate(options.sample_rate)
				},
			}
		}

		if (self.config.picManage == true) {
			actions.picManageAdd = {
				name: 'Picture Management: Change Image',
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
					{
						type: 'textinput',
						label: 'Image Path',
						id: 'path',
						default: '',
						useVariables: true,
					},
				],
				callback: async function (action) {
					let name = action.options.name
					let path = await self.parseVariablesInString(action.options.path)
					self.DEVICE.picManageAdd(name, path)
				},
			}

			actions.picManageReset = {
				name: 'Picture Management: Reset Image',
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
				callback: function (action) {
					let name = action.options.name
					self.DEVICE.picManageReset(name)
				},
			}
		}

		self.setActionDefinitions(actions)
	},
}
