import React from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box} from 'ink';

import {colors} from '../config/index.js';

export default function ToolMessage({
	title,
	message,
	hideTitle = false,
	hideBox = false,
}: {
	title?: string;
	message: string | React.ReactNode;
	hideTitle?: boolean;
	hideBox?: boolean;
}) {
	// Handle both string and ReactNode messages
	const messageContent =
		typeof message === 'string' ? (
			<Text color={colors.tool}>{message}</Text>
		) : (
			message
		);

	return (
		<>
			{hideBox ? (
				<Box width={75} flexDirection="column" marginBottom={1}>
					{messageContent}
				</Box>
			) : hideTitle ? (
				<Box
					borderStyle="round"
					width={75}
					borderColor={colors.tool}
					paddingX={2}
					paddingY={0}
					flexDirection="column"
				>
					{messageContent}
				</Box>
			) : (
				<TitledBox
					borderStyle="round"
					titles={[title || 'Tool Message']}
					titleStyles={titleStyles.pill}
					width={75}
					borderColor={colors.tool}
					paddingX={2}
					paddingY={1}
					flexDirection="column"
				>
					{messageContent}
				</TitledBox>
			)}
		</>
	);
}
