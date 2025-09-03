import {Command} from '../types/index.js';
import React from 'react';
import SuccessMessage from '../components/success-message.js';

function Clear() {
	return (
		<SuccessMessage
			hideBox={true}
			message="✔️ Chat Cleared..."
		></SuccessMessage>
	);
}

export const clearCommand: Command = {
	name: 'clear',
	description: 'Clear the chat history and model context',
	handler: async (_args: string[]) => {
		// Return info message saying chat was cleared
		return React.createElement(Clear, {
			key: `clear-${Date.now()}`,
		});
	},
};
