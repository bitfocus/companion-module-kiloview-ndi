module.exports = {
	POLLINGRATE: 1000,
	POLLINGRATE_SOURCES: 10000,
	RECONNECT_TIME: 30000,
	DEVICE: undefined,

	CHOICES_SOURCES: [{ id: 'null', url: '', label: '- No sources available -' }],

	STATE: {
		mode: 'N/A',
	},

	CHOICES_CONVERTER_MODES: [
		{
			id: 'encoder',
			label: 'Encoder',
		},
		{
			id: 'decoder',
			label: 'Decoder',
		},
	],

	CHOICES_PRESETS: [
		{ id: '1', label: 'Preset 1' },
		{ id: '2', label: 'Preset 2' },
		{ id: '3', label: 'Preset 3' },
		{ id: '4', label: 'Preset 4' },
		{ id: '5', label: 'Preset 5' },
		{ id: '6', label: 'Preset 6' },
		{ id: '7', label: 'Preset 7' },
		{ id: '8', label: 'Preset 8' },
		{ id: '9', label: 'Preset 9' },
	],

	INTERVAL: null, //used for polling device for feedbacks
	INTERVAL_SOURCES: null, //used for polling for new NDI sources
	RECONNECT_INTERVAL: null, //used for reconnecting to device
}
