import React from 'react';
import type {Command} from '@/types/index';

export const statusCommand: Command = {
	name: 'status',
	description: 'Display current status (provider, model, theme)',
	handler: async (_args: string[], _messages, _metadata) => {
		// This command is handled specially in app.tsx
		// This handler exists only for registration purposes
		return React.createElement(React.Fragment);
	},
};
