import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box} from 'ink';

import {colors} from '../config/index.js';

export default function InfoMessage({
	message,
	hideTitle = false,
	hideBox = false,
}: {
	message: string;
	hideTitle?: boolean;
	hideBox?: boolean;
}) {
	return (
		<>
			{hideBox ? (
				<Box width={75} flexDirection="column" marginBottom={1}>
					<Text color={colors.blue}>{message}</Text>
				</Box>
			) : hideTitle ? (
				<Box
					borderStyle="round"
					width={75}
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
					width={75}
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
