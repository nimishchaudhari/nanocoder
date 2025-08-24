import {memo} from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {colors} from '../config/index.js';

export default memo(function CancellingIndicator() {
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Spinner type="dots2" />
				<Text color={colors.secondary}> Cancelling...</Text>
			</Box>
		</Box>
	);
});