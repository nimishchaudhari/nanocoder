import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useTheme} from '../hooks/useTheme.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {themes} from '../config/themes.js';
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
	const {colors, currentTheme, setCurrentTheme} = useTheme();
	const [originalTheme] = useState(currentTheme); // Store original theme for restore on cancel
	const [currentIndex, setCurrentIndex] = useState(0);

	// Handle escape key to cancel
	useInput((_, key) => {
		if (key.escape) {
			// Restore original theme on cancel
			setCurrentTheme(originalTheme);
			onCancel();
		}
	});

	// Create theme options from available themes
	const themeOptions: ThemeOption[] = Object.values(themes).map(theme => ({
		label: theme.displayName + (theme.name === originalTheme ? ' (current)' : ''),
		value: theme.name as ThemePreset,
	}));

	// Find index of current theme for initial selection
	useEffect(() => {
		const index = themeOptions.findIndex(option => option.value === originalTheme);
		setCurrentIndex(index >= 0 ? index : 0);
	}, []);

	const handleSelect = (item: ThemeOption) => {
		onThemeSelect(item.value);
	};

	// Custom SelectInput with preview on navigation
	const CustomSelectInput = () => {
		useInput((_, key) => {
			if (key.upArrow) {
				const newIndex = currentIndex > 0 ? currentIndex - 1 : themeOptions.length - 1;
				setCurrentIndex(newIndex);
				setCurrentTheme(themeOptions[newIndex].value);
			} else if (key.downArrow) {
				const newIndex = currentIndex < themeOptions.length - 1 ? currentIndex + 1 : 0;
				setCurrentIndex(newIndex);
				setCurrentTheme(themeOptions[newIndex].value);
			} else if (key.return) {
				handleSelect(themeOptions[currentIndex]);
			}
		});

		return (
			<Box flexDirection="column">
				{themeOptions.map((option, index) => (
					<Box key={option.value} flexDirection="row" alignItems="center">
						<Text color={index === currentIndex ? colors.primary : colors.secondary}>
							{index === currentIndex ? '▶' : ' '}
						</Text>
						<Box marginLeft={1}>
							<Text color={index === currentIndex ? colors.primary : colors.white}>
								{option.label}
							</Text>
						</Box>
					</Box>
				))}
			</Box>
		);
	};

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
					<Text color={colors.info}>
						The entire CLI will change as you navigate. Try it out!
					</Text>
				</Box>
				
				<CustomSelectInput />
			</Box>
		</TitledBox>
	);
}