import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
	MCP_TEMPLATES,
	type McpTemplate,
	type McpServerConfig,
} from '../templates/mcp-templates.js';

interface McpStepProps {
	onComplete: (mcpServers: Record<string, McpServerConfig>) => void;
	onBack?: () => void;
	existingServers?: Record<string, McpServerConfig>;
}

type Mode = 'ask-if-want-mcp' | 'template-selection' | 'field-input' | 'done';

interface TemplateOption {
	label: string;
	value: string;
}

export function McpStep({
	onComplete,
	onBack,
	existingServers = {},
}: McpStepProps) {
	const [servers, setServers] =
		useState<Record<string, McpServerConfig>>(existingServers);
	const [mode, setMode] = useState<Mode>('ask-if-want-mcp');
	const [selectedTemplate, setSelectedTemplate] = useState<McpTemplate | null>(
		null,
	);
	const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
	const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({});
	const [currentValue, setCurrentValue] = useState('');
	const [multilineBuffer, setMultilineBuffer] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [inputKey, setInputKey] = useState(0);

	const initialOptions = [
		{label: '[1] Yes - Choose from common MCP servers', value: 'yes'},
		{label: '[2] No - Skip MCP configuration', value: 'no'},
	];

	const templateOptions: TemplateOption[] = [
		...MCP_TEMPLATES.map((template, index) => ({
			label: `[${index + 1}] ${template.name} - ${template.description}`,
			value: template.id,
		})),
		{
			label: `[${MCP_TEMPLATES.length + 1}] Done adding MCP servers`,
			value: 'done',
		},
	];

	const handleInitialSelect = (item: {value: string}) => {
		if (item.value === 'yes') {
			setMode('template-selection');
		} else {
			// Skip MCP
			onComplete(servers);
		}
	};

	const handleTemplateSelect = (item: TemplateOption) => {
		if (item.value === 'done') {
			onComplete(servers);
			return;
		}

		const template = MCP_TEMPLATES.find((t) => t.id === item.value);
		if (template) {
			setSelectedTemplate(template);
			setCurrentFieldIndex(0);
			setFieldAnswers({});
			setCurrentValue(template.fields[0]?.default || '');
			setMultilineBuffer('');
			setError(null);
			setMode('field-input');
		}
	};

	const handleFieldSubmit = () => {
		if (!selectedTemplate) return;

		const currentField = selectedTemplate.fields[currentFieldIndex];
		if (!currentField) return;

		// For multiline fields, handle differently
		const isMultiline = currentField.name === 'envVars';
		const finalValue = isMultiline ? multilineBuffer : currentValue.trim();

		// Validate required fields
		if (currentField.required && !finalValue) {
			setError('This field is required');
			return;
		}

		// Validate with custom validator
		if (currentField.validator && finalValue) {
			const validationError = currentField.validator(finalValue);
			if (validationError) {
				setError(validationError);
				return;
			}
		}

		// Save answer
		const newAnswers = {
			...fieldAnswers,
			[currentField.name]: finalValue,
		};
		setFieldAnswers(newAnswers);
		setError(null);

		// Move to next field or complete
		if (currentFieldIndex < selectedTemplate.fields.length - 1) {
			setCurrentFieldIndex(currentFieldIndex + 1);
			const nextField = selectedTemplate.fields[currentFieldIndex + 1];
			setCurrentValue(nextField?.default || '');
			setMultilineBuffer('');
		} else {
			// Build config and add server
			try {
				const serverConfig = selectedTemplate.buildConfig(newAnswers);
				setServers({...servers, [serverConfig.name]: serverConfig});
				// Reset for next server
				setSelectedTemplate(null);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setMultilineBuffer('');
				setMode('template-selection');
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to build configuration',
				);
			}
		}
	};

	useInput((input, key) => {
		// Handle Shift+Tab for going back
		if (key.shift && key.tab) {
			if (mode === 'field-input') {
				// In field input mode, check if we can go back to previous field
				if (currentFieldIndex > 0) {
					// Go back to previous field
					setCurrentFieldIndex(currentFieldIndex - 1);
					const prevField = selectedTemplate?.fields[currentFieldIndex - 1];
					setCurrentValue(
						fieldAnswers[prevField?.name || ''] || prevField?.default || '',
					);
					setMultilineBuffer('');
					setInputKey(prev => prev + 1); // Force remount to reset cursor position
					setError(null);
				} else {
					// At first field, go back to template selection
					setMode('template-selection');
					setSelectedTemplate(null);
					setCurrentFieldIndex(0);
					setFieldAnswers({});
					setCurrentValue('');
					setMultilineBuffer('');
					setError(null);
				}
			} else if (mode === 'template-selection') {
				// In template selection, go back to initial question
				setMode('ask-if-want-mcp');
			} else if (mode === 'ask-if-want-mcp') {
				// At root level, call parent's onBack
				if (onBack) {
					onBack();
				}
			}
			return;
		}

		if (mode === 'field-input' && selectedTemplate) {
			const currentField = selectedTemplate.fields[currentFieldIndex];
			const isMultiline = currentField?.name === 'envVars';

			if (isMultiline) {
				// Handle multiline input
				if (key.return) {
					// Add newline to buffer
					setMultilineBuffer(multilineBuffer + '\n');
				} else if (key.escape) {
					// Submit multiline input on Escape
					handleFieldSubmit();
				} else if (!key.ctrl && !key.meta && input) {
					setMultilineBuffer(multilineBuffer + input);
				}
			} else {
				if (key.return) {
					handleFieldSubmit();
				} else if (key.escape) {
					// Go back to template selection
					setMode('template-selection');
					setSelectedTemplate(null);
					setCurrentFieldIndex(0);
					setFieldAnswers({});
					setCurrentValue('');
					setMultilineBuffer('');
					setError(null);
				}
			}
		}
	});

	if (mode === 'ask-if-want-mcp') {
		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold>
						Would you like to add MCP servers? MCP servers extend Nanocoder
						with additional tools.
					</Text>
				</Box>
				{Object.keys(servers).length > 0 && (
					<Box marginBottom={1}>
						<Text color="green">
							{Object.keys(servers).length} server(s) already added
						</Text>
					</Box>
				)}
				<SelectInput items={initialOptions} onSelect={handleInitialSelect as any} />
			</Box>
		);
	}

	if (mode === 'template-selection') {
		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold>Choose MCP servers to add:</Text>
				</Box>
				{Object.keys(servers).length > 0 && (
					<Box marginBottom={1}>
						<Text color="green">
							Added: {Object.keys(servers).join(', ')}
						</Text>
					</Box>
				)}
				<SelectInput items={templateOptions} onSelect={handleTemplateSelect as any} />
				<Box marginTop={1}>
					<Text dimColor>Press Esc to go back</Text>
				</Box>
			</Box>
		);
	}

	if (mode === 'field-input' && selectedTemplate) {
		const currentField = selectedTemplate.fields[currentFieldIndex];
		if (!currentField) return null;

		const isMultiline = currentField.name === 'envVars';

		return (
			<Box flexDirection="column" paddingX={2} paddingY={1}>
				<Box marginBottom={1}>
					<Text bold>{selectedTemplate.name} MCP Configuration</Text>
					<Text dimColor>
						{' '}
						(Field {currentFieldIndex + 1}/{selectedTemplate.fields.length})
					</Text>
				</Box>

				<Box marginBottom={1}>
					<Text>
						{currentField.prompt}
						{currentField.required && <Text color="red"> *</Text>}
						{currentField.default && (
							<Text dimColor> [{currentField.default}]</Text>
						)}
						:
					</Text>
				</Box>

				{isMultiline ? (
					<Box flexDirection="column" marginBottom={1}>
						<Box borderStyle="single" borderColor="gray" paddingX={1}>
							<Text>{multilineBuffer || <Text dimColor>(empty)</Text>}</Text>
						</Box>
						<Box marginTop={1}>
							<Text dimColor>
								Type to add lines. Press Esc when done to submit.
							</Text>
						</Box>
					</Box>
				) : currentField.sensitive ? (
					<Box marginBottom={1}>
						<TextInput
							key={inputKey}
							value={currentValue}
							onChange={setCurrentValue}
							onSubmit={handleFieldSubmit}
							mask="*"
						/>
					</Box>
				) : (
					<Box marginBottom={1}>
						<TextInput
							key={inputKey}
							value={currentValue}
							onChange={setCurrentValue}
							onSubmit={handleFieldSubmit}
						/>
					</Box>
				)}

				{error && (
					<Box marginBottom={1}>
						<Text color="red">Error: {error}</Text>
					</Box>
				)}

				<Box>
					<Text dimColor>
						{isMultiline
							? 'Press Esc to submit | Ctrl+C to cancel'
							: 'Press Enter to continue | Esc to cancel'}
					</Text>
				</Box>
			</Box>
		);
	}

	return null;
}
