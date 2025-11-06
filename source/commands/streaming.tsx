import {Command} from '@/types/index';
import React from 'react';
import InfoMessage from '@/components/info-message';
import {isStreamingEnabled, setStreamingEnabled} from '@/config/preferences';

function StreamingToggle({enabled}: {enabled: boolean}) {
	return (
		<InfoMessage
			hideBox={true}
			message={`Response streaming ${enabled ? 'enabled' : 'disabled'}.`}
		/>
	);
}

export const streamingCommand: Command = {
	name: 'streaming',
	description: 'Toggle response streaming on/off',
	handler: (_args: string[]) => {
		// Toggle the current streaming setting
		const currentSetting = isStreamingEnabled();
		const newSetting = !currentSetting;
		setStreamingEnabled(newSetting);

		return Promise.resolve(
			React.createElement(StreamingToggle, {
				enabled: newSetting,
				key: `streaming-${Date.now()}`,
			}),
		);
	},
};
