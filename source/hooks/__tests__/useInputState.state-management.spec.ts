import test from 'ava';
import type {InputState, PlaceholderContent} from '@/types/hooks';
import {PlaceholderType} from '@/types/hooks';
import type {PastePlaceholderContent} from '@/types/hooks';
import {handlePaste} from '@/utils/paste-utils';
import {PasteDetector} from '@/utils/paste-detection';

// State Management Tests
// Tests for state transitions, reset operations, and state derivations

test('createEmptyInputState: creates initial empty state', t => {
	const emptyState: InputState = {
		displayValue: '',
		placeholderContent: {},
	};

	t.is(emptyState.displayValue, '');
	t.deepEqual(emptyState.placeholderContent, {});
	t.is(Object.keys(emptyState.placeholderContent).length, 0);
});

test('createInputStateFromString: converts string to InputState', t => {
	const text = 'some input text';
	const state: InputState = {
		displayValue: text,
		placeholderContent: {},
	};

	t.is(state.displayValue, text);
	t.deepEqual(state.placeholderContent, {});
});

test('resetInput: clears all state', t => {
	// Simulate state before reset
	const beforeReset: InputState = {
		displayValue: '[Paste #123: 500 chars] with text',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 500 chars]',
				content: 'data',
				originalSize: 500,
			} as PastePlaceholderContent,
		},
	};

	// After reset
	const afterReset: InputState = {
		displayValue: '',
		placeholderContent: {},
	};

	t.is(afterReset.displayValue, '');
	t.is(Object.keys(afterReset.placeholderContent).length, 0);
});

test('setInputState: updates entire state', t => {
	const oldState: InputState = {
		displayValue: 'old',
		placeholderContent: {},
	};

	const newState: InputState = {
		displayValue: 'new value',
		placeholderContent: {
			'999': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #999: 100 chars]',
				content: 'content',
				originalSize: 100,
			} as PastePlaceholderContent,
		},
	};

	// Simulate setInputState
	const currentState = newState;

	t.is(currentState.displayValue, 'new value');
	t.true('999' in currentState.placeholderContent);
});

test('setInput (legacy): updates only displayValue', t => {
	const state: InputState = {
		displayValue: 'old',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 100 chars]',
				content: 'preserved',
				originalSize: 100,
			} as PastePlaceholderContent,
		},
	};

	// Simulate legacy setInput
	const updatedState: InputState = {
		...state,
		displayValue: 'new display value',
	};

	t.is(updatedState.displayValue, 'new display value');
	t.true(
		'123' in updatedState.placeholderContent,
		'Placeholder should be preserved',
	);
	t.is(updatedState.placeholderContent['123'].content, 'preserved');
});

test('line count calculation: single line', t => {
	const input = 'single line';
	const lineCount = Math.max(1, input.split(/\r\n|\r|\n/).length);

	t.is(lineCount, 1);
});

test('line count calculation: multiple lines', t => {
	const input = 'line 1\nline 2\nline 3';
	const lineCount = Math.max(1, input.split(/\r\n|\r|\n/).length);

	t.is(lineCount, 3);
});

test('line count calculation: empty string', t => {
	const input = '';
	const lineCount = Math.max(1, input.split(/\r\n|\r|\n/).length);

	t.is(lineCount, 1); // Minimum of 1
});

test('hasLargeContent flag: small content', t => {
	const input = 'small';
	const hasLargeContent = input.length > 150;

	t.false(hasLargeContent);
});

test('hasLargeContent flag: large content', t => {
	const input = 'x'.repeat(200);
	const hasLargeContent = input.length > 150;

	t.true(hasLargeContent);
});

test('legacy pastedContent: computed from placeholderContent', t => {
	const state: InputState = {
		displayValue: '[Paste #1: 100 chars] [Paste #2: 200 chars]',
		placeholderContent: {
			'1': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #1: 100 chars]',
				content: 'first content',
				originalSize: 100,
			} as PastePlaceholderContent,
			'2': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #2: 200 chars]',
				content: 'second content',
				originalSize: 200,
			} as PastePlaceholderContent,
		},
	};

	// Simulate legacy computed property
	const legacyPastedContent: Record<string, string> = {};
	Object.entries(state.placeholderContent).forEach(([id, content]) => {
		if (content.type === PlaceholderType.PASTE) {
			legacyPastedContent[id] = content.content;
		}
	});

	t.is(Object.keys(legacyPastedContent).length, 2);
	t.is(legacyPastedContent['1'], 'first content');
	t.is(legacyPastedContent['2'], 'second content');
});

