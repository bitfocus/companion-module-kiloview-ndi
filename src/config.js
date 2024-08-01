const { Regex } = require('@companion-module/base')

module.exports = {
	getConfigFields() {
		let self = this

		return [
			{
				type: 'static-text',
				id: 'info',
				width: 12,
				label: 'Information',
				value: 'This modules controls Kiloview NDI devices. You may need to enable HTTP API access for the user account you are using on the Kiloview device.',
			},
			{
				type: 'static-text',
				id: 'hr1',
				width: 12,
				label: ' ',
				value: '<hr />',
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'IP Address',
				width: 6,
				default: '',
				regex: Regex.IP,
			},
			{
				type: 'static-text',
				id: 'hr2',
				width: 12,
				label: ' ',
				value: '<hr />',
			},
			{
				type: 'checkbox',
				id: 'useAuth',
				label: 'Use Authentication',
				width: 6,
				default: true,
			},
			{
				type: 'textinput',
				label: 'Username',
				id: 'username',
				width: 3,
				default: 'admin',
				isVisible: (configValues) => configValues.useAuth === true,
			},
			{
				type: 'textinput',
				label: 'Password',
				id: 'password',
				width: 3,
				default: 'admin',
				isVisible: (configValues) => configValues.useAuth === true,
			},
			{
				type: 'static-text',
				id: 'hr3',
				width: 12,
				label: ' ',
				value: '<hr />',
			},
			{
				type: 'dropdown',
				id: 'mode',
				label: 'Default Mode (if not known yet)',
				width: 4,
				default: self.CHOICES_CONVERTER_MODES[0].id,
				choices: self.CHOICES_CONVERTER_MODES,
			},
			{
				type: 'static-text',
				id: 'hr4',
				width: 12,
				label: ' ',
				value: '<hr />',
			},
			{
				type: 'checkbox',
				id: 'polling',
				label: 'Enable Polling (necessary for feedbacks and variables)',
				default: false,
				width: 3,
			},
			{
				type: 'textinput',
				id: 'pollingrate',
				label: 'Polling Rate for Current State (in ms)',
				default: self.POLLINGRATE,
				width: 3,
				isVisible: (configValues) => configValues.polling === true,
			},
			{
				type: 'textinput',
				id: 'pollingrate_sources',
				label: 'Polling Rate for new NDI Sources (in ms)',
				default: self.POLLINGRATE_SOURCES,
				width: 3,
				isVisible: (configValues) => configValues.polling === true && configValues.mode === 'decoder',
			},
			{
				type: 'static-text',
				id: 'hr5',
				width: 12,
				label: ' ',
				value: '<hr />',
			},
			{
				type: 'checkbox',
				id: 'verbose',
				label: 'Enable Verbose Logging',
				default: false,
				width: 3,
			},
			{
				type: 'static-text',
				id: 'info3',
				width: 9,
				label: ' ',
				value: `Enabling Verbose Logging will push all incoming and outgoing data to the log, which is helpful for debugging.`,
			},
		]
	},
}
