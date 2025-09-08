import React from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {colors} from '../config/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {themes} from '../config/themes.js';
import {loadPreferences} from '../config/preferences.js';
import type {ThemePreset} from '../types/ui.js';

interface ThemeSelectorProps {
	onThemeSelect: (theme: ThemePreset) => void;
	onCancel: () => void;
}

interface ThemeOption {
	label: string;
	value: ThemePreset;
}

export default function ThemeSelector({
	onThemeSelect,
	onCancel,
}: ThemeSelectorProps) {
	const boxWidth = useTerminalWidth();
	const preferences = loadPreferences();
	const currentTheme = preferences.selectedTheme || 'tokyo-night';

	// Handle escape key to cancel
	useInput((_, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	// Create theme options from available themes
	const themeOptions: ThemeOption[] = Object.values(themes).map(theme => ({
		label: theme.displayName + (theme.name === currentTheme ? ' (current)' : ''),
		value: theme.name as ThemePreset,
	}));

	const handleSelect = (item: ThemeOption) => {
		onThemeSelect(item.value);
	};

	// Create preview boxes for each theme
	const renderPreviewBox = (theme: typeof themes[ThemePreset]) => (
		<Box key={theme.name} flexDirection="row" marginY={0} gap={1}>
			<Box width={3} height={1} borderStyle="single" borderColor={theme.colors.primary}>
				<Text color={theme.colors.primary}>■</Text>
			</Box>
			<Box width={3} height={1} borderStyle="single" borderColor={theme.colors.tool}>
				<Text color={theme.colors.tool}>■</Text>
			</Box>
			<Box width={3} height={1} borderStyle="single" borderColor={theme.colors.success}>
				<Text color={theme.colors.success}>■</Text>
			</Box>
			<Box width={3} height={1} borderStyle="single" borderColor={theme.colors.error}>
				<Text color={theme.colors.error}>■</Text>
			</Box>
		</Box>
	);

	return (
		<TitledBox
			borderStyle="round"
			titles={['Theme Selection']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
		>
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text color={colors.secondary}>
						Select a theme (current: {themes[currentTheme].displayName})
					</Text>
				</Box>
				
				<Box marginBottom={1}>
					<Text color={colors.secondary}>
						↑/↓ Navigate • Enter Select • Esc Cancel
					</Text>
				</Box>
				
				<Box marginBottom={1}>
					<Text color={colors.info}>Preview:</Text>
				</Box>
				
				<Box flexDirection="column" marginBottom={1}>
					{Object.values(themes).slice(0, 3).map(renderPreviewBox)}
				</Box>
				
				<SelectInput items={themeOptions} onSelect={handleSelect} />
			</Box>
		</TitledBox>
	);
}