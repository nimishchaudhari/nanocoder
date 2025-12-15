import {useTheme} from '@/hooks/useTheme';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {memo} from 'react';

export default memo(function CancellingIndicator() {
	const {colors} = useTheme();
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Spinner type="dots" />
				<Text color={colors.secondary}> Cancelling...</Text>
			</Box>
		</Box>
	);
});
