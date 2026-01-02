import {Text} from 'ink';
import React from 'react';
import {colors} from '@/config/index';
import {updateTitleShape} from '@/config/preferences';
import type {Command} from '@/types/index';

export const titleShapeCommand: Command = {
	name: 'title-shape',
	description: 'Select a title shape for Nanocoder UI components',
	handler: async (args: string[], _messages, _metadata) => {
		if (args.length === 0) {
			const validShapes = [
				'rounded',
				'square',
				'double',
				'pill',
				'powerline-angled',
				'powerline-curved',
				'powerline-flame',
				'powerline-block',
				'arrow-left',
				'arrow-right',
				'arrow-double',
				'angled-box',
			];

			return Promise.resolve(
				React.createElement(
					Text,
					{color: colors.info},
					`Available title shapes: ${validShapes.join(', ')}. Use: /title-shape [shape-name]`,
				),
			);
		}

		// If a shape is provided as argument, set it directly
		const shape = args[0];
		const validShapes = [
			'rounded',
			'square',
			'double',
			'pill',
			'powerline-angled',
			'powerline-curved',
			'powerline-flame',
			'powerline-block',
			'arrow-left',
			'arrow-right',
			'arrow-double',
			'angled-box',
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
