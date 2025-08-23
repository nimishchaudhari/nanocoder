import {Text, Box} from 'ink';
import {colors} from '../config/index.js';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';

interface AssistantMessageProps {
	message: string;
	model: string;
}

export default function AssistantMessage({
	message,
	model,
}: AssistantMessageProps) {
	return (
		<TitledBox
			borderStyle="round"
			titles={[model]}
			titleStyles={titleStyles.pill}
			width={75}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Text color={colors.white}>{message}</Text>
		</TitledBox>
	);
}
