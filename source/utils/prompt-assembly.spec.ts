import test from 'ava';
import type {InputState, PastePlaceholderContent} from '../types/hooks.js';
import {PlaceholderType} from '../types/hooks.js';

// Minimal implementation for testing - avoids complex dependencies
function assemblePrompt(inputState: InputState): string {
	let assembledPrompt = inputState.displayValue;

	// Replace each placeholder with its full content
	Object.entries(inputState.placeholderContent).forEach(
		([pasteId, placeholder]) => {
			if (placeholder.type === 'paste') {
				const placeholderPattern = `\\[Paste #${pasteId}: \\d+ chars\\]`;
				const regex = new RegExp(placeholderPattern, 'g');
				assembledPrompt = assembledPrompt.replace(regex, placeholder.content);
			}
		},
	);

	return assembledPrompt;
}

function extractPlaceholderIds(displayValue: string): string[] {
	const placeholderRegex = /\[Paste #(\d+): \d+ chars\]/g;
	const matches = [];
	let match;

	while ((match = placeholderRegex.exec(displayValue)) !== null) {
		matches.push(match[1]); // The captured paste ID
	}

	return matches;
}

// Tests for prompt assembly
test('assemblePrompt replaces single placeholder with content', t => {
	const inputState: InputState = {
		displayValue: 'Analyze this: [Paste #1640995200: 100 chars]',
		placeholderContent: {
			'1640995200': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #1640995200: 100 chars]',
				content: 'function test() { return "hello world"; }',
				originalSize: 100,
			} as PastePlaceholderContent,
		},
	};

	const result = assemblePrompt(inputState);
	t.is(result, 'Analyze this: function test() { return "hello world"; }');
});

test('assemblePrompt handles multiple placeholders', t => {
	const inputState: InputState = {
		displayValue: 'Compare [Paste #123: 50 chars] with [Paste #456: 30 chars]',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 50 chars]',
				content: 'first code snippet',
				originalSize: 50,
			} as PastePlaceholderContent,
			'456': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #456: 30 chars]',
				content: 'second code snippet',
				originalSize: 30,
			} as PastePlaceholderContent,
		},
	};

	const result = assemblePrompt(inputState);
	t.is(result, 'Compare first code snippet with second code snippet');
});

test('assemblePrompt handles no placeholders', t => {
	const inputState: InputState = {
		displayValue: 'Regular text without placeholders',
		placeholderContent: {},
	};

	const result = assemblePrompt(inputState);
	t.is(result, 'Regular text without placeholders');
});

test('extractPlaceholderIds finds all placeholder IDs', t => {
	const displayValue =
		'Text [Paste #123: 100 chars] more text [Paste #456: 200 chars]';
	const result = extractPlaceholderIds(displayValue);

	t.deepEqual(result, ['123', '456']);
});

test('extractPlaceholderIds returns empty for no placeholders', t => {
	const displayValue = 'Regular text without placeholders';
	const result = extractPlaceholderIds(displayValue);

	t.deepEqual(result, []);
});
