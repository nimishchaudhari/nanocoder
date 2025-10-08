import {memo, useState, useEffect, useRef} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '../hooks/useTheme.js';
import type {ThinkingIndicatorProps} from '../types/index.js';

const THINKING_WORDS = [
	'Thinking',
	'Processing',
	'Analyzing',
	'Contemplating',
	'Pondering',
	'Computing',
	'Reasoning',
	'Considering',
	'Evaluating',
	'Deliberating',
	'Reflecting',
	'Cogitating',
	'Calculating',
	'Strategizing',
	'Synthesizing',
	'Brainstorming',
	'Hypothesizing',
	'Deducing',
	'Inferring',
	'Conceptualizing',
	'Formulating',
	'Investigating',
	'Examining',
	'Interpreting',
	'Deciphering',
	'Solving',
	'Exploring',
	'Assessing',
	'Ruminating',
	'Meditating',
];

export default memo(function ThinkingIndicator({
	contextSize,
	totalTokensUsed,
	tokensPerSecond,
}: ThinkingIndicatorProps) {
	const {colors} = useTheme();
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [wordIndex, setWordIndex] = useState(0);
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

	useEffect(() => {
		const wordTimer = setInterval(() => {
			setWordIndex(Math.floor(Math.random() * THINKING_WORDS.length));
		}, 3000);

		return () => {
			clearInterval(wordTimer);
		};
	}, []);

	const percentage =
		contextSize > 0 ? Math.round((totalTokensUsed / contextSize) * 100) : 0;

	// Clamp percentage to prevent display jitter from values over 100%
	const displayPercentage = Math.min(percentage, 100);

	// Format tokens per second display
	const tokensPerSecondDisplay =
		tokensPerSecond !== undefined && tokensPerSecond > 0
			? ` • ${tokensPerSecond} tok/s`
			: '';

	// Cycle through 1-3 dots based on elapsed seconds
	const dots = '.'.repeat((elapsedSeconds % 4) + 1);

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box flexWrap="wrap">
				<Text color={colors.primary} bold italic>
					{THINKING_WORDS[wordIndex]}
					{dots}{' '}
				</Text>
				<Text color={colors.white}>
					{elapsedSeconds}s{tokensPerSecondDisplay}
					{contextSize > 0 ? ` • ${displayPercentage}% context used` : ''}
				</Text>
			</Box>
			<Box marginTop={1}>
				<Text color={colors.secondary}>Press Escape to cancel</Text>
			</Box>
		</Box>
	);
});
