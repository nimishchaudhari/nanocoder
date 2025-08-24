import {Text, Box} from 'ink';
import {colors} from '../config/index.js';

interface AssistantMessageProps {
	message: string;
	model: string;
}

export default function AssistantMessage({
	message,
	model,
}: AssistantMessageProps) {
	return (
		<Box flexDirection="column">
			<Box>
				<Text color={colors.primary} bold>
					{model}:
				</Text>
			</Box>
			<Text color={colors.white}>{message}</Text>
		</Box>
	);
}
