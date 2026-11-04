// Keep Sharp and its native libvips dependencies alongside the bundle.
module.exports = {
	externals: { sharp: 'commonjs sharp' },
}
