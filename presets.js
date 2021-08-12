module.exports.initPresets = function (instance) {
	let presets = [
		{
			category: 'General',
			label: 'Set encoder mode',
			bank: {
				style: 'text',
				text: 'Encoder',
				size: '18',
				color: '16777215',
				bgcolor: this.rgb(0, 0, 0),
			},
			actions: [
				{
					action: 'modeSwitch',
					options: {
						mode: 'encoder',
					},
				},
			],
			feedbacks: [
				{
					type: 'mode',
					options: {
						mode: 'encoder',
						bg: this.rgb(255, 255, 0),
						fg: this.rgb(0, 0, 0),
					},
				},
			],
		},
		{
			category: 'General',
			label: 'Set decoder mode',
			bank: {
				style: 'text',
				text: 'Decoder',
				size: '18',
				color: '16777215',
				bgcolor: this.rgb(0, 0, 0),
			},
			actions: [
				{
					action: 'modeSwitch',
					options: {
						mode: 'decoder',
					},
				},
			],
			feedbacks: [
				{
					type: 'mode',
					options: {
						mode: 'decoder',
						bg: this.rgb(255, 255, 0),
						fg: this.rgb(0, 0, 0),
					},
				},
			],
		},
		{
			category: 'General',
			label: 'Display current mode',
			bank: {
				style: 'text',
				text: 'Mode:\\n$(kiloview:mode)',
				size: 'auto',
				color: '16777215',
				bgcolor: this.rgb(0, 0, 0),
			},
			actions: [],
			feedbacks: [],
		},
	]

	for (let i = 1; i <= 10; ++i) {
		presets.push({
			category: 'Decoder',
			label: 'Go to preset ' + i,
			bank: {
				style: 'text',
				text: String(i),
				size: 'auto',
				color: '16777215',
				bgcolor: this.rgb(0, 0, 0),
			},
			actions: [
				{
					action: 'setPreset',
					options: {
						id: String(i),
					},
				},
			],
		})
	}

	presets.push({
		category: 'Decoder',
		label: 'Decoder status',
		bank: {
			style: 'text',
			text: 'Online\\n$(kiloview:online)',
			size: 'auto',
			color: '16777215',
			bgcolor: this.rgb(0, 0, 0),
		},
		actions: [],
		feedbacks: [
			{
				type: 'online',
				options: {
					compare: 'online',
					bg: this.rgb(0, 255, 0),
					fg: this.rgb(0, 0, 0),
				},
			},
			{
				type: 'online',
				options: {
					compare: 'offline',
					bg: this.rgb(255, 0, 0),
					fg: this.rgb(255, 255, 255),
				},
			},
		],
	})

	presets.push({
		category: 'Encoder',
		label: 'Encoder status',
		bank: {
			style: 'text',
			text: 'Online\\n$(kiloview:video_signal)',
			size: 'auto',
			color: '16777215',
			bgcolor: this.rgb(0, 0, 0),
		},
		actions: [],
		feedbacks: [
			{
				type: 'video_signal',
				options: {
					compare: 'online',
					bg: this.rgb(0, 255, 0),
					fg: this.rgb(0, 0, 0),
				},
			},
			{
				type: 'video_signal',
				options: {
					compare: 'offline',
					bg: this.rgb(255, 0, 0),
					fg: this.rgb(255, 255, 255),
				},
			},
		],
	})

	presets.push({
		category: 'General',
		label: 'Encoder/Decoder resolution',
		bank: {
			style: 'text',
			text: '$(kiloview:resolution)',
			size: 'auto',
			color: '16777215',
			bgcolor: this.rgb(0, 0, 0),
		},
		actions: [],
		feedbacks: [],
	})

	presets.push({
		category: 'General',
		label: 'Encoder/Decoder bitrate',
		bank: {
			style: 'text',
			text: '$(kiloview:bitrate)',
			size: 'auto',
			color: '16777215',
			bgcolor: this.rgb(0, 0, 0),
		},
		actions: [],
		feedbacks: [],
	})

	return presets
}
