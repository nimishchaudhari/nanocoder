import React from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {colors} from '../config/index.js';
import type {ToolCall} from '../types/core.js';
import {toolFormatters} from '../tools/index.js';

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
	const [formatterPreview, setFormatterPreview] = React.useState<
		React.ReactElement | string | null
	>(null);
	const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);

	// Load formatter preview
	React.useEffect(() => {
		const loadPreview = async () => {
			const formatter = toolFormatters[toolCall.function.name];
			if (formatter) {
				setIsLoadingPreview(true);
				try {
					const preview = await formatter(toolCall.function.arguments);
					setFormatterPreview(preview);
				} catch (error) {
					console.error('Error loading formatter preview:', error);
					setFormatterPreview(
						<Text color={colors.error}>
							Error loading preview: {String(error)}
						</Text>,
					);
				} finally {
					setIsLoadingPreview(false);
				}
			}
		};

		loadPreview();
	}, [toolCall]);

	// Handle escape key to cancel
	useInput((inputChar, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	const options: ConfirmationOption[] = [
		{label: '✓ Yes, execute this tool', value: true},
		{label: '✗ No, cancel execution', value: false},
	];

	const handleSelect = (item: ConfirmationOption) => {
		onConfirm(item.value);
	};

	return (
		<Box width={75} marginBottom={1}>
			<Box flexDirection="column">
				{/* Formatter preview */}
				{isLoadingPreview && (
					<Box marginBottom={1}>
						<Text color={colors.secondary}>Loading preview...</Text>
					</Box>
				)}

				{formatterPreview && !isLoadingPreview && (
					<Box marginBottom={1} flexDirection="column">
						<Box>
							{React.isValidElement(formatterPreview) ? (
								formatterPreview
							) : (
								<Text color={colors.white}>{String(formatterPreview)}</Text>
							)}
						</Box>
					</Box>
				)}

				<Box marginBottom={1}>
					<Text color={colors.tool}>Do you want to execute this tool?</Text>
				</Box>

				<SelectInput items={options} onSelect={handleSelect} />

				<Box marginTop={1}>
					<Text color={colors.secondary}>Press Escape to cancel</Text>
				</Box>
			</Box>
		</Box>
	);
}