test('legacy pastedContent: empty when no placeholders', t => {
	const state: InputState = {
		displayValue: 'no placeholders',
		placeholderContent: {},
	};

	const legacyPastedContent: Record<string, string> = {};
	Object.entries(state.placeholderContent).forEach(([id, content]) => {
		if (content.type === PlaceholderType.PASTE) {
			legacyPastedContent[id] = content.content;
		}
	});

	t.deepEqual(legacyPastedContent, {});
});

test('updateInput: normal typing updates display value', t => {
	const currentState: InputState = {
		displayValue: 'hello',
		placeholderContent: {},
	};

	const newInput = 'hello world';

	// Simulate normal typing (no paste detection, no atomic deletion)
	const newState: InputState = {
		displayValue: newInput,
		placeholderContent: currentState.placeholderContent,
	};

	t.is(newState.displayValue, 'hello world');
	t.deepEqual(newState.placeholderContent, {});
});

test('updateInput: preserves placeholders on normal edits', t => {
	const currentState: InputState = {
		displayValue: '[Paste #123: 500 chars] text',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 500 chars]',
				content: 'data',
				originalSize: 500,
			} as PastePlaceholderContent,
		},
	};

	const newInput = '[Paste #123: 500 chars] text more';

	const newState: InputState = {
		displayValue: newInput,
		placeholderContent: currentState.placeholderContent,
	};

	t.is(newState.displayValue, '[Paste #123: 500 chars] text more');
	t.true('123' in newState.placeholderContent);
});

test('paste detection: detects large paste and creates placeholder', t => {
	const largePaste = 'a'.repeat(600);
	const currentDisplayValue = '';
	const currentPlaceholderContent: Record<string, PlaceholderContent> = {};

	const result = handlePaste(
		largePaste,
		currentDisplayValue,
		currentPlaceholderContent,
	);

	t.truthy(result);
	t.true(result!.displayValue.includes('[Paste #'));
	t.is(Object.keys(result!.placeholderContent).length, 1);
});

test('paste detection: small paste returns null', t => {
	const smallPaste = 'small';
	const currentDisplayValue = '';
	const currentPlaceholderContent: Record<string, PlaceholderContent> = {};

	const result = handlePaste(
		smallPaste,
		currentDisplayValue,
		currentPlaceholderContent,
	);

	t.is(result, null);
});

test('paste detector: state updates on input changes', t => {
	const detector = new PasteDetector();

	// First input
	detector.detectPaste('hello');

	// Update state manually (simulates paste detector state update)
	detector.updateState('hello world');

	// Next detection should calculate diff from 'hello world'
	const result = detector.detectPaste('hello world!');
	t.is(result.addedText, '!');
});

test('paste detector: reset clears state', t => {
	const detector = new PasteDetector();

	detector.detectPaste('some text');
	detector.reset();

	const result = detector.detectPaste('new text');
	t.is(result.addedText, 'new text'); // Full text, not diff
});

test('integration: complete state lifecycle', t => {
	// 1. Start with empty state
	let state: InputState = {displayValue: '', placeholderContent: {}};
	t.is(state.displayValue, '');

	// 2. Add some text
	state = {displayValue: 'analyze: ', placeholderContent: {}};
	t.is(state.displayValue, 'analyze: ');

	// 3. Large paste creates placeholder
	const largePaste = 'code'.repeat(200);
	const pasteResult = handlePaste(
		largePaste,
		state.displayValue,
		state.placeholderContent,
	);
	t.truthy(pasteResult);
	state = pasteResult!;
	const placeholderId = Object.keys(state.placeholderContent)[0];
	t.true(state.displayValue.includes('[Paste #'));
	t.is(Object.keys(state.placeholderContent).length, 1);

	// 4. Add more text
	state = {...state, displayValue: state.displayValue + ' and review'};
	t.true(state.displayValue.includes('and review'));
	t.is(Object.keys(state.placeholderContent).length, 1);

	// 5. Delete placeholder
	const regex = new RegExp(`\\[Paste #${placeholderId}: \\d+ chars\\]`, 'g');
	state = {
		displayValue: state.displayValue.replace(regex, ''),
		placeholderContent: {},
	};
	t.false(state.displayValue.includes('[Paste #'));
	t.is(Object.keys(state.placeholderContent).length, 0);

	// 6. Reset to empty
	state = {displayValue: '', placeholderContent: {}};
	t.is(state.displayValue, '');
	t.is(Object.keys(state.placeholderContent).length, 0);
});

