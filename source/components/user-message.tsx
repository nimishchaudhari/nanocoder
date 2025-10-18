import {Box, Text} from 'ink';
import {memo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import type {UserMessageProps} from '@/types/index';

export default memo(function UserMessage({message}: UserMessageProps) {
	const {colors} = useTheme();

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
