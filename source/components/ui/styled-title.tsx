import type {BoxProps} from 'ink';
import {Box, Text} from 'ink';

export type TitleShape =
	| 'rounded'
	| 'square'
	| 'double'
	| 'pill'
	| 'arrow-left'
	| 'arrow-right'
	| 'arrow-double'
	| 'angled-box'
	| 'powerline-angled'
	| 'powerline-angled-thin'
	| 'powerline-block'
	| 'powerline-block-alt'
	| 'powerline-curved'
	| 'powerline-curved-thin'
	| 'powerline-flame'
	| 'powerline-flame-thin'
	| 'powerline-graph'
	| 'powerline-ribbon'
	| 'powerline-segment'
	| 'powerline-segment-thin';

export interface StyledTitleProps extends Omit<BoxProps, 'borderStyle'> {
	/** Title text to display */
	title: string;
	/** Shape style for the title */
	shape?: TitleShape;
	/** Border/background color */
	borderColor?: string;
	/** Text color */
	textColor?: string;
	/** Icon to display before title */
	icon?: string;
	/** Padding around title */
	padding?: number;
	/** Width of the title container */
	width?: number | string;
	/** Reverse powerline symbol order (right-left instead of left-right) */
	reversePowerline?: boolean;
}

// Shape character definitions with powerline and arrow symbols
const shapeCharacters = {
	rounded: {
		topLeft: '╭',
		topRight: '╮',
		bottomLeft: '╰',
		bottomRight: '╯',
		horizontal: '─',
		vertical: '│',
	},
	square: {
		topLeft: '┌',
		topRight: '┐',
		bottomLeft: '└',
		bottomRight: '┘',
		horizontal: '─',
		vertical: '│',
	},
	double: {
		topLeft: '╔',
		topRight: '╗',
		bottomLeft: '╚',
		bottomRight: '╝',
		horizontal: '═',
		vertical: '║',
	},
	pill: {
		topLeft: ' ',
		topRight: ' ',
		bottomLeft: ' ',
		bottomRight: ' ',
		horizontal: ' ',
		vertical: ' ',
	},
	'arrow-left': {
		left: '←',
		right: '→',
		horizontal: '─',
	},
	'arrow-right': {
		left: '→',
		right: '←',
		horizontal: '─',
	},
	'arrow-double': {
		left: '«',
		right: '»',
		horizontal: '═',
	},
	'angled-box': {
		topLeft: '╱',
		topRight: '╲',
		bottomLeft: '╲',
		bottomRight: '╱',
		horizontal: '─',
		vertical: '│',
	},
	'powerline-angled': {
		left: '', // U+E0B0
		right: '', // U+E0B2
	},
	'powerline-angled-thin': {
		left: '', // U+E0B1
		right: '', // U+E0B3
	},
	'powerline-curved': {
		left: '', // U+E0B4
		right: '', // U+E0B6
	},
	'powerline-curved-thin': {
		left: '', // U+E0B5
		right: '', // U+E0B7
	},
	'powerline-flame': {
		left: '', // U+E0C0
		right: '', // U+E0C2
	},
	'powerline-flame-thin': {
		left: '', // U+E0C1
		right: '', // U+E0C3
	},
	'powerline-block': {
		left: '', // U+E0BE
		right: '', // U+E0BC
	},
	'powerline-block-alt': {
		left: '', // U+E0B8
		right: '', // U+E0BA
	},
	'powerline-segment': {
		left: '', // U+E0C4
		right: '', // U+E0C5
	},
	'powerline-segment-thin': {
		left: '', // U+E0C6
		right: '', // U+E0C7
	},
	'powerline-graph': {
		left: '', // U+E0C8
		right: '', // U+E0CA
	},
	'powerline-ribbon': {
		left: '', // U+E0D2
		right: '', // U+E0D4
	},
};

/**
 * StyledTitle component that renders titles with various stylized shapes
 * Supports powerline symbols, arrows, and traditional box drawing characters
 */
export function StyledTitle({
	title,
	shape = 'rounded',
	borderColor,
	textColor = 'black',
	icon,
	padding = 1,
	width = 'auto',
	reversePowerline = false,
	...boxProps
}: StyledTitleProps) {
	const shapes = shapeCharacters[shape];

	// Fallback to rounded shape if unknown shape is provided
	const effectiveShapes = shapes || shapeCharacters.rounded;

	// Check if this is a powerline-style shape
	const isPowerlineShape = shape.startsWith('powerline-');

	// Check if this is an arrow shape
	const isArrowShape = shape.startsWith('arrow-');

	if (isPowerlineShape) {
		// Powerline-style rendering
		const powerlineShapes = effectiveShapes as {
			left: string;
			right: string;
		};

		// Determine symbol order based on reversePowerline prop
		const leftSymbol = reversePowerline
			? powerlineShapes.right
			: powerlineShapes.left;
		const rightSymbol = reversePowerline
			? powerlineShapes.left
			: powerlineShapes.right;

		return (
			<Box width={width} {...boxProps}>
				<Box>
					{icon && <Text>{icon} </Text>}
					<Text color={borderColor} bold>
						{leftSymbol}
					</Text>
					<Text backgroundColor={borderColor} color={textColor} bold>
						{' '}
						{title}{' '}
					</Text>
					<Text color={borderColor} bold>
						{rightSymbol}
					</Text>
				</Box>
			</Box>
		);
	}

	if (isArrowShape) {
		// Arrow-style rendering
		const arrowShapes = effectiveShapes as {
			left: string;
			right: string;
			horizontal: string;
		};

		return (
			<Box width={width} {...boxProps}>
				<Box>
					{icon && <Text>{icon} </Text>}
					<Text color={textColor} bold>
						{arrowShapes.left}
					</Text>
					<Text backgroundColor={borderColor} color={textColor} bold>
						{' '}
						{title}{' '}
					</Text>
					<Text color={textColor} bold>
						{arrowShapes.right}
					</Text>
				</Box>
			</Box>
		);
	}

	if (shape === 'pill') {
		// Pill-style rendering (original TitledBox style)
		return (
			<Box width={width} {...boxProps}>
				<Box>
					{icon && <Text>{icon} </Text>}
					<Text backgroundColor={borderColor} color={textColor} bold>
						{' '}
						{title}{' '}
					</Text>
				</Box>
			</Box>
		);
	}

	// Traditional box-style rendering (single line like powerline/arrow styles)
	const boxShapes = effectiveShapes as {
		topLeft: string;
		topRight: string;
		bottomLeft: string;
		bottomRight: string;
		horizontal: string;
		vertical: string;
	};

	return (
		<Box width={width} {...boxProps}>
			<Box>
				{icon && <Text>{icon} </Text>}
				<Text color={textColor} bold>
					{boxShapes.topLeft}
				</Text>
				<Text backgroundColor={borderColor} color={textColor} bold>
					{' '}
					{title}{' '}
				</Text>
				<Text color={textColor} bold>
					{boxShapes.topRight}
				</Text>
			</Box>
		</Box>
	);
}
