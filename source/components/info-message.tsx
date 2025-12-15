import {Box, Text} from 'ink';

import {TitledBox} from '@/components/ui/titled-box';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {useTheme} from '@/hooks/useTheme';

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
	const {colors} = useTheme();
	return (
		<>
			{hideBox ? (
				<Box width={boxWidth} flexDirection="column" marginBottom={1}>
					<Text color={colors.info}>{message}</Text>
				</Box>
			) : hideTitle ? (
				<Box
					borderStyle="round"
					width={boxWidth}
					borderColor={colors.info}
					paddingX={2}
					paddingY={0}
					flexDirection="column"
				>
					<Text color={colors.info}>{message}</Text>
				</Box>
			) : (
				<TitledBox
					title="Info"
					width={boxWidth}
					borderColor={colors.info}
					paddingX={2}
					paddingY={1}
					flexDirection="column"
				>
					<Text color={colors.info}>{message}</Text>
				</TitledBox>
			)}
		</>
	);
}
