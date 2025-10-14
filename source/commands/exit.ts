import {Command} from '@/types/index';
import InfoMessage from '@/components/info-message';
import React from 'react';

export const exitCommand: Command = {
	name: 'exit',
	description: 'Exit the application',
	handler: async (_args: string[], _messages, _metadata) => {
		// Return InfoMessage component first, then exit after a short delay
		setTimeout(() => {
			process.exit(0);
		}, 500); // 500ms delay to allow message to render

		return React.createElement(InfoMessage, {
			message: 'Goodbye! 👋',
			hideTitle: true,
		});
	},
};
