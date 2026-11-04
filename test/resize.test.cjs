const assert = require('node:assert/strict')
const test = require('node:test')
const sharp = require('sharp')
const { resize } = require('../src/api')

test('resize uses native Sharp and preserves aspect ratio and PNG output', async () => {
	const input = await sharp({ create: { width: 144, height: 72, channels: 4, background: '#ff0000' } })
		.png()
		.toBuffer()
	const output = Buffer.from(await resize(input.toString('base64')), 'base64')
	const metadata = await sharp(output).metadata()
	assert.equal(metadata.format, 'png')
	assert.equal(metadata.width, 72)
	assert.equal(metadata.height, 36)
	const { data } = await sharp(output).raw().toBuffer({ resolveWithObject: true })
	assert.deepEqual([...data.subarray(0, 4)], [255, 0, 0, 255])
})

test('resize rejects invalid image data', async () => {
	await assert.rejects(resize(Buffer.from('invalid image').toString('base64')))
})
