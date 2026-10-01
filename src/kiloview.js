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
	}

	apiVersion = 'v3'

	constructor(ip, username, password, timeout = 2000) {
		this.connection_info = {
			ip,
			username,
			password,
		}

		this.baseURL = `http://${ip}/api`

		this.authorized = false
		this._ndiTypesCache = null
	}

	setAuthorized(auth) {
		this.authorized = auth
	}

	async authorize() {
		try {
			const { username, password } = this.connection_info

			const params = new URLSearchParams()
			params.append('user', username)
			params.append('password', password)

			const request = await fetch(`${this.baseURL}/user/authorize.json`, {
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
			}

			this.alias = result.data.alias

			//v3 API auth is passed via a "token" Cookie, not headers
			this.headers = {
				Cookie: `token=${this.session.token}`,
				'Content-Type': 'application/json',
			}

			this.authorized = true
			this._ndiTypesCache = null

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

		const request = await fetch(`${this.baseURL}${url}.json`, options)

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

	// This firmware requires a "group" field on this endpoint even though it isn't
	// documented - omitting it entirely makes the device reject the request (error 0301002).
	decoderCurrentSetUrl(name, url, group = '') {
		return this.authPost('/decoder/current/set', { name, url, group })
	}

	decoderPresets() {
		return this.authPost('/decoder/preset/status')
	}

	decoderPresetAdd(id, name, url, group) {
		return this.authPost('/decoder/preset/add', { position: id, name, url, group })
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

	// The v3 API requires a "types" field ("ndihx" or "ndifull") on the encoder/ndi endpoints.
	// Detect which one is active via get_NDI_enable (Full NDI on/off) and cache the result.
	async resolveNdiTypes() {
		if (this._ndiTypesCache) {
			return this._ndiTypesCache
		}

		try {
			const result = await this.authPost('/encoder/ndi/get_NDI_enable')
			this._ndiTypesCache = result?.data?.enable ? 'ndifull' : 'ndihx'
		} catch (error) {
			this._ndiTypesCache = 'ndifull'
		}

		return this._ndiTypesCache
	}

	async encoderNdiStatus() {
		const types = await this.resolveNdiTypes()
		return this.authPost('/encoder/ndi/status', { types })
	}

	async encoderNdiGetConfig() {
		const types = await this.resolveNdiTypes()
		return this.authPost('/encoder/ndi/get_config', { types })
	}

	encoderNdiSetAudioSignalType(type) {
		return this.authPost('/audio/set_audio', { signal: type })
	}

	encoderNdiSetAudioVolume(volume) {
		return this.authPost('/audio/set_audio', { volume })
	}

	encoderSetType(ndi_connection) {
		return this.encoderNdiSetConfig({ ndi_connection })
	}

	tallyGet() {
		return this.authPost('/tally/status')
	}

	tallySet(pgm, pvw) {
		return this.authPost('/tally/set', { pgm, pvw })
	}

	async encoderNdiSetConfig(config) {
		const types = await this.resolveNdiTypes()
		return this.authPost('/encoder/ndi/set_config', { types, ...config })
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
