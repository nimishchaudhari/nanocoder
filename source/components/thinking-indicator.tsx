import {memo, useState, useEffect, useRef} from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {colors} from '../config/index.js';

interface ThinkingIndicatorProps {
	tokenCount: number;
	contextSize: number;
	totalTokensUsed: number;
}

export default memo(function ThinkingIndicator({
	tokenCount,
	contextSize,
	totalTokensUsed,
}: ThinkingIndicatorProps) {
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const startTimeRef = useRef<number>(Date.now());

	useEffect(() => {
		startTimeRef.current = Date.now();
		setElapsedSeconds(0);
	}, []);

	useEffect(() => {
		const timer = setInterval(() => {
			const currentTime = Date.now();
			const elapsed = Math.floor((currentTime - startTimeRef.current) / 1000);
			setElapsedSeconds(elapsed);
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	const percentage =
		contextSize > 0 ? Math.round((totalTokensUsed / contextSize) * 100) : 0;

	// Clamp percentage to prevent display jitter from values over 100%
	const displayPercentage = Math.min(percentage, 100);

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Spinner type="dots2" />
				<Text color={colors.secondary}> Thinking... </Text>
				<Box width={40} justifyContent="flex-start">
					<Text color={colors.white}>
						{tokenCount} tokens • {elapsedSeconds}s • {displayPercentage}%
						context used
					</Text>
				</Box>
			</Box>
			<Box marginTop={1}>
				<Text color={colors.secondary}>Press Escape to cancel</Text>
			</Box>
		</Box>
	);
});
