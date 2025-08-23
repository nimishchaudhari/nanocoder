import {Box, Text} from 'ink';
import {colors} from '../config/index.js';

interface UserMessageProps {
	message: string;
}

export default function UserMessage({message}: UserMessageProps) {
	const lines = message.split('\n');
	
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color={colors.secondary} bold>
					You:
				</Text>
			</Box>
			<Box flexDirection="column" paddingLeft={1}>
				{lines.map((line, index) => (
					<Text key={index} color={colors.white}>
						{line}
					</Text>
				))}
			</Box>
		</Box>
	);
}
