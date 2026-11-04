const assert = require('node:assert/strict')
const http = require('node:http')
const Client = require('../src/kiloview')
const requests = []
let auths = 0
let tallyRequests = 0
const server = http.createServer(async (req, res) => {
	let body = ''
	for await (const chunk of req) body += chunk
	requests.push({ url: req.url, method: req.method, headers: req.headers, body })
	res.setHeader('Content-Type', 'application/json')
	if (req.url.endsWith('/user/authorize')) {
		auths++
		assert.equal(new URLSearchParams(body).get('username'), 'operator')
		res.end(JSON.stringify({ data: { token: `token${auths}`, session: 'session', alias: 'operator' } }))
	} else if (req.url.endsWith('/tally/set') && ++tallyRequests === 1) {
		res.end(JSON.stringify({ result: 'auth-failed' }))
	} else if (req.url.endsWith('/sys/reboot')) {
		res.end(JSON.stringify({ result: 'error', msg: 'denied' }))
	} else {
		res.end(JSON.stringify({ result: 'ok', data: { mode: 'decoder' } }))
	}
})
;(async () => {
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
	try {
		const client = new Client(`127.0.0.1:${server.address().port}`, 'operator', 'secret')
		assert.equal((await client.modeGet()).data.mode, 'decoder')
		await client.decoderCurrentSetUrl('Camera A', 'ndi://camera-a')
		assert.deepEqual(JSON.parse(requests.at(-1).body), { name: 'Camera A', url: 'ndi://camera-a' })
		await client.tallySet(true, false)
		assert.equal(auths, 2)
		assert.equal(requests.at(-1).headers['api-token'], 'token2')
		assert.deepEqual(JSON.parse(requests.at(-1).body), { pgm: true, pvw: false })
		assert.ok(requests.every((r) => r.method === 'POST'))
		await assert.rejects(client.sysReboot(), { name: 'KiloviewNDIError', message: 'denied' })
		console.log(
			'PASS actual source: HTTP authentication, mode query, decoder URL payload, tally reauthorization and API error propagation',
		)
	} finally {
		server.closeAllConnections()
		await new Promise((resolve) => server.close(resolve))
	}
})().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
