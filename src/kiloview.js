/*
	Code originally obtained from kiloview-ndi npm package
	Author: Håkon Nessjøen <haakon@bitfocus.io>
	Copyright Bitfocus AS, 2020

	Modified by: Joseph Adams <josephdadams@gmail.com>
	Purpose: Switch to fetch library and support more functions
*/

class kiloviewNDI {
	connection_info = {
		ip: '',
		username: '',
		password: '',
	}

	session = {
		token: '',
		session: '',
	}

	apiVersion = 'v1'

	constructor(ip, username, password, timeout = 2000) {
		this.connection_info = {
			ip,
			username,
			password,
		}

		this.baseURL = `http://${ip}/api/${this.apiVersion}`

		this.authorized = false
	}

	setAuthorized(auth) {
		this.authorized = auth
	}

	async authorize() {
		try {
			const { username, password } = this.connection_info

			const params = new URLSearchParams()
			params.append('username', username)
			params.append('password', password)

			const request = await fetch(`${this.baseURL}/user/authorize`, {
				method: 'POST',
				body: params,
			})

			let result = await request.json()

			if (result && result.result === 'error') {
				let error = new Error(result.msg)
				error.name = 'KiloviewNDIError'
				throw error
			}

			this.session = {
				token: result.data.token,
				session: result.data.session,
			}

			this.alias = result.data.alias

			//create headers object for future requests
			this.headers = {
				'API-Session': this.session.session,
				'API-Token': this.session.token,
				'Content-Type': 'application/json',
			}

			this.authorized = true

			return true
		} catch (error) {
			throw error
			return false
		}
	}

	async authPost(url, args) {
		if (!this.authorized) {
			await this.authorize()
		}

		let options = {
			method: 'POST',
			headers: this.headers,
		}

		if (args) {
			options.body = JSON.stringify(args)
		}

		const request = await fetch(`${this.baseURL}${url}`, options)

		let result = await request.json()
		if (result && result.result === 'auth-failed') {
			// Try to reauthorize, will fail out if not ok
			await this.authorize()
			//recurse
			return this.authPost(url, args)
		} else {
			if (result && result.result === 'error') {
				console.log(result)
				let error = new Error(result.msg)
				error.name = 'KiloviewNDIError'
				throw error
			}

			return result
		}
	}

	async modeGet() {
		return await this.authPost('/mode/get')
	}

	async modeSwitch(mode) {
		return await this.authPost('/mode/switch', { mode })
	}

	modeStatus() {
		return this.authPost('/mode/status')
	}

	decoderDiscoveryGet() {
		return this.authPost('/decoder/discovery/get')
	}

	decoderCurrentStatus() {
		return this.authPost('/decoder/current/status')
	}

	decoderCurrentSetPreset(id) {
		return this.authPost('/decoder/current/set', { id })
	}

	decoderCurrentSetUrl(name, url) {
		return this.authPost('/decoder/current/set', { name, url })
	}

	decoderPresets() {
		return this.authPost('/decoder/preset/status')
	}

	decoderPresetAdd(id, name, url, group) {
		return this.authPost('/decoder/preset/add', { id, name, url, group })
	}

	decoderPresetRemove(id) {
		return this.authPost('/decoder/preset/remove', { id })
	}

	// color: #aabbcc with #
	decoderPresetSetBlank(color) {
		return this.authPost('/decoder/preset/set_blank', { color })
	}

	decoderSetOutputResolution(resolution) {
		return this.authPost('/decoder/output/set', { resolution })
	}

	decoderSetOutputFrameRate(frame_rate) {
		return this.authPost('/decoder/output/set', { frame_rate })
	}

	decoderSetOutputAudioSampleRate(sample_rate) {
		return this.authPost('/decoder/output/set', { sample_rate })
	}

	encoderNdiStatus() {
		return this.authPost('/encoder/ndi/status')
	}

	encoderNdiGetConfig() {
		return this.authPost('/encoder/ndi/get_config')
	}

	encoderNdiSetAudioSignalType(type) {
		return this.authPost('/encoder/ndi/set_audio', { type })
	}

	encoderNdiSetAudioVolume(volume) {
		return this.authPost('/encoder/ndi/set_audio', { volume })
	}

	tallyGet() {
		return this.authPost('/tally/get')
	}

	tallySet(pgm, pvw) {
		return this.authPost('/tally/set', { pgm, pvw })
	}

	encoderNdiSetConfig(config) {
		return this.authPost('/encoder/ndi/set_config', config)
	}

	sysServerInfo() {
		//returns server info
		return this.authPost('/sys/server_info')
	}

	sysReconnect() {
		//reset all NDI connections
		return this.authPost('/sys/reconnect')
	}

	sysReboot() {
		//reboot device
		return this.authPost('/sys/reboot')
	}

	sysRestore() {
		//restore to factory settings
		return this.authPost('/sys/restore')
	}

	picManageAdd(name, filepath) {
		const { exec } = require('child_process')

		const curlCommand = `curl -X POST http://${this.connection_info.ip}/api/pic/add.json \
		-H "API-Token: ${this.session.token}" \
		-F "upload=@${filepath}" \
		-F "name=${name}" \
		-F "size_w=1920" \
		-F "size_h=1080"`

		exec(curlCommand, (error, stdout, stderr) => {})
	}

	picManageReset(name) {
		let headers = {
			'API-Session': this.session.session,
			'API-Token': this.session.token,
			'Content-Type': 'application/json',
		}

		// Send the POST request using fetch
		fetch(`http://${this.connection_info.ip}/api/pic/resetPic.json`, {
			method: 'POST',
			body: JSON.stringify({ name: name }),
			headers: headers,
		})
			.then((response) => response.json()) // Assuming the response is JSON
			.then((data) => {
				console.log('Response:', data)
			})
			.catch((error) => {
				console.error('Error:', error)
			})
	}
}

module.exports = kiloviewNDI
