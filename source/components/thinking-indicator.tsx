import {memo} from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {colors} from '../config/index.js';

interface ThinkingIndicatorProps {
	tokenCount: number;
	elapsedSeconds: number;
	contextSize: number;
	totalTokensUsed: number;
}

export default memo(function ThinkingIndicator({
	tokenCount,
	elapsedSeconds,
	contextSize,
	totalTokensUsed,
}: ThinkingIndicatorProps) {
	const percentage =
		contextSize > 0 ? Math.round((totalTokensUsed / contextSize) * 100) : 0;

	// Clamp percentage to prevent display jitter from values over 100%
	const displayPercentage = Math.min(percentage, 100);

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Spinner type="dots2" />
				<Text color={colors.secondary}> Thinking... </Text>
				<Text color={colors.white}>
					{tokenCount} tokens • {elapsedSeconds}s • {displayPercentage}% context used
				</Text>
			</Box>
		</Box>
	);
}, (prevProps, nextProps) => {
	// Only re-render if values actually changed significantly
	return (
		prevProps.tokenCount === nextProps.tokenCount &&
		prevProps.elapsedSeconds === nextProps.elapsedSeconds &&
		Math.floor(prevProps.totalTokensUsed / prevProps.contextSize * 100) === 
		Math.floor(nextProps.totalTokensUsed / nextProps.contextSize * 100)
	);
});
