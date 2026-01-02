import type {BoxProps} from 'ink';
import {Box, Text} from 'ink';
import React from 'react';
import {StyledTitle, type TitleShape} from './styled-title';

export interface TitledBoxProps extends Omit<BoxProps, 'borderStyle'> {
	/** Title to display in the top border */
	title: string;
	/** Border color */
	borderColor?: string;
	/** Shape style for the title */
	shape?: TitleShape;
	/** Icon to display before title */
	icon?: string;
	/** Reverse powerline symbol order (right-left instead of left-right) */
	reversePowerline?: boolean;
	/** Children to render inside the box */
	children: React.ReactNode;
}

/**
 * A simple titled box component that displays a title with stylized shapes
 * above a bordered box. Replacement for @mishieck/ink-titled-box.
 */
export function TitledBox({
	title,
	borderColor,
	shape = 'pill',
	icon,
	reversePowerline = false,
	children,
	width,
	paddingX,
	paddingY,
	flexDirection,
	marginBottom,
	...boxProps
}: TitledBoxProps) {
	return (
		<Box
			flexDirection="column"
			width={width}
			marginBottom={marginBottom}
			{...boxProps}
		>
			{/* Title row with stylized shape */}
			<StyledTitle
				title={title}
				shape={shape}
				borderColor={borderColor}
				textColor="black"
				icon={icon}
				reversePowerline={reversePowerline}
				width={width}
			/>

			{/* Content box with border */}
			<Box
				borderStyle="round"
				borderColor={borderColor}
				paddingX={paddingX}
				paddingY={paddingY}
				flexDirection={flexDirection}
				width={width}
			>
				{children}
			</Box>
		</Box>
	);
}
