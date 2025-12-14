import {Text, Box} from 'ink';
import {memo} from 'react';

import {TitledBox} from '@/components/ui/titled-box';
import {useTheme} from '@/hooks/useTheme';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';

export default memo(function ErrorMessage({
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
					<Text color={colors.error}>{message}</Text>
				</Box>
			) : hideTitle ? (
				<Box
					borderStyle="round"
					width={boxWidth}
					borderColor={colors.error}
					paddingX={2}
					paddingY={0}
					flexDirection="column"
				>
					<Text color={colors.error}>{message}</Text>
				</Box>
			) : (
				<TitledBox
					title="Error"
					width={boxWidth}
					borderColor={colors.error}
					paddingX={2}
					paddingY={1}
					flexDirection="column"
				>
					<Text color={colors.error}>{message}</Text>
				</TitledBox>
			)}
		</>
	);
});
