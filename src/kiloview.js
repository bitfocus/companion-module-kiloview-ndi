/*
	Code originally obtained from kiloview-ndi npm package
	Author: Håkon Nessjøen <haakon@bitfocus.io>
	Copyright Bitfocus AS, 2020

	Modified by: Joseph Adams <josephdadams@gmail.com>
	Purpose: Switch to fetch library and support more functions
*/

const fs = require('fs/promises')
const path = require('path')

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

	constructor(ip, username, password, useAuth) {
		this.connection_info = {
			ip,
			username,
			password,
		}

		this.baseURL = `http://${ip}/api`

		this.useAuth = useAuth
		this.authorized = false
		this._ndiTypesCache = null
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

			this.authorized = true
			this._ndiTypesCache = null

			return true
		} catch (error) {
			throw error
		}
	}

	authPost(url, args) {
		return this.authRequest(url, args ? JSON.stringify(args) : undefined, 'application/json', false)
	}

	// contentType is null for multipart bodies, so fetch can set the boundary itself
	async authRequest(url, body, contentType, isRetry) {
		if (this.useAuth && !this.authorized) {
			await this.authorize()
		}

		let headers = {}
		if (contentType) {
			headers['Content-Type'] = contentType
		}
		if (this.useAuth) {
			//v3 API auth is passed via a "token" Cookie, not headers
			headers.Cookie = `token=${this.session.token}`
		}

		let options = {
			method: 'POST',
			headers,
		}

		if (body !== undefined) {
			options.body = body
		}

		const request = await fetch(`${this.baseURL}${url}.json`, options)

		let result = await request.json()
		if (result && result.result === 'auth-failed') {
			// A fresh token that is still rejected (eg. the user lacks HTTP API access) would otherwise loop forever
			if (!this.useAuth || isRetry) {
				let error = new Error(
					this.useAuth
						? 'Device rejected the request after re-authorizing. Check the user has HTTP API access.'
						: 'Device requires authentication. Enable "Use Authentication" in the module config.',
				)
				error.name = 'KiloviewNDIError'
				throw error
			}

			this.authorized = false
			return this.authRequest(url, body, contentType, true)
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

	async picManageAdd(name, filepath) {
		const data = await fs.readFile(filepath)

		const form = new FormData()
		form.append('upload', new Blob([data]), path.basename(filepath))
		form.append('name', name)
		form.append('size_w', '1920')
		form.append('size_h', '1080')

		return this.authRequest('/pic/add', form, null, false)
	}

	picManageReset(name) {
		return this.authPost('/pic/resetPic', { name })
	}
}

module.exports = kiloviewNDI
