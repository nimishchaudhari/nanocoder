import {Box, Text, useFocus, useInput} from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import SelectInput from 'ink-select-input';
import {useMemo, useState} from 'react';
import {TitledBoxWithPreferences} from '@/components/ui/titled-box';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {useTheme} from '@/hooks/useTheme';
import {getTitleShape, updateTitleShape} from '@/config/preferences';
import type {TitleShape} from '@/components/ui/styled-title';

interface TitleShapeOption {
	label: string;
	value: TitleShape;
}

interface TitleShapeSelectorProps {
	onComplete: (shape: TitleShape) => void;
	onCancel: () => void;
}

export default function TitleShapeSelector({
	onComplete,
	onCancel,
}: TitleShapeSelectorProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	
	// Get current title shape from preferences
	const currentShape = getTitleShape() || 'pill';
	const [originalShape] = useState<TitleShape>(currentShape);
	
	// Auto-focus to ensure keyboard navigation works
	useFocus({autoFocus: true, id: 'title-shape-selector'});
	
	// Handle escape key to cancel
	useInput((_, key) => {
		if (key.escape) {
			// Restore original shape on cancel
			updateTitleShape(originalShape);
			onCancel();
		}
	});

	// Create title shape options
	const shapeOptions: TitleShapeOption[] = [
		{label: 'Rounded (╭─╮)', value: 'rounded'},
		{label: 'Square (┌─┐)', value: 'square'},
		{label: 'Double (╔─╗)', value: 'double'},
		{label: 'Pill (smooth)', value: 'pill'},
		{label: 'Powerline Angled ( )', value: 'powerline-angled'},
		{label: 'Powerline Curved ( )', value: 'powerline-curved'},
		{label: 'Powerline Flame ( )', value: 'powerline-flame'},
		{label: 'Powerline Block ( )', value: 'powerline-block'},
		{label: 'Arrow Left (← →)', value: 'arrow-left'},
		{label: 'Arrow Right (→ ←)', value: 'arrow-right'},
		{label: 'Arrow Double (« »)', value: 'arrow-double'},
		{label: 'Angled Box (╱ ╲)', value: 'angled-box'},
	];

	// Find index of current shape for initial selection
	const initialIndex = useMemo(() => {
		const index = shapeOptions.findIndex(
			option => option.value === originalShape,
		);
		return index >= 0 ? index : 0;
	}, [originalShape, shapeOptions]);

	const [_currentIndex, _setCurrentIndex] = useState(initialIndex);

	const handleSelect = (item: TitleShapeOption) => {
		updateTitleShape(item.value);
		onComplete(item.value);
	};

	// Handle shape preview during navigation
	const handleHighlight = (item: TitleShapeOption) => {
		// Update the shape temporarily for preview
		updateTitleShape(item.value);
	};

	// Get the display name for current shape
	const getCurrentShapeName = () => {
		const currentOption = shapeOptions.find(option => option.value === currentShape);
		return currentOption ? currentOption.label : 'Unknown';
	};

	return (
		<>
			<Gradient colors={[colors.primary, colors.tool]}>
				<BigText text="Title Shapes" font="tiny" />
			</Gradient>

			{/* Live Demo Title - updates as user navigates */}
			<Box marginBottom={1}>
				<TitledBoxWithPreferences
					title="✻ Demo Title - Watch Me Change! ✻"
					reversePowerline={true}
					width={boxWidth}
					borderColor={colors.primary}
					paddingX={2}
					paddingY={1}
				>
					<Box>
						<Text color={colors.secondary}>
							This title shape updates in real-time as you navigate the options below!
						</Text>
					</Box>
				</TitledBoxWithPreferences>
			</Box>

			<TitledBoxWithPreferences
				title="✻ Choose your preferred title shape! ✻"
				reversePowerline={true}
				width={boxWidth}
				borderColor={colors.primary}
				paddingX={2}
				paddingY={1}
				flexDirection="column"
				marginBottom={1}
			>
				<Box paddingBottom={1}>
					<Text color={colors.white}>Tips for getting started:</Text>
				</Box>
				<Box paddingBottom={1} flexDirection="column">
					<Text color={colors.secondary}>
						1. Use arrow keys to navigate through the shape options.
					</Text>
					<Text color={colors.secondary}>
						2. Watch the demo title above update in real-time as you navigate!
					</Text>
					<Text color={colors.secondary}>
						3. Press Enter to select your preferred shape.
					</Text>
					<Text color={colors.secondary}>
						4. Press Esc to cancel and keep your current shape.
					</Text>
					<Text color={colors.secondary}>
						5. The CLI will remember your choice for all title boxes.
					</Text>
				</Box>
				<Text color={colors.white}>/help for help</Text>
			</TitledBoxWithPreferences>
			<Box
				borderStyle="round"
				width={boxWidth}
				borderColor={colors.primary}
				paddingX={2}
				paddingY={1}
				marginBottom={1}
			>
				<Box flexDirection="column">
					<Box marginBottom={1}>
						<Text color={colors.secondary}>
							Select a title shape (current: {getCurrentShapeName()})
						</Text>
					</Box>

					<Box marginBottom={1}>
						<Text color={colors.secondary}>
							↑/↓ Navigate • Enter Select • Esc Cancel
						</Text>
					</Box>

					<Box marginBottom={1}>
						<Text color={colors.secondary}>
							👆 Watch the demo title above change as you navigate! 👆
						</Text>
					</Box>

					<SelectInput
						items={shapeOptions}
						onSelect={handleSelect}
						onHighlight={handleHighlight}
					/>
				</Box>
			</Box>
		</>
	);
}