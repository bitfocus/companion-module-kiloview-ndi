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

	INTERVAL: null, //used for polling device for feedbacks
	INTERVAL_SOURCES: null, //used for polling for new NDI sources
	RECONNECT_INTERVAL: null, //used for reconnecting to device
}
