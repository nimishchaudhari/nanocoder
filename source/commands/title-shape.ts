import {Text} from 'ink';
import React from 'react';
import TitleShapeSelector from '@/components/title-shape-selector';
import {colors} from '@/config/index';
import {updateTitleShape} from '@/config/preferences';
import type {Command} from '@/types/index';

export const titleShapeCommand: Command = {
	name: 'title-shape',
	description: 'Select a title shape for Nanocoder UI components',
	handler: async (args: string[], _messages, _metadata) => {
		if (args.length === 0) {
			// Show interactive selector when no arguments provided
			return Promise.resolve(
				React.createElement(TitleShapeSelector, {
					onComplete: shape => {
						return React.createElement(
							Text,
							{color: colors.success},
							`Title shape set to: ${shape}`,
						);
					},
					onCancel: () => {
						return React.createElement(
							Text,
							{color: colors.info},
							'Title shape selection cancelled. Current shape retained.',
						);
					},
				}),
			);
		}

		// If a shape is provided as argument, set it directly
		const shape = args[0];
		const validShapes = [
			'rounded',
			'square',
			'double',
			'pill',
			'arrow-left',
			'arrow-right',
			'arrow-double',
			'angled-box',
			'powerline-angled',
			'powerline-angled-thin',
			'powerline-block',
			'powerline-block-alt',
			'powerline-curved',
			'powerline-curved-thin',
			'powerline-flame',
			'powerline-flame-thin',
			'powerline-graph',
			'powerline-ribbon',
			'powerline-segment',
			'powerline-segment-thin',
		];

		if (validShapes.includes(shape)) {
			updateTitleShape(shape);
			return Promise.resolve(
				React.createElement(
					Text,
					{color: colors.success},
					`Title shape set to: ${shape}`,
				),
			);
		} else {
			return Promise.resolve(
				React.createElement(
					Text,
					{color: colors.error},
					`Invalid shape: ${shape}. Available shapes: ${validShapes.join(', ')}`,
				),
			);
		}
	},
};