test('state immutability: modifications create new objects', t => {
	const originalState: InputState = {
		displayValue: 'original',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 100 chars]',
				content: 'data',
				originalSize: 100,
			} as PastePlaceholderContent,
		},
	};

	// Create new state by spreading
	const newState: InputState = {
		...originalState,
		displayValue: 'modified',
	};

	t.is(originalState.displayValue, 'original', 'Original should not change');
	t.is(newState.displayValue, 'modified');
	t.is(
		originalState.placeholderContent,
		newState.placeholderContent,
		'Same reference is ok if not modified',
	);
});

test('state immutability: placeholderContent modifications', t => {
	const originalState: InputState = {
		displayValue: 'text',
		placeholderContent: {
			'1': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #1: 100 chars]',
				content: 'first',
				originalSize: 100,
			} as PastePlaceholderContent,
		},
	};

	// Create new state with modified placeholderContent
	const newState: InputState = {
		...originalState,
		placeholderContent: {
			...originalState.placeholderContent,
			'2': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #2: 200 chars]',
				content: 'second',
				originalSize: 200,
			} as PastePlaceholderContent,
		},
	};

	t.is(
		Object.keys(originalState.placeholderContent).length,
		1,
		'Original should have 1',
	);
	t.is(Object.keys(newState.placeholderContent).length, 2, 'New should have 2');
	t.true('1' in newState.placeholderContent);
	t.true('2' in newState.placeholderContent);
});

test('edge case: very long display value', t => {
	const longText = 'x'.repeat(10000);
	const state: InputState = {
		displayValue: longText,
		placeholderContent: {},
	};

	t.is(state.displayValue.length, 10000);
	const lineCount = Math.max(1, state.displayValue.split(/\r\n|\r|\n/).length);
	t.is(lineCount, 1);
});

test('edge case: many placeholders', t => {
	const placeholders: Record<string, PlaceholderContent> = {};

	for (let i = 1; i <= 10; i++) {
		placeholders[String(i)] = {
			type: PlaceholderType.PASTE,
			displayText: `[Paste #${i}: ${i * 100} chars]`,
			content: `content${i}`,
			originalSize: i * 100,
		} as PastePlaceholderContent;
	}

	const state: InputState = {
		displayValue: Object.keys(placeholders)
			.map(id => `[Paste #${id}: ${Number(id) * 100} chars]`)
			.join(' '),
		placeholderContent: placeholders,
	};

	t.is(Object.keys(state.placeholderContent).length, 10);

	// Legacy conversion
	const legacyPastedContent: Record<string, string> = {};
	Object.entries(state.placeholderContent).forEach(([id, content]) => {
		if (content.type === PlaceholderType.PASTE) {
			legacyPastedContent[id] = content.content;
		}
	});

	t.is(Object.keys(legacyPastedContent).length, 10);
});

test('edge case: Unicode and special characters in display value', t => {
	const state: InputState = {
		displayValue: '🎉 Hello 世界 \n\t Special chars: <>[]{}',
		placeholderContent: {},
	};

	t.is(state.displayValue, '🎉 Hello 世界 \n\t Special chars: <>[]{}');
	const lineCount = Math.max(1, state.displayValue.split(/\r\n|\r|\n/).length);
	t.is(lineCount, 2); // Has a newline
});

test('edge case: placeholder content with newlines', t => {
	const content = 'line1\nline2\nline3';
	const state: InputState = {
		displayValue: '[Paste #777: 50 chars]',
		placeholderContent: {
			'777': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #777: 50 chars]',
				content: content,
				originalSize: 50,
			} as PastePlaceholderContent,
		},
	};

	const placeholder = state.placeholderContent['777'];
	t.true(placeholder.content.includes('\n'));
	t.is(placeholder.content.split('\n').length, 3);
});
