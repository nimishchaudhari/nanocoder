import React from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {colors} from '../config/index.js';
import type {ToolCall} from '../types/core.js';

interface ToolConfirmationProps {
	toolCall: ToolCall;
	onConfirm: (confirmed: boolean) => void;
	onCancel: () => void;
}

interface ConfirmationOption {
	label: string;
	value: boolean;
}

export default function ToolConfirmation({
	toolCall,
	onConfirm,
	onCancel,
}: ToolConfirmationProps) {
	const [showFullContent, setShowFullContent] = React.useState(false);

	// Handle escape key to cancel and Ctrl+B to toggle full content  
	useInput((inputChar, key) => {
		if (key.escape) {
			onCancel();
		}
		// Ctrl+B to toggle full content
		if (key.ctrl && inputChar === 'b') {
			setShowFullContent(prev => !prev);
		}
	});

	const options: ConfirmationOption[] = [
		{label: '✓ Yes, execute this tool', value: true},
		{label: '✗ No, cancel execution', value: false},
	];

	const handleSelect = (item: ConfirmationOption) => {
		onConfirm(item.value);
	};

	// Format tool call details for display
	const formatToolCall = (toolCall: ToolCall, showFull: boolean = false) => {
		const args = toolCall.function.arguments;
		const argKeys = Object.keys(args);

		if (argKeys.length === 0) {
			return 'No arguments';
		}

		return argKeys
			.map(key => {
				let value = args[key];

				// Truncate long values for display unless showing full content
				if (!showFull) {
					if (typeof value === 'string' && value.length > 50) {
						value = value.substring(0, 47) + '...';
					} else if (typeof value === 'object') {
						value = JSON.stringify(value);
						if (value.length > 50) {
							value = value.substring(0, 47) + '...';
						}
					}
				} else {
					// Show full content - format objects nicely
					if (typeof value === 'object') {
						value = JSON.stringify(value, null, 2);
					}
				}

				return `${key}: ${value}`;
			})
			.join('\n');
	};

	return (
		<TitledBox
			borderStyle="round"
			titles={['Tool Execution Confirmation']}
			titleStyles={titleStyles.pill}
			width={75}
			borderColor={colors.tool}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
		>
			<Box flexDirection="column">
				<Text color={colors.white}>Tool: {toolCall.function.name}</Text>
				<Box marginTop={1} marginBottom={1}>
					<Box flexDirection="column">
						<Text color={colors.secondary}>Arguments:</Text>
						<Text color={colors.white}>{formatToolCall(toolCall, showFullContent)}</Text>
					</Box>
				</Box>

				<Box marginBottom={1}>
					<Text color={colors.tool}>Do you want to execute this tool?</Text>
				</Box>

				<SelectInput items={options} onSelect={handleSelect} />

				<Box marginTop={1} flexDirection="column">
					<Text color={colors.secondary}>Press Escape to cancel</Text>
					<Text color={colors.secondary}>Press Ctrl+B to {showFullContent ? 'collapse' : 'expand'} content</Text>
				</Box>
			</Box>
		</TitledBox>
	);
}
