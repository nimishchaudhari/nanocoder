import {Text, Box} from 'ink';
import {memo} from 'react';
import {colors} from '../config/index.js';

interface AssistantMessageProps {
	message: string;
	model: string;
}

export default memo(function AssistantMessage({
	message,
	model,
}: AssistantMessageProps) {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color={colors.primary} bold>
					{model}:
				</Text>
			</Box>
			<Text color={colors.white}>{message}</Text>
		</Box>
	);
});
