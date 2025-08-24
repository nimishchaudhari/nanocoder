import {Text} from 'ink';
import {memo} from 'react';

import {colors} from '../config/index.js';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';

// Get CWD once at module load time
const cwd = process.cwd();

export default memo(function Status({
	provider,
	model,
}: {
	provider: string;
	model: string;
}) {

	return (
		<TitledBox
			borderStyle="round"
			titles={['Status']}
			titleStyles={titleStyles.pill}
			width={75}
			borderColor={colors.blue}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
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
		</TitledBox>
	);
});
