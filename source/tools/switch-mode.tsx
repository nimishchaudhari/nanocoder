import React from 'react';
import {Text} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {DevelopmentMode, DEVELOPMENT_MODE_LABELS} from '../types/core.js';

interface SwitchModeArgs {
	mode: DevelopmentMode;
	reason?: string;
}

const handler: ToolHandler = async (args: SwitchModeArgs): Promise<string> => {
	const {mode, reason} = args;

	// This tool doesn't actually switch the mode - it just returns a message
	// The actual mode switching happens in the validator/confirmation flow
	const modeLabel = DEVELOPMENT_MODE_LABELS[mode];
	const reasonText = reason ? `\n\nReason: ${reason}` : '';

	return `Mode switch requested to ${modeLabel}.${reasonText}\n\nThe user will be prompted to confirm this mode change.`;
};

const formatter = async (args: SwitchModeArgs) => {
	const {mode, reason} = args;
	const modeLabel = DEVELOPMENT_MODE_LABELS[mode];

	return (
		<Text>
			Mode switch request: <Text bold>{modeLabel}</Text>
			{reason && (
				<>
					{'\n'}Reason: <Text italic>{reason}</Text>
				</>
			)}
		</Text>
	);
};

export const switchModeTool: ToolDefinition = {
	handler,
	formatter,
	requiresConfirmation: true, // Always require confirmation for mode switches
	config: {
		type: 'function',
		function: {
			name: 'switch_mode',
			description:
				'Request to switch the development mode. Use this when you need different tool permissions (e.g., switching from Plan Mode to Normal Mode to implement changes, or to Auto-accept Mode for bulk operations). The user must confirm the mode change.',
			parameters: {
				type: 'object',
				properties: {
					mode: {
						type: 'string',
						enum: ['normal', 'auto-accept', 'plan'],
						description:
							'The mode to switch to. "normal": standard tool approval. "auto-accept": all tools execute automatically. "plan": file modification tools are blocked, read-only analysis mode.',
					},
					reason: {
						type: 'string',
						description:
							'Optional explanation for why you want to switch modes. This helps the user understand your request.',
					},
				},
				required: ['mode'],
			},
		},
	},
};
