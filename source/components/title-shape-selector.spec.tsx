import test from 'ava';
import React from 'react';
import TitleShapeSelector from './title-shape-selector';
import {updateTitleShape, getTitleShape} from '@/config/preferences';
import {renderWithTheme} from '@/test-utils/render-with-theme';

// Store original functions to restore later
let originalGetTitleShape: any;

test.before(() => {
	// Store original function
	originalGetTitleShape = (global as any).getTitleShape;
	
	// Mock the preferences to return a default shape
	(global as any).getTitleShape = () => 'pill';
});

test.after(() => {
	// Restore original function
	if (originalGetTitleShape !== undefined) {
		(global as any).getTitleShape = originalGetTitleShape;
	} else {
		delete (global as any).getTitleShape;
	}
});

test.serial('title-shape-selector: renders title shape selector with all shape options', (t) => {
	// Mock the preferences for this specific test
	const originalGetTitleShape = (global as any).getTitleShape;
	(global as any).getTitleShape = () => 'pill';

	try {
		const {frames, unmount} = renderWithTheme(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			})
		);

		// ink-testing-library returns frames which is an array of snapshots
		// The latest frame contains the current output
		const latestFrame = frames.at(-1) || '';
		
		// Should render the main title (BigText version)
		t.regex(latestFrame, /▀█▀ █ ▀█▀ █/);

		// Should render the main title in the box
		t.regex(latestFrame, /Choose your preferred title shape/);

		// Should render instructions
		t.regex(latestFrame, /Use arrow keys to navigate/);
		t.regex(latestFrame, /Press Enter to select/);
		t.regex(latestFrame, /Press Esc to cancel/);

		// Should render navigation instructions
		t.regex(latestFrame, /Navigate • Enter Select • Esc Cancel/);

		unmount();
	} finally {
		// Restore original function
		(global as any).getTitleShape = originalGetTitleShape;
	}
});

test.serial('title-shape-selector: shows current shape in the selection prompt', (t) => {
	// Mock the preferences to return a specific shape
	const originalGetTitleShape = (global as any).getTitleShape;
	(global as any).getTitleShape = () => 'powerline-angled';

	try {
		const {frames, unmount} = renderWithTheme(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			})
		);

		const latestFrame = frames.at(-1) || '';
		
		// Should show the current shape in the selection prompt
		// This regex is more flexible to handle environments with or without Nerd Fonts
		// It checks for the basic structure and either the actual Powerline characters or a fallback
		// Note: CI environments should have Nerd Fonts installed (see .github/workflows/pr-checks.yml)
		// but this test is designed to work even if they're not available
		t.regex(latestFrame, /Select a title shape \(current: Powerline Angled :- [\s\S]*?Demo Title[\s\S]*?\(Requires Nerd Fonts\)/);

		unmount();
	} finally {
		// Restore original function
		(global as any).getTitleShape = originalGetTitleShape;
	}
});

test.serial('title-shape-selector: renders all available title shapes', (t) => {
	// Mock the preferences to return a default shape
	const originalGetTitleShape = (global as any).getTitleShape;
	(global as any).getTitleShape = () => 'pill';

	try {
		const {frames, unmount} = renderWithTheme(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			})
		);

		const latestFrame = frames.at(-1) || '';
		
		// Should include all shape options in the SelectInput
		const shapeNames = [
			'Rounded',
			'Square',
			'Double',
			'Pill',
			'Arrow Left',
			'Arrow Right',
			'Arrow Double',
			'Angled Box',
			'Powerline Angled',
			'Powerline Angled Thin',
			'Powerline Block',
			'Powerline Block Alt',
			'Powerline Curved',
			'Powerline Curved Thin',
			'Powerline Flame',
			'Powerline Flame Thin',
			'Powerline Graph',
			'Powerline Ribbon',
			'Powerline Segment',
			'Powerline Segment Thin',
		];

		shapeNames.forEach((shapeName) => {
			t.regex(latestFrame, new RegExp(shapeName));
		});

		unmount();
	} finally {
		// Restore original function
		(global as any).getTitleShape = originalGetTitleShape;
	}
});

test.serial('title-shape-selector: has proper gradient header', (t) => {
	// Mock the preferences to return a default shape
	const originalGetTitleShape = (global as any).getTitleShape;
	(global as any).getTitleShape = () => 'pill';

	try {
		const {frames, unmount} = renderWithTheme(
			React.createElement(TitleShapeSelector, {
				onComplete: () => {},
				onCancel: () => {},
			})
		);

		const latestFrame = frames.at(-1) || '';
		
		// Should have the gradient header with "Title Shapes" (BigText version)
		t.regex(latestFrame, /▀█▀ █ ▀█▀ █/);

		unmount();
	} finally {
		// Restore original function
		(global as any).getTitleShape = originalGetTitleShape;
	}
});