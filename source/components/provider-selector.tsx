import {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {colors} from '../config/index.js';
import {ProviderType} from '../types/core.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';

interface ProviderSelectorProps {
	currentProvider: ProviderType;
	onProviderSelect: (provider: ProviderType) => void;
	onCancel: () => void;
}

interface ProviderOption {
	label: string;
	value: ProviderType;
}

export default function ProviderSelector({
	currentProvider,
	onProviderSelect,
	onCancel,
}: ProviderSelectorProps) {
	const boxWidth = useTerminalWidth();
	const [providers] = useState<ProviderOption[]>([
		{
			label: `OpenRouter${
				currentProvider === 'openrouter' ? ' (current)' : ''
			}`,
			value: 'openrouter',
		},
		{
			label: `llama.cpp${
				currentProvider === 'llama-cpp' ? ' (current)' : ''
			}`,
			value: 'llama-cpp',
		},
		{
			label: `OpenAI Compatible${
				currentProvider === 'openai-compatible' ? ' (current)' : ''
			}`,
			value: 'openai-compatible',
		},
	]);

	// Handle escape key to cancel
	useInput((_, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	const handleSelect = (item: ProviderOption) => {
		onProviderSelect(item.value);
	};

	return (
		<TitledBox
			borderStyle="round"
			titles={['Select a Provider']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
		>
			<Box flexDirection="column">
				<SelectInput items={providers} onSelect={handleSelect} />
				<Box marginTop={1}>
					<Text color={colors.secondary}>Press Escape to cancel</Text>
				</Box>
			</Box>
		</TitledBox>
	);
}
