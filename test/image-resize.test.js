const assert = require('node:assert/strict')
const test = require('node:test')

const { ImageTransformer } = require('@julusian/image-rs')
const api = require('../src/api')

async function createTestPng(width, height) {
	const pixels = Buffer.alloc(width * height * 4, 255)
	const image = await ImageTransformer.fromBuffer(pixels, width, height, 'rgba').toEncodedImage('png')
	return image.buffer.toString('base64')
}

test('resizes an encoded device image to fit the Companion preview size', async () => {
	const result = await api.resize(await createTestPng(160, 90))
	const decoded = ImageTransformer.fromEncodedImage(Buffer.from(result, 'base64'))

	assert.deepEqual(decoded.getCurrentDimensions(), { width: 72, height: 41 })
	assert.deepEqual(Buffer.from(result, 'base64').subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'))
})

test('preserves a square image at 72 by 72 pixels', async () => {
	const result = await api.resize(await createTestPng(20, 20))
	const decoded = ImageTransformer.fromEncodedImage(Buffer.from(result, 'base64'))

	assert.deepEqual(decoded.getCurrentDimensions(), { width: 72, height: 72 })
})
