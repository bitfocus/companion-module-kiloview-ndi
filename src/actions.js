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
				self.runDeviceAction(self.DEVICE.modeSwitch(options.mode), 'Set Mode')
			},
		}

		actions.toggleMode = {
			name: 'Toggle Mode',
			callback: function (action) {
				let target = self.STATE.mode && self.STATE.mode === 'encoder' ? 'decoder' : 'encoder'
				self.runDeviceAction(self.DEVICE.modeSwitch(target), 'Toggle Mode')
			},
		}

		actions.reboot = {
			name: 'Reboot Device',
			callback: function (action) {
				self.runDeviceAction(self.DEVICE.sysReboot(), 'Reboot Device')
			},
		}

		actions.reconnect = {
			name: 'Reset all NDI Connections',
			callback: function (action) {
				self.runDeviceAction(self.DEVICE.sysReconnect(), 'Reset all NDI Connections')
			},
		}

		actions.restore = {
			name: 'Restore to Factory Settings',
			callback: function (action) {
				self.runDeviceAction(self.DEVICE.sysRestore(), 'Restore to Factory Settings')
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
					self.runDeviceAction(self.DEVICE.encoderSetType(options.type), 'Set NDI Type')
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
					self.runDeviceAction(
						self.DEVICE.encoderNdiSetAudioSignalType(options.type),
						'Set Audio Signal Type',
					)
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
					self.runDeviceAction(self.DEVICE.encoderNdiSetAudioVolume(options.volume), 'Set Audio Volume')
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

					// decoder/current/set's "id" (preset) form is unreliable on this firmware
					// (returns error 0301003) - route through name/url/group instead, which works.
					let preset = self.STATE?.presets?.data?.find((p) => p.id.toString() === options.preset.toString())

					if (preset && preset.enable && preset.url) {
						self.runDeviceAction(
							self.DEVICE.decoderCurrentSetUrl(preset.name, preset.url, preset.group),
							'Set Preset',
						)
					} else {
						self.log('warn', `Preset ${options.preset} is not defined`)
					}
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

					if (!options.url || options.url === 'null') {
						self.log('warn', 'Select NDI Source: no source selected')
						return
					}

					// decoder/current/set requires a "group" field on this firmware even though it
					// isn't documented - look up the source's group from the last discovery poll.
					let source = self.findSourceById(options.url)
					if (source) {
						self.runDeviceAction(
							self.DEVICE.decoderCurrentSetUrl(source.name, source.url, source.group ?? ''),
							'Select NDI Source',
						)
						return
					}

					// Not in the last discovery poll: the id is base64 "name:ip:port", and the name may itself contain ':'
					let parts = Buffer.from(options.url, 'base64').toString().split(':')
					if (parts.length < 3) {
						self.log('warn', `Select NDI Source: unrecognised source ${options.url}`)
						return
					}
					let port = parts.pop()
					let ip = parts.pop()
					let name = parts.join(':')

					self.runDeviceAction(
						self.DEVICE.decoderCurrentSetUrl(name, `${ip}:${port}`, ''),
						'Select NDI Source',
					)
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
					self.runDeviceAction(
						self.DEVICE.decoderSetOutputResolution(options.resolution),
						'Set Output Resolution',
					)
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
					self.runDeviceAction(
						self.DEVICE.decoderSetOutputFrameRate(options.frameate),
						'Set Output Frame Rate',
					)
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
					self.runDeviceAction(
						self.DEVICE.decoderSetOutputAudioSampleRate(options.sample_rate),
						'Set Output Audio Sample Rate',
					)
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
				callback: function (action) {
					let options = action.options
					self.runDeviceAction(
						self.DEVICE.picManageAdd(options.name, options.path),
						'Picture Management: Change Image',
					)
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
					self.runDeviceAction(self.DEVICE.picManageReset(name), 'Picture Management: Reset Image')
				},
			}
		}

		self.setActionDefinitions(actions)
	},
}
