import {Box, Text} from 'ink';

import {colors} from '../config/index.js';

export default function CurrentWorkingDirectory() {
	const cwd = process.cwd();

	return (
		<>
			<Box
				borderStyle="round"
				marginBottom={1}
				paddingX={2}
				width={75}
				borderColor={colors.blue}
			>
				<Text color={colors.blue}>
					<Text bold={true}>CWD: </Text>
					{cwd}
				</Text>
			</Box>
		</>
	);
}
