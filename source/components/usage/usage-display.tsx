/**
 * Usage display component for /usage command
 */

import React from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Box, Text} from 'ink';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {useTheme} from '@/hooks/useTheme';
import {ProgressBar} from './progress-bar.js';
import type {Message} from '@/types/core.js';
import type {TokenBreakdown} from '@/usage/types.js';
import {formatTokenCount, getUsageStatusColor} from '@/usage/calculator.js';

interface UsageDisplayProps {
	provider: string;
	model: string;
	contextLimit: number | null;
	currentTokens: number;
	breakdown: TokenBreakdown;
	messages: Message[];
	tokenizerName: string;
	getMessageTokens: (message: Message) => number;
}

export function UsageDisplay({
	provider,
	model,
	contextLimit,
	currentTokens,
	breakdown,
	messages,
	tokenizerName,
	getMessageTokens,
}: UsageDisplayProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();

	// Calculate percentages
	const percentUsed = contextLimit ? (currentTokens / contextLimit) * 100 : 0;
	const statusColor = getUsageStatusColor(percentUsed);
	const availableTokens = contextLimit ? contextLimit - currentTokens : 0;

	// Get the actual color from theme
	const progressColor =
		statusColor === 'success'
			? colors.success
			: statusColor === 'warning'
			? colors.warning
			: colors.error;

	// Calculate category percentages for breakdown bars
	const systemPercent = currentTokens
		? (breakdown.system / currentTokens) * 100
		: 0;
	const userPercent = currentTokens
		? (breakdown.userMessages / currentTokens) * 100
		: 0;
	const assistantPercent = currentTokens
		? (breakdown.assistantMessages / currentTokens) * 100
		: 0;
	const toolMessagesPercent = currentTokens
		? (breakdown.toolResults / currentTokens) * 100
		: 0;
	const toolDefsPercent = currentTokens
		? (breakdown.toolDefinitions / currentTokens) * 100
		: 0;

	// Calculate recent activity stats using cached token counts
	const last5Messages = messages.slice(-5);
	const last5TokenCount = last5Messages.reduce(
		(sum, msg) => sum + getMessageTokens(msg),
		0,
	);

	// Find largest message using cached token counts
	const largestMessageTokens =
		messages.length > 0
			? Math.max(...messages.map(msg => getMessageTokens(msg)))
			: 0;

	// Bar width for category breakdown
	const barMaxWidth = Math.min(30, boxWidth - 30);

	return (
		<TitledBox
			key={colors.primary}
			borderStyle="round"
			titles={['Context Usage']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.info}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			{/* Overall Usage */}
			<Box marginBottom={1}>
				<Text color={colors.secondary}>Overall Usage</Text>
			</Box>
			<Box marginBottom={0}>
				<ProgressBar
					percent={percentUsed}
					width={Math.min(60, boxWidth - 8)}
					color={progressColor}
				/>
				<Text color={colors.white} bold>
					{' '}
					{Math.round(percentUsed)}%
				</Text>
			</Box>
			<Box marginBottom={1}>
				<Text color={colors.secondary}>
					{formatTokenCount(currentTokens)} /{' '}
					{contextLimit ? formatTokenCount(contextLimit) : 'Unknown'} tokens
				</Text>
			</Box>

			{/* Category Breakdown */}
			<Box marginTop={1} marginBottom={1}>
				<Text color={colors.secondary}>Breakdown by Category</Text>
			</Box>

			{/* System Prompt */}
			<Box flexDirection="row" marginBottom={0}>
				<Box width={20}>
					<Text color={colors.info}>System Prompt</Text>
				</Box>
				<Box width={barMaxWidth}>
					<ProgressBar
						percent={systemPercent}
						width={barMaxWidth}
						color={colors.info}
					/>
				</Box>
				<Box marginLeft={2}>
					<Text color={colors.white}>
						{Math.round(systemPercent)}% ({formatTokenCount(breakdown.system)})
					</Text>
				</Box>
			</Box>

			{/* User Messages */}
			<Box flexDirection="row" marginBottom={0}>
				<Box width={20}>
					<Text color={colors.secondary}>User Messages</Text>
				</Box>
				<Box width={barMaxWidth}>
					<ProgressBar
						percent={userPercent}
						width={barMaxWidth}
						color={colors.info}
					/>
				</Box>
				<Box marginLeft={2}>
					<Text color={colors.white}>
						{Math.round(userPercent)}% (
						{formatTokenCount(breakdown.userMessages)})
					</Text>
				</Box>
			</Box>

			{/* Assistant Messages */}
			<Box flexDirection="row" marginBottom={0}>
				<Box width={20}>
					<Text color={colors.secondary}>Assistant Messages</Text>
				</Box>
				<Box width={barMaxWidth}>
					<ProgressBar
						percent={assistantPercent}
						width={barMaxWidth}
						color={colors.info}
					/>
				</Box>
				<Box marginLeft={2}>
					<Text color={colors.white}>
						{Math.round(assistantPercent)}% (
						{formatTokenCount(breakdown.assistantMessages)})
					</Text>
				</Box>
			</Box>

			{/* Tool Messages */}
			<Box flexDirection="row" marginBottom={0}>
				<Box width={20}>
					<Text color={colors.secondary}>Tool Messages</Text>
				</Box>
				<Box width={barMaxWidth}>
					<ProgressBar
						percent={toolMessagesPercent}
						width={barMaxWidth}
						color={colors.info}
					/>
				</Box>
				<Box marginLeft={2}>
					<Text color={colors.white}>
						{Math.round(toolMessagesPercent)}% (
						{formatTokenCount(breakdown.toolResults)})
					</Text>
				</Box>
			</Box>

			{/* Tool Definitions */}
			<Box flexDirection="row" marginBottom={1}>
				<Box width={20}>
					<Text color={colors.secondary}>Tool Definitions</Text>
				</Box>
				<Box width={barMaxWidth}>
					<ProgressBar
						percent={toolDefsPercent}
						width={barMaxWidth}
						color={colors.info}
					/>
				</Box>
				<Box marginLeft={2}>
					<Text color={colors.white}>
						{Math.round(toolDefsPercent)}% (
						{formatTokenCount(breakdown.toolDefinitions)})
					</Text>
				</Box>
			</Box>

			{/* Available Tokens */}
			<Box marginTop={1} marginBottom={1}>
				<Text color={colors.secondary}>
					Available:{' '}
					<Text color={colors.success}>
						{formatTokenCount(availableTokens)} tokens
					</Text>
				</Text>
			</Box>

			{/* Model Information */}
			<Box marginTop={1} marginBottom={1}>
				<Text color={colors.secondary}>Model Information</Text>
			</Box>
			<Box>
				<Text color={colors.secondary}>
					Provider: <Text color={colors.white}>{provider}</Text>
				</Text>
			</Box>
			<Box>
				<Text color={colors.secondary}>
					Model: <Text color={colors.white}>{model}</Text>
				</Text>
			</Box>
			<Box>
				<Text color={colors.secondary}>
					Context Limit:{' '}
					<Text color={colors.white}>
						{contextLimit ? formatTokenCount(contextLimit) : 'Unknown'}
					</Text>
				</Text>
			</Box>
			<Box marginBottom={1}>
				<Text color={colors.secondary}>
					Tokenizer: <Text color={colors.white}>{tokenizerName}</Text>
				</Text>
			</Box>

			{/* Recent Activity */}
			<Box marginTop={1} marginBottom={1}>
				<Text color={colors.secondary}>Recent Activity</Text>
			</Box>
			<Box>
				<Text color={colors.secondary}>
					Last 5 messages:{' '}
					<Text color={colors.white}>
						{formatTokenCount(last5TokenCount)} tokens
					</Text>
				</Text>
			</Box>
			<Box>
				<Text color={colors.secondary}>
					Largest message:{' '}
					<Text color={colors.white}>
						{formatTokenCount(largestMessageTokens)} tokens
					</Text>
				</Text>
			</Box>
		</TitledBox>
	);
}
