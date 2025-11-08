/**
 * /usage command
 * Displays token usage statistics
 */

import React from 'react';
import type {Command} from '@/types/commands.js';
import type {Message} from '@/types/core.js';
import {UsageDisplay} from '@/components/usage/usage-display.js';
import {
	calculateTokenBreakdown,
	calculateToolDefinitionsTokens,
} from '@/usage/calculator.js';
import {getModelContextLimit} from '@/models/index.js';
import {createTokenizer} from '@/tokenization/index.js';
import {getToolManager} from '@/message-handler';

export const usageCommand: Command = {
	name: 'usage',
	description: 'Display token usage statistics',
	handler: async (
		_args: string[],
		messages: Message[],
		metadata: {
			provider: string;
			model: string;
			tokens: number;
			getMessageTokens: (message: Message) => number;
		},
	) => {
		const {provider, model, getMessageTokens} = metadata;

		// Create tokenizer for accurate breakdown
		const tokenizer = createTokenizer(provider, model);

		// Calculate token breakdown from messages using cached token counts
		const baseBreakdown = calculateTokenBreakdown(
			messages,
			tokenizer,
			getMessageTokens,
		);

		// Extract tokenizer name before cleanup
		const tokenizerName = tokenizer.getName();

		// Clean up tokenizer resources
		if (tokenizer.free) {
			tokenizer.free();
		}

		// Calculate tool definitions tokens and create final breakdown (immutable)
		const toolManager = getToolManager();
		const toolDefinitions = toolManager
			? calculateToolDefinitionsTokens(
					Object.keys(toolManager.getToolRegistry()).length,
			  )
			: 0;

		const breakdown = {
			...baseBreakdown,
			toolDefinitions,
			total: baseBreakdown.total + toolDefinitions,
		};

		// Get context limit from models.dev
		const contextLimit = await getModelContextLimit(model);

		return React.createElement(UsageDisplay, {
			key: `usage-${Date.now()}`,
			provider,
			model,
			contextLimit,
			currentTokens: breakdown.total,
			breakdown,
			messages,
			tokenizerName,
			getMessageTokens,
		});
	},
};
