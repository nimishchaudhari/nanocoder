import {Command} from '../types/index.js';
import React from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {colors} from '../config/index.js';
import {Text} from 'ink';

function Clear() {
	return (
		<TitledBox
			borderStyle="round"
			titles={['/clear']}
			titleStyles={titleStyles.pill}
			width={75}
			borderColor={colors.success}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Text color={colors.success}>Chat Cleared...</Text>
		</TitledBox>
	);
}

export const clearCommand: Command = {
	name: 'clear',
	description: 'Clear the chat history and model context',
	handler: async (_args: string[]) => {
		// Return info message saying chat was cleared
		return React.createElement(Clear, {
			key: `clear-${Date.now()}`,
		});
	},
};
