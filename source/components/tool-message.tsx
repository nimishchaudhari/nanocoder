import React, {memo} from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box} from 'ink';

import {colors} from '../config/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';

export default memo(function ToolMessage({
	title,
	message,
	hideTitle = false,
	hideBox = false,
	isBashMode = false,
}: {
	title?: string;
	message: string | React.ReactNode;
	hideTitle?: boolean;
	hideBox?: boolean;
	isBashMode?: boolean;
}) {
	const boxWidth = useTerminalWidth();
	// Handle both string and ReactNode messages
	const messageContent =
		typeof message === 'string' ? (
			<Text color={isBashMode ? colors.error : colors.tool}>{message}</Text>
		) : (
			message
		);

	const borderColor = isBashMode ? colors.error : colors.tool;
	const borderStyle = "round"; // Use rounded corners for consistency

	return (
		<>
			{hideBox ? (
				<Box width={boxWidth} flexDirection="column" marginBottom={1}>
					{messageContent}
					{isBashMode && (
						<Text color={colors.error} dimColor>
							Output truncated to 4k characters to save context
						</Text>
					)}
				</Box>
			) : hideTitle ? (
				<Box
					borderStyle={borderStyle}
					width={boxWidth}
					borderColor={borderColor}
					paddingX={2}
					paddingY={0}
					flexDirection="column"
				>
					{messageContent}
					{isBashMode && (
						<Text color={colors.error} dimColor>
							Output truncated to 4k characters to save context
						</Text>
					)}
				</Box>
			) : (
				<TitledBox
					borderStyle={borderStyle}
					titles={[title || 'Tool Message']}
					titleStyles={titleStyles.pill}
					width={boxWidth}
					borderColor={borderColor}
					paddingX={2}
					paddingY={1}
					flexDirection="column"
				>
					{messageContent}
					{isBashMode && (
						<Text color={colors.error} dimColor>
							Output truncated to 4k characters to save context
						</Text>
					)}
				</TitledBox>
			)}
		</>
	);
});
