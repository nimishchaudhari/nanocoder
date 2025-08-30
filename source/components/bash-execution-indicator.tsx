import {memo} from 'react';
import {Box, Text} from 'ink';
import {colors} from '../config/index.js';

interface BashExecutionIndicatorProps {
	command: string;
}

export default memo(function BashExecutionIndicator({
	command,
}: BashExecutionIndicatorProps) {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box flexDirection="row">
				<Text color={colors.tool}>● Executing: </Text>
				<Text color={colors.secondary}>{command}</Text>
			</Box>
			<Box marginTop={1}>
				<Text color={colors.secondary}>Press Escape to cancel</Text>
			</Box>
		</Box>
	);
});
