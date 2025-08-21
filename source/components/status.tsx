import {Box, Text} from 'ink';

import {colors} from '../config/index.js';

export default function Status({
	provider,
	model,
}: {
	provider: string;
	model: string;
}) {
	const cwd = process.cwd();

	return (
		<>
			<Box
				borderStyle="round"
				marginBottom={1}
				paddingX={2}
				width={75}
				borderColor={colors.secondary}
				flexDirection="column"
			>
				<Text color={colors.blue}>
					<Text bold={true}>CWD: </Text>
					{cwd}
				</Text>
				<Text color={colors.success}>
					<Text bold={true}>Provider: </Text>
					{provider}, <Text bold={true}>Model: </Text>
					{model}
				</Text>
			</Box>
		</>
	);
}
