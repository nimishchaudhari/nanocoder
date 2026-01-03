import test from 'ava';
import {render} from 'ink-testing-library';
import React from 'react';
import TitleShapeSelector from './title-shape-selector';
import {updateTitleShape} from '@/config/preferences';

console.log('\ntitle-shape-selector.spec.tsx');

test('title-shape-selector: renders title shape selector with all shape options', (t) => {
		const {getByText, container} = render(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			}),
		);

		// Should render the main title
		t.regex(container.textContent, /Choose your preferred title shape/);

		// Should render instructions
		t.regex(container.textContent, /Use arrow keys to navigate/);
		t.regex(container.textContent, /Press Enter to select/);
		t.regex(container.textContent, /Press Esc to cancel/);

		// Should render navigation instructions
		t.regex(container.textContent, /↑\/↓ Navigate • Enter Select • Esc Cancel/);

		// Should render preview instruction
		t.regex(container.textContent, /Preview the shape above as you navigate/);
	});

test('title-shape-selector: shows current shape in the selection prompt', (t) => {
		// Set a specific shape first
		updateTitleShape('powerline-angled');

		const {container} = render(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			}),
		);

		// Should show the current shape
		t.regex(container.textContent, /current: Powerline Angled :-  Demo Title  \(Requires Nerd Fonts\)/);
	});

test('title-shape-selector: renders all available title shapes', (t) => {
		const {container} = render(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			}),
		);

		// Should include all shape options
		const shapeNames = [
			'Rounded',
			'Square',
			'Double',
			'Pill',
			'Powerline Angled',
			'Powerline Angled Thin',
			'Powerline Curved',
			'Powerline Curved Thin',
			'Powerline Flame',
			'Powerline Flame Thin',
			'Powerline Block',
			'Powerline Block Thin',
			'Powerline Segment',
			'Powerline Segment Thin',
			'Powerline Rect',
			'Powerline Rect Thin',
			'Powerline Graph',
			'Powerline Block Alt',
			'Arrow Left',
			'Arrow Right',
			'Arrow Double',
			'Angled Box',
		];

		shapeNames.forEach((shapeName) => {
			t.regex(container.textContent, new RegExp(shapeName));
		});
	});

test('title-shape-selector: has proper gradient header', (t) => {
		const {container} = render(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			}),
		);

		// Should have the gradient header
		t.regex(container.textContent, /Title Shapes/);
	});
