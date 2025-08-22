import {Command} from '../types/index.js';
import {commandRegistry} from '../commands.js';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import React from 'react';
import Help from '../components/commands/help.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(
	fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
);

export const helpCommand: Command = {
	name: 'help',
	description: 'Show available commands',
	handler: async (_args: string[]) => {
		const commands = commandRegistry.getAll();

		return React.createElement(Help, {
			key: `help-${Date.now()}`,
			version: packageJson.version,
			commands: commands,
		});
	},
};
