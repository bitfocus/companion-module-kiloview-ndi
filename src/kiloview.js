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

	constructor(ip, username, password, timeout = 2000) {
		this.connection_info = {
			ip,
			username,
			password,
		}

		this.protocols = {
			legacy: {
				baseURL: `http://${ip}/api/v1`,
				authorizePath: '/user/authorize',
				usernameField: 'username',
				endpoint: (path) => path,
				headers: (data) => ({
					'API-Session': data.session,
					'API-Token': data.token,
					'Content-Type': 'application/json',
				}),
			},
			current: {
				baseURL: `http://${ip}/api`,
				authorizePath: '/user/authorize.json',
				usernameField: 'user',
				endpoint: (path) => `${path === '/tally/get' ? '/tally/status' : path}.json`,
				headers: (data) => ({
					Cookie: `token=${data.token}`,
					'Content-Type': 'application/json',
				}),
			},
		}
		this.setProtocol('legacy')

		this.authorized = false
	}

	setAuthorized(auth) {
		this.authorized = auth
	}

	setProtocol(protocolName) {
		this.protocolName = protocolName
		this.protocol = this.protocols[protocolName]
		this.baseURL = this.protocol.baseURL
	}

	async requestJson(url, options) {
		const request = await fetch(url, options)
		const responseText = await request.text()

		try {
			return JSON.parse(responseText)
		} catch (error) {
			const result = new Error(
				`Kiloview API returned an empty or non-JSON response for ${new URL(url).pathname} (HTTP ${request.status})`,
			)
			result.name = 'KiloviewNDIResponseError'
			result.protocolError = true
			throw result
		}
	}

	async authorize() {
		const { username, password } = this.connection_info
		let lastError

		for (const protocolName of Object.keys(this.protocols)) {
			const protocol = this.protocols[protocolName]
			const params = new URLSearchParams()
			params.append(protocol.usernameField, username)
			params.append('password', password)

			try {
				const result = await this.requestJson(`${protocol.baseURL}${protocol.authorizePath}`, {
					method: 'POST',
					body: params,
				})

				if (result?.result === 'error') {
					const error = new Error(result.msg)
					error.name = 'KiloviewNDIError'
					throw error
				}
				if (!result?.data?.token) {
					throw new Error('Kiloview API authorization response did not contain a token')
				}

				this.setProtocol(protocolName)
				this.session = {
					token: result.data.token,
					session: result.data.session,
				}
				this.alias = result.data.alias
				this.headers = protocol.headers(result.data)
				this.authorized = true
				return true
			} catch (error) {
				if (error.name === 'KiloviewNDIError') throw error
				lastError = error
			}
		}

		throw lastError
	}

	async authPost(url, args, allowProtocolFallback = true) {
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

		let result
		try {
			result = await this.requestJson(`${this.baseURL}${this.protocol.endpoint(url)}`, options)
		} catch (error) {
			if (allowProtocolFallback && error.protocolError) {
				this.setProtocol(this.protocolName === 'legacy' ? 'current' : 'legacy')
				return this.authPost(url, args, false)
			}
			throw error
		}
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
