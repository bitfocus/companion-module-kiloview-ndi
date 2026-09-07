const assert = require('node:assert/strict')
const test = require('node:test')

const KiloviewNDI = require('../src/kiloview')

function response(body, status = 200) {
	return {
		status,
		text: async () => body,
	}
}

test('falls back to the documented current API when the legacy mode endpoint is empty', async () => {
	const requests = []
	const previousFetch = global.fetch
	global.fetch = async (url) => {
		requests.push(url)
		return requests.length === 1
			? response('')
			: response(JSON.stringify({ result: 'ok', data: { mode: 'decoder' } }))
	}

	try {
		const device = new KiloviewNDI('192.0.2.10')
		device.setAuthorized(true)
		assert.deepEqual(await device.modeGet(), { result: 'ok', data: { mode: 'decoder' } })
		assert.deepEqual(requests, ['http://192.0.2.10/api/v1/mode/get', 'http://192.0.2.10/api/mode/get.json'])
	} finally {
		global.fetch = previousFetch
	}
})

test('uses the documented token cookie when authorizing against the current API', async () => {
	const requests = []
	const previousFetch = global.fetch
	global.fetch = async (url, options) => {
		requests.push({ url, options })
		if (url.includes('/api/v1/')) return response('', 404)
		return response(JSON.stringify({ result: 'ok', data: { token: 'test-token', alias: 'Operator' } }))
	}

	try {
		const device = new KiloviewNDI('192.0.2.10', 'operator', 'secret')
		await device.authorize()
		assert.equal(device.protocolName, 'current')
		assert.equal(device.headers.Cookie, 'token=test-token')
		assert.match(requests[1].url, /\/api\/user\/authorize\.json$/)
		assert.match(requests[1].options.body.toString(), /user=operator/)
	} finally {
		global.fetch = previousFetch
	}
})
