module.exports = {
	initVariables() {
		let self = this
		let variables = []

		variables.push({ variableId: 'mode', name: 'Current Converter Mode' })
		variables.push({ variableId: 'alias', name: 'Authorized User' })

		variables.push({ variableId: 'resolution', name: 'Resolution' })
		variables.push({ variableId: 'audio_format', name: 'Audio Format' })

		if (self.config.mode == 'encoder') {
			//variables.push({ variableId: 'device_name', name: 'Device Name' })
			variables.push({ variableId: 'video_signal', name: 'Video Signal Present' })
			variables.push({ variableId: 'bitrate', name: 'NDI Bitrate' })
		} else {
			variables.push({ variableId: 'codec', name: 'NDI Codec' })
			variables.push({ variableId: 'streamname', name: 'NDI Stream Name' })
			variables.push({ variableId: 'online_state', name: 'NDI Source Online' })
		}

		variables.push({ variableId: 'cpu_cores', name: 'CPU Cores' })
		variables.push({ variableId: 'cpu_payload', name: 'CPU Payload' })
		variables.push({ variableId: 'mem_used', name: 'Memory Used' })
		variables.push({ variableId: 'mem_total', name: 'Memory Total' })
		variables.push({ variableId: 'start_time', name: 'Device Start Time' })
		variables.push({ variableId: 'persis', name: 'Device Uptime' })

		self.setVariableDefinitions(variables)
	},

	checkVariables() {
		let self = this

		try {
			let variableObj = {}

			variableObj.mode = self.STATE.mode === 'encoder' ? 'Encoder' : 'Decoder'
			variableObj.alias = self.alias || ''

			variableObj.resolution = self.STATE.info.data.resolution || ''
			variableObj.audio_format = self.STATE.info.data.audio_format || ''

			if (self.STATE.info) {
				if (self.config.mode === 'encoder') {
					variableObj.device_name = self.STATE.info.data.device_name
					variableObj.video_signal = self.STATE.info.data.video_signal ? 'True' : 'False'
					variableObj.bitrate = self.STATE.info.data.bitrate
				} else {
					variableObj.codec = self.STATE.info.data.codec
					variableObj.streamname = self.STATE.info.data.name || ''
					variableObj.online_state = self.STATE.info.data.online ? 'True' : 'False'
				}
			}

			if (self.STATE.server_info) {
				variableObj.cpu_cores = self.STATE.server_info.data.cpu_cores
				variableObj.cpu_payload = self.STATE.server_info.data.cpu_payload
				variableObj.mem_used = self.STATE.server_info.data.mem_used
				variableObj.mem_total = self.STATE.server_info.data.mem_total
				variableObj.start_time = self.STATE.server_info.data.start_time
				variableObj.persis = self.STATE.server_info.data.persis
			}

			self.setVariableValues(variableObj)
		} catch (error) {
			self.log('error', 'Error setting Variables: ' + String(error))
		}
	},
}
