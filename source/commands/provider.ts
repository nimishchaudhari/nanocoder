import {Command} from '../types/index.js';

export const providerCommand: Command = {
	name: 'provider',
	description: 'Switch between AI providers',
	handler: async (_args: string[]) => {
		// This command is handled specially in app.tsx
		// This handler exists only for registration purposes
		return undefined;
	},
};
