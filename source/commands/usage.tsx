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
		metadata: {provider: string; model: string; tokens: number},
	) => {
		const {provider, model} = metadata;

		// Create tokenizer for accurate breakdown
		const tokenizer = createTokenizer(provider, model);

		// Calculate token breakdown from messages
		const breakdown = calculateTokenBreakdown(messages, tokenizer);

		// Get tool count and add tool definitions tokens to breakdown
		const toolManager = getToolManager();
		if (toolManager) {
			const toolRegistry = toolManager.getToolRegistry();
			const toolCount = Object.keys(toolRegistry).length;
			breakdown.toolDefinitions = calculateToolDefinitionsTokens(toolCount);
			breakdown.total += breakdown.toolDefinitions;
		}

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
			tokenizer,
		});
	},
};
