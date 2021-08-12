module.exports.initVariables = function (instance) {
	instance.setVariableDefinitions([
		{
			label: 'Current converter mode',
			name: 'mode',
		},
		{
			label: 'Resolution',
			name: 'resolution',
		},
		{
			label: 'Current bitrate',
			name: 'bitrate',
		},
		{
			label: 'NDI Stream name (decoder)',
			name: 'streamname',
		},
		{
			label: 'Stream online (decoder)',
			name: 'online',
		},
		{
			label: 'Active video signal (encoder)',
			name: 'video_signal',
		},
	])
	instance.setVariable('mode', 'N/A')
	instance.setVariable('resolution', 'N/A')
	instance.setVariable('bitrate', 'N/A')
	instance.setVariable('streamname', 'N/A')
	instance.setVariable('online', 'N/A')
	instance.setVariable('video_signal', 'N/A')
}
