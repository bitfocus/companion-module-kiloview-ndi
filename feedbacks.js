exports.initFeedbacks = function () {
	const feedbacks = {}

	feedbacks['mode'] = {
		label: 'Converter mode',
		description: 'Based on converter mode, change colors of the bank',
		options: [
			{
				type: 'dropdown',
				label: 'Converter mode',
				id: 'mode',
				default: 'decoder',
				choices: this.converterModes,
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: this.rgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: this.rgb(0, 0, 0),
			},
		],
		callback: ({ options }, bank) => {
			if (options.mode === this.state.mode) {
				return { color: options.fg, bgcolor: options.bg }
			}
		},
	}

	feedbacks['online'] = {
		label: 'NDI source is online/offline',
		description: 'If source is online or offline, change colors of the bank',
		options: [
			{
				type: 'dropdown',
				label: 'Change color if source is',
				id: 'compare',
				default: 'online',
				choices: [
					{ id: 'online', label: 'Online' },
					{ id: 'offline', label: 'Offline' },
				],
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: this.rgb(0, 0, 0),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: this.rgb(0, 255, 0),
			},
		],
		callback: ({ options }, bank) => {
			if (options.compare === 'online' && this.state.online === true) {
				return { color: options.fg, bgcolor: options.bg }
			}
			if (options.compare === 'offline' && this.state.online === false) {
				return { color: options.fg, bgcolor: options.bg }
			}
		},
	}

	feedbacks['video_signal'] = {
		label: 'Encider input source is online/offline',
		description: 'If source is online or offline, change colors of the bank',
		options: [
			{
				type: 'dropdown',
				label: 'Change color if source is',
				id: 'compare',
				default: 'online',
				choices: [
					{ id: 'online', label: 'Online' },
					{ id: 'offline', label: 'Offline' },
				],
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: this.rgb(0, 0, 0),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: this.rgb(0, 255, 0),
			},
		],
		callback: ({ options }, bank) => {
			if (options.compare === 'online' && this.state.video_signal === true) {
				return { color: options.fg, bgcolor: options.bg }
			}
			if (options.compare === 'offline' && this.state.video_signal === false) {
				return { color: options.fg, bgcolor: options.bg }
			}
		},
	}

	return feedbacks
}
