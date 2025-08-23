import React from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {colors} from '../config/index.js';

interface ThinkingIndicatorProps {
	tokenCount: number;
	elapsedSeconds: number;
	contextSize: number;
	totalTokensUsed: number;
}

export default function ThinkingIndicator({
	tokenCount,
	elapsedSeconds,
	contextSize,
	totalTokensUsed,
}: ThinkingIndicatorProps) {
	const percentage = contextSize > 0 ? Math.round((totalTokensUsed / contextSize) * 100) : 0;
	
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Spinner type="dots" />
				<Text color={colors.secondary}> Thinking... </Text>
				<Text color={colors.white}>
					{tokenCount} tokens • {elapsedSeconds}s • {percentage}% context used
				</Text>
			</Box>
		</Box>
	);
}