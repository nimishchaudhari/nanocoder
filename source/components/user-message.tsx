import {Box, Text} from 'ink';
import {memo} from 'react';
import {useTheme} from '../hooks/useTheme.js';
import type {UserMessageProps} from '../types/index.js';

export default memo(function UserMessage({message}: UserMessageProps) {
	const {colors} = useTheme();
	// Show placeholder for long messages
	if (message.length > 150) {
		const lineCount = message.split('\n').length;
		return (
			<Box flexDirection="column" marginBottom={1}>
				<Box>
					<Text color={colors.secondary} bold>
						You:
					</Text>
				</Box>
				<Box>
					<Text color={colors.white}>
						[{message.length} characters, {lineCount} lines]
					</Text>
				</Box>
			</Box>
		);
	}

	const lines = message.split('\n');

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color={colors.secondary} bold>
					You:
				</Text>
			</Box>
			<Box flexDirection="column">
				{lines.map((line, index) => (
					<Text key={index} color={colors.white}>
						{line}
					</Text>
				))}
			</Box>
		</Box>
	);
});
