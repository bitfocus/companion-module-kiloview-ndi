const { combineRgb } = require('@companion-module/base')

module.exports = {
	initPresets: function () {
		let self = this
		let presets = []

		const colorWhite = combineRgb(255, 255, 255) // White
		const colorBlack = combineRgb(0, 0, 0) // Black
		const colorRed = combineRgb(255, 0, 0) // Red
		const colorGreen = combineRgb(0, 255, 0) // Green

		presets = [
			{
				category: 'General',
				type: 'button',
				name: 'Set Converter Mode to Encoder',
				style: {
					text: 'Encoder',
					size: '18',
					color: colorWhite,
					bgcolor: colorBlack,
				},
				steps: [
					{
						down: [
							{
								actionId: 'modeSwitch',
								options: {
									mode: 'encoder',
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: 'mode',
						options: {
							mode: 'encoder',
						},
						style: {
							color: colorWhite,
							bgcolor: colorRed,
						},
					},
				],
			},
			{
				category: 'General',
				type: 'button',
				name: 'Set Converter Mode to Decoder',
				style: {
					text: 'Decoder',
					size: '18',
					color: colorWhite,
					bgcolor: colorBlack,
				},
				steps: [
					{
						down: [
							{
								actionId: 'modeSwitch',
								options: {
									mode: 'decoder',
								},
							},
						],
						up: [],
					},
				],
				feedbacks: [
					{
						feedbackId: 'mode',
						options: {
							mode: 'decoder',
						},
						style: {
							color: colorWhite,
							bgcolor: colorRed,
						},
					},
				],
			},
			{
				category: 'General',
				type: 'button',
				name: 'Toggle Converter Mode',
				style: {
					text: 'Toggle Mode',
					size: '18',
					color: colorWhite,
					bgcolor: colorBlack,
				},
				steps: [
					{
						down: [
							{
								actionId: 'toggleMode',
							},
						],
						up: [],
					},
				],
			},
			{
				category: 'General',
				type: 'button',
				name: 'Display Current Mode',
				style: {
					text: 'Mode:\\n$(kiloview:mode)',
					size: 'auto',
					color: colorWhite,
					bgcolor: colorBlack,
				},
				steps: [],
				feedbacks: [],
			},
		]

		if (self.STATE.mode == 'encoder') {
			presets.push({
				category: 'Encoder',
				type: 'button',
				name: 'Encoder status',
				style: {
					text: 'Online\\n$(kiloview:video_signal)',
					size: 'auto',
					color: colorWhite,
					bgcolor: colorBlack,
				},
				steps: [],
				feedbacks: [
					{
						feedbackId: 'video_signal',
						options: {
							compare: 'online',
						},
						style: {
							color: colorWhite,
							bgcolor: colorGreen,
						},
					},
					{
						feedbackId: 'video_signal',
						options: {
							compare: 'offline',
						},
						style: {
							color: colorWhite,
							bgcolor: colorRed,
						},
					},
				],
			})
		} else {
			presets.push({
				category: 'Decoder',
				type: 'button',
				name: 'Online State',
				style: {
					text: '$(kiloview:online_state)',
					size: 'auto',
					color: colorWhite,
					bgcolor: colorBlack,
				},
				steps: [],
				feedbacks: [
					{
						feedbackId: 'online',
						options: {
							compare: 'online',
						},
						style: {
							color: colorWhite,
							bgcolor: colorGreen,
						},
					},
					{
						feedbackId: 'online',
						options: {
							compare: 'offline',
						},
						style: {
							color: colorWhite,
							bgcolor: colorRed,
						},
					},
				],
			})

			for (let i = 1; i <= self.CHOICES_PRESETS.length; i++) {
				presets.push({
					category: 'Decoder',
					type: 'button',
					name: 'Go to Preset ' + i,
					style: {
						text: `$(kiloview:preset${i}_channel_name)`,
						size: '14',
						color: colorWhite,
						bgcolor: colorBlack,
					},
					steps: [
						{
							down: [
								{
									actionId: 'setPreset',
									options: {
										preset: String(i),
									},
								},
							],
							up: [],
						},
					],
					feedbacks: [
						{
							feedbackId: 'preset_current',
							options: {
								preset: String(i),
								compare: true,
							},
							style: {
								color: colorWhite,
								bgcolor: colorRed,
							},
						},
					],
				})
			}
		}

		presets.push({
			category: 'General',
			type: 'button',
			name: 'Encoder/Decoder Resolution',
			style: {
				text: '$(kiloview:resolution)',
				size: 'auto',
				color: colorWhite,
				bgcolor: colorBlack,
			},
			steps: [],
			feedbacks: [],
		})

		presets.push({
			category: 'General',
			type: 'button',
			name: 'Encoder/Decoder Bitrate',
			style: {
				text: '$(kiloview:bitrate)',
				size: 'auto',
				color: colorWhite,
				bgcolor: colorBlack,
			},
			steps: [],
			feedbacks: [],
		})

		self.setPresetDefinitions(presets)
	},
}
