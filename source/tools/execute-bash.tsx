import {spawn} from 'node:child_process';
import {highlight} from 'cli-highlight';
import React from 'react';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {colors} from '../config/index.js';
import ToolMessage from '../components/tool-message.js';

const handler: ToolHandler = async (args: {
	command: string;
}): Promise<string> => {
	return new Promise((resolve, reject) => {
		const proc = spawn('sh', ['-c', args.command]);
		let stdout = '';
		let stderr = '';

		proc.stdout.on('data', data => {
			stdout += data.toString();
		});

		proc.stderr.on('data', data => {
			stderr += data.toString();
		});

		proc.on('close', () => {
			if (stderr) {
				resolve(`STDERR:\n${stderr}\nSTDOUT:\n${stdout}`);
			} else {
				resolve(stdout);
			}
		});

		proc.on('error', error => {
			reject(new Error(`Error executing command: ${error.message}`));
		});
	});
};

const formatter = async (args: any): Promise<React.ReactElement> => {
	const command = args.command || 'unknown';

	let highlightedCommand;
	try {
		highlightedCommand = highlight(command, {
			language: 'bash',
			theme: 'default',
		});
	} catch {
		highlightedCommand = command;
	}

	const messageContent = (
		<Box flexDirection="column">
			<Text color={colors.tool}>⚒ execute_bash</Text>

			<Box>
				<Text color={colors.secondary}>Command: </Text>
				<Text color={colors.primary}>{command}</Text>
			</Box>
		</Box>
	);

	return <ToolMessage message={messageContent} hideBox={true} />;
};

export const executeBashTool: ToolDefinition = {
	handler,
	formatter,
	config: {
		type: 'function',
		function: {
			name: 'execute_bash',
			description: 'Execute a bash command and return its output',
			parameters: {
				type: 'object',
				properties: {
					command: {
						type: 'string',
						description: 'The bash command to execute.',
					},
				},
				required: ['command'],
			},
		},
	},
};
