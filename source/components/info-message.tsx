import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box} from 'ink';

import {colors} from '../config/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';

export default function InfoMessage({
	message,
	hideTitle = false,
	hideBox = false,
}: {
	message: string;
	hideTitle?: boolean;
	hideBox?: boolean;
}) {
	const boxWidth = useTerminalWidth();
	return (
		<>
			{hideBox ? (
				<Box width={boxWidth} flexDirection="column" marginBottom={1}>
					<Text color={colors.blue}>{message}</Text>
				</Box>
			) : hideTitle ? (
				<Box
					borderStyle="round"
					width={boxWidth}
					borderColor={colors.blue}
					paddingX={2}
					paddingY={0}
					flexDirection="column"
				>
					<Text color={colors.blue}>{message}</Text>
				</Box>
			) : (
				<TitledBox
					borderStyle="round"
					titles={['Info']}
					titleStyles={titleStyles.pill}
					width={boxWidth}
					borderColor={colors.blue}
					paddingX={2}
					paddingY={1}
					flexDirection="column"
				>
					<Text color={colors.blue}>{message}</Text>
				</TitledBox>
			)}
		</>
	);
}
