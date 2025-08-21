import {Command} from '../types/index.js';

export const exitCommand: Command = {
	name: 'exit',
	description: 'Exit the application',
	handler: async (_args: string[]) => {
		process.exit(0);
	},
};
