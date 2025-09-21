import React from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useTheme} from '../hooks/useTheme.js';
import type {ToolCall} from '../types/core.js';
import {toolFormatters} from '../tools/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {getToolManager} from '../message-handler.js';

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
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const [formatterPreview, setFormatterPreview] = React.useState<
		React.ReactElement | string | null
	>(null);
	const [isLoadingPreview, setIsLoadingPreview] = React.useState(false);
	const [hasFormatterError, setHasFormatterError] = React.useState(false);

	// Get MCP tool info for display
	const toolManager = getToolManager();
	const mcpInfo = toolManager?.getMCPToolInfo(toolCall.function.name) || {isMCPTool: false};

	// Load formatter preview
	React.useEffect(() => {
		const loadPreview = async () => {
			const formatter = toolFormatters[toolCall.function.name];
			if (formatter) {
				setIsLoadingPreview(true);
				try {
					// Parse arguments if they're a JSON string
					let parsedArgs = toolCall.function.arguments;
					if (typeof parsedArgs === 'string') {
						try {
							parsedArgs = JSON.parse(parsedArgs);
						} catch (e) {
							// If parsing fails, use as-is
						}
					}
					const preview = await formatter(parsedArgs);
					setFormatterPreview(preview);
				} catch (error) {
					console.error('Error loading formatter preview:', error);
					setHasFormatterError(true);
					setFormatterPreview(
						<Text color={colors.error}>
							Error: {String(error)}
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

	// Auto-cancel if there's a formatter error
	React.useEffect(() => {
		if (hasFormatterError) {
			// Automatically cancel the tool execution
			onConfirm(false);
		}
	}, [hasFormatterError, onConfirm]);

	const options: ConfirmationOption[] = [
		{label: '✓ Yes, execute this tool', value: true},
		{label: '✗ No, cancel execution', value: false},
	];

	const handleSelect = (item: ConfirmationOption) => {
		onConfirm(item.value);
	};

	return (
		<Box width={boxWidth} marginBottom={1}>
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

				{/* Only show approval prompt if there's no formatter error */}
				{!hasFormatterError && (
					<>
						<Box marginBottom={1}>
							<Text color={colors.tool}>
								Do you want to execute {mcpInfo.isMCPTool ? `MCP tool "${toolCall.function.name}" from server "${mcpInfo.serverName}"` : `tool "${toolCall.function.name}"`}?
							</Text>
						</Box>

						<SelectInput items={options} onSelect={handleSelect} />

						<Box marginTop={1}>
							<Text color={colors.secondary}>Press Escape to cancel</Text>
						</Box>
					</>
				)}

				{/* Show automatic cancellation message for formatter errors */}
				{hasFormatterError && (
					<Box marginTop={1}>
						<Text color={colors.error}>Tool execution cancelled due to validation error.</Text>
						<Text color={colors.secondary}>Press Escape to continue</Text>
					</Box>
				)}
			</Box>
		</Box>
	);
}
