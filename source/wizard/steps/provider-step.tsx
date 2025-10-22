import {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type {ProviderConfig} from '../../types/config';
import {
	PROVIDER_TEMPLATES,
	type ProviderTemplate,
} from '../templates/provider-templates';
import {colors} from '@/config/index';

interface ProviderStepProps {
	onComplete: (providers: ProviderConfig[]) => void;
	onBack?: () => void;
	existingProviders?: ProviderConfig[];
}

type Mode =
	| 'select-template-or-custom'
	| 'template-selection'
	| 'field-input'
	| 'done';

interface TemplateOption {
	label: string;
	value: string;
}

export function ProviderStep({
	onComplete,
	onBack,
	existingProviders = [],
}: ProviderStepProps) {
	const [providers, setProviders] =
		useState<ProviderConfig[]>(existingProviders);

	// Update providers when existingProviders prop changes
	useEffect(() => {
		setProviders(existingProviders);
	}, [existingProviders]);

	const [mode, setMode] = useState<Mode>('select-template-or-custom');
	const [selectedTemplate, setSelectedTemplate] =
		useState<ProviderTemplate | null>(null);
	const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
	const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({});
	const [currentValue, setCurrentValue] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [inputKey, setInputKey] = useState(0);
	const [cameFromCustom, setCameFromCustom] = useState(false);

	const initialOptions = [
		{label: 'Yes - Choose from common templates', value: 'templates'},
		{label: 'No - Add custom provider manually', value: 'custom'},
		{label: 'Skip - Configure later', value: 'skip'},
	];

	const templateOptions: TemplateOption[] = [
		...PROVIDER_TEMPLATES.map((template, index) => ({
			label: `${index + 1}. ${template.name}`,
			value: template.id,
		})),
		{
			label: `Done adding providers`,
			value: 'done',
		},
	];

	const handleInitialSelect = (item: {value: string}) => {
		if (item.value === 'templates') {
			setMode('template-selection');
			setCameFromCustom(false);
		} else if (item.value === 'custom') {
			// Find custom template
			const customTemplate = PROVIDER_TEMPLATES.find(t => t.id === 'custom');
			if (customTemplate) {
				setSelectedTemplate(customTemplate);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setMode('field-input');
				setCameFromCustom(true);
			}
		} else {
			// Skip
			onComplete(providers);
		}
	};

	const handleTemplateSelect = (item: TemplateOption) => {
		if (item.value === 'done') {
			onComplete(providers);
			return;
		}

		const template = PROVIDER_TEMPLATES.find(t => t.id === item.value);
		if (template) {
			setSelectedTemplate(template);
			setCurrentFieldIndex(0);
			setFieldAnswers({});
			setCurrentValue(template.fields[0]?.default || '');
			setError(null);
			setMode('field-input');
			setCameFromCustom(false);
		}
	};

	const handleFieldSubmit = () => {
		if (!selectedTemplate) return;

		const currentField = selectedTemplate.fields[currentFieldIndex];
		if (!currentField) return;

		// Validate required fields
		if (currentField.required && !currentValue.trim()) {
			setError('This field is required');
			return;
		}

		// Validate with custom validator
		if (currentField.validator && currentValue.trim()) {
			const validationError = currentField.validator(currentValue);
			if (validationError) {
				setError(validationError);
				return;
			}
		}

		// Save answer
		const newAnswers = {
			...fieldAnswers,
			[currentField.name]: currentValue.trim(),
		};
		setFieldAnswers(newAnswers);
		setError(null);

		// Move to next field or complete
		if (currentFieldIndex < selectedTemplate.fields.length - 1) {
			setCurrentFieldIndex(currentFieldIndex + 1);
			const nextField = selectedTemplate.fields[currentFieldIndex + 1];
			setCurrentValue(nextField?.default || '');
		} else {
			// Build config and add provider
			try {
				const providerConfig = selectedTemplate.buildConfig(newAnswers);
				setProviders([...providers, providerConfig]);
				// Reset for next provider
				setSelectedTemplate(null);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setMode('template-selection');
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to build configuration',
				);
			}
		}
	};

	useInput((_input, key) => {
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
					setInputKey(prev => prev + 1); // Force remount to reset cursor position
					setError(null);
				} else {
					// At first field, go back based on where we came from
					if (cameFromCustom) {
						// Came from custom selection, go back to initial choice
						setMode('select-template-or-custom');
					} else {
						// Came from template selection, go back there
						setMode('template-selection');
					}
					setSelectedTemplate(null);
					setCurrentFieldIndex(0);
					setFieldAnswers({});
					setCurrentValue('');
					setError(null);
				}
			} else if (mode === 'template-selection') {
				// In template selection, go back to initial choice
				setMode('select-template-or-custom');
			} else if (mode === 'select-template-or-custom') {
				// At root level, call parent's onBack
				if (onBack) {
					onBack();
				}
			}
			return;
		}

		if (mode === 'field-input') {
			if (key.return) {
				handleFieldSubmit();
			} else if (key.escape) {
				// Go back to template selection
				setMode('template-selection');
				setSelectedTemplate(null);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setError(null);
			}
		}
	});

	if (mode === 'select-template-or-custom') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.primary}>
						Let's add AI providers. Would you like to use a template?
					</Text>
				</Box>
				{providers.length > 0 && (
					<Box marginBottom={1}>
						<Text color={colors.success}>
							{providers.length} provider(s) already added
						</Text>
					</Box>
				)}
				<SelectInput
					items={initialOptions}
					onSelect={handleInitialSelect as any}
				/>
			</Box>
		);
	}

	if (mode === 'template-selection') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.primary}>
						Choose a provider template:
					</Text>
				</Box>
				{providers.length > 0 && (
					<Box marginBottom={1}>
						<Text color={colors.success}>
							Added: {providers.map(p => p.name).join(', ')}
						</Text>
					</Box>
				)}
				<SelectInput
					items={templateOptions}
					onSelect={handleTemplateSelect as any}
				/>
			</Box>
		);
	}

	if (mode === 'field-input' && selectedTemplate) {
		const currentField = selectedTemplate.fields[currentFieldIndex];
		if (!currentField) return null;

		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.primary}>
						{selectedTemplate.name} Configuration
					</Text>
					<Text dimColor>
						{' '}
						(Field {currentFieldIndex + 1}/{selectedTemplate.fields.length})
					</Text>
				</Box>

				<Box>
					<Text>
						{currentField.prompt}
						{currentField.required && (
							<Text color={colors.error}> *</Text>
						)}: {currentField.sensitive && '****'}
					</Text>
				</Box>

				{!currentField.sensitive && (
					<Box
						marginBottom={1}
						borderStyle="round"
						borderColor={colors.secondary}
					>
						<TextInput
							key={inputKey}
							value={currentValue}
							onChange={setCurrentValue}
							onSubmit={handleFieldSubmit}
						/>
					</Box>
				)}

				{currentField.sensitive && (
					<Box
						marginBottom={1}
						borderStyle="round"
						borderColor={colors.secondary}
					>
						<TextInput
							key={inputKey}
							value={currentValue}
							onChange={setCurrentValue}
							onSubmit={handleFieldSubmit}
							mask="*"
						/>
					</Box>
				)}

				{error && (
					<Box marginBottom={1}>
						<Text color="red">{error}</Text>
					</Box>
				)}

				<Box>
					<Text color={colors.secondary}>
						Press Enter to continue | Shift+Tab to go back
					</Text>
				</Box>
			</Box>
		);
	}

	return null;
}
