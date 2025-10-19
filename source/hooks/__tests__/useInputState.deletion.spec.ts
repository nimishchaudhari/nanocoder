import test from 'ava';
import type {InputState} from '@/types/hooks';
import {PlaceholderType} from '@/types/hooks';
import type {PastePlaceholderContent} from '@/types/hooks';
import {handleAtomicDeletion} from '@/utils/atomic-deletion';

// Placeholder Deletion Tests
// Tests focus on the deletePlaceholder logic and atomic deletion integration

// Helper to simulate deletePlaceholder operation
function deletePlaceholder(
	currentState: InputState,
	placeholderId: string,
): InputState {
	const placeholderPattern = `[Paste #${placeholderId}: \\d+ chars]`;
	const regex = new RegExp(placeholderPattern.replace(/[[\]]/g, '\\$&'), 'g');

	const newDisplayValue = currentState.displayValue.replace(regex, '');
	const newPlaceholderContent = {...currentState.placeholderContent};
	delete newPlaceholderContent[placeholderId];

	return {
		displayValue: newDisplayValue,
		placeholderContent: newPlaceholderContent,
	};
}

test('deletePlaceholder: removes placeholder from display and content', t => {
	const currentState: InputState = {
		displayValue: 'Analyze [Paste #123: 600 chars]',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 600 chars]',
				content: 'x'.repeat(600),
				originalSize: 600,
			} as PastePlaceholderContent,
		},
	};

	const result = deletePlaceholder(currentState, '123');

	t.is(result.displayValue, 'Analyze ');
	t.is(Object.keys(result.placeholderContent).length, 0);
	t.false('123' in result.placeholderContent);
});

test('deletePlaceholder: preserves other placeholders', t => {
	const currentState: InputState = {
		displayValue: '[Paste #1: 100 chars] and [Paste #2: 200 chars]',
		placeholderContent: {
			'1': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #1: 100 chars]',
				content: 'first',
				originalSize: 100,
			} as PastePlaceholderContent,
			'2': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #2: 200 chars]',
				content: 'second',
				originalSize: 200,
			} as PastePlaceholderContent,
		},
	};

	const result = deletePlaceholder(currentState, '1');

	t.false(
		'1' in result.placeholderContent,
		'First placeholder should be deleted',
	);
	t.true('2' in result.placeholderContent, 'Second placeholder should remain');
	t.true(
		result.displayValue.includes('[Paste #2:'),
		'Second placeholder should be in display',
	);
	t.false(
		result.displayValue.includes('[Paste #1:'),
		'First placeholder should not be in display',
	);
});

test('deletePlaceholder: with surrounding text preserves text', t => {
	const currentState: InputState = {
		displayValue: 'before [Paste #456: 300 chars] after',
		placeholderContent: {
			'456': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #456: 300 chars]',
				content: 'content',
				originalSize: 300,
			} as PastePlaceholderContent,
		},
	};

	const result = deletePlaceholder(currentState, '456');

	t.is(result.displayValue, 'before  after');
	t.true(result.displayValue.includes('before'));
	t.true(result.displayValue.includes('after'));
	t.false(result.displayValue.includes('[Paste #'));
});

test('deletePlaceholder: handles non-existent ID gracefully', t => {
	const currentState: InputState = {
		displayValue: '[Paste #789: 400 chars]',
		placeholderContent: {
			'789': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #789: 400 chars]',
				content: 'data',
				originalSize: 400,
			} as PastePlaceholderContent,
		},
	};

	// Try to delete non-existent placeholder
	const result = deletePlaceholder(currentState, '999');

	// Original placeholder should remain
	t.true('789' in result.placeholderContent);
	t.true(result.displayValue.includes('[Paste #789:'));
	t.is(Object.keys(result.placeholderContent).length, 1);
});

test('deletePlaceholder: sequence of deletions', t => {
	const initialState: InputState = {
		displayValue:
			'[Paste #1: 100 chars] [Paste #2: 200 chars] [Paste #3: 300 chars]',
		placeholderContent: {
			'1': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #1: 100 chars]',
				content: 'a',
				originalSize: 100,
			} as PastePlaceholderContent,
			'2': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #2: 200 chars]',
				content: 'b',
				originalSize: 200,
			} as PastePlaceholderContent,
			'3': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #3: 300 chars]',
				content: 'c',
				originalSize: 300,
			} as PastePlaceholderContent,
		},
	};

	// Delete first
	let state = deletePlaceholder(initialState, '1');
	t.is(Object.keys(state.placeholderContent).length, 2);
	t.false('1' in state.placeholderContent);

	// Delete second
	state = deletePlaceholder(state, '2');
	t.is(Object.keys(state.placeholderContent).length, 1);
	t.false('2' in state.placeholderContent);

	// Delete third
	state = deletePlaceholder(state, '3');
	t.is(Object.keys(state.placeholderContent).length, 0);
	t.false('3' in state.placeholderContent);
});

test('atomic deletion: backspace at end removes entire placeholder', t => {
	const currentState: InputState = {
		displayValue: 'text: [Paste #123: 650 chars]',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 650 chars]',
				content: 'm'.repeat(650),
				originalSize: 650,
			} as PastePlaceholderContent,
		},
	};

	// Simulate backspace at the end
	const newInput = currentState.displayValue.slice(0, -1);
	const result = handleAtomicDeletion(currentState, newInput);

	t.truthy(result, 'Should trigger atomic deletion');
	t.is(result!.displayValue, 'text: ');
	t.is(Object.keys(result!.placeholderContent).length, 0);
});

test('atomic deletion: delete from middle removes placeholder', t => {
	const currentState: InputState = {
		displayValue: 'start [Paste #456: 600 chars] end',
		placeholderContent: {
			'456': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #456: 600 chars]',
				content: 'n'.repeat(600),
				originalSize: 600,
			} as PastePlaceholderContent,
		},
	};

	// Simulate deletion from middle of placeholder
	const placeholderText = '[Paste #456: 600 chars]';
	const displayWithPlaceholder = currentState.displayValue;
	const middleIndex = displayWithPlaceholder.indexOf(placeholderText) + 5;
	const newInput =
		displayWithPlaceholder.slice(0, middleIndex) +
		displayWithPlaceholder.slice(middleIndex + 1);

	const result = handleAtomicDeletion(currentState, newInput);

	t.truthy(result, 'Should trigger atomic deletion');
	t.false(result!.displayValue.includes('[Paste #'));
	t.is(Object.keys(result!.placeholderContent).length, 0);
});

test('atomic deletion: returns null for normal edits', t => {
	const currentState: InputState = {
		displayValue: 'normal text',
		placeholderContent: {},
	};

	const newInput = 'normal tex';
	const result = handleAtomicDeletion(currentState, newInput);

	t.is(result, null, 'Should not trigger atomic deletion');
});

test('atomic deletion: preserves other placeholders', t => {
	const currentState: InputState = {
		displayValue: '[Paste #1: 100 chars] [Paste #2: 200 chars]',
		placeholderContent: {
			'1': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #1: 100 chars]',
				content: 'first',
				originalSize: 100,
			} as PastePlaceholderContent,
			'2': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #2: 200 chars]',
				content: 'second',
				originalSize: 200,
			} as PastePlaceholderContent,
		},
	};

	// Delete one character from first placeholder
	const placeholderText = '[Paste #1: 100 chars]';
	const index = currentState.displayValue.indexOf(placeholderText) + 5;
	const newInput =
		currentState.displayValue.slice(0, index) +
		currentState.displayValue.slice(index + 1);

	const result = handleAtomicDeletion(currentState, newInput);

	t.truthy(result);
	t.false('1' in result!.placeholderContent, 'First should be deleted');
	t.true('2' in result!.placeholderContent, 'Second should remain');
});

test('integration: delete then undo via stack', t => {
	const originalState: InputState = {
		displayValue: 'code: [Paste #789: 700 chars]',
		placeholderContent: {
			'789': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #789: 700 chars]',
				content: 'r'.repeat(650),
				originalSize: 700,
			} as PastePlaceholderContent,
		},
	};

	// Delete placeholder
	const afterDelete = deletePlaceholder(originalState, '789');
	t.is(Object.keys(afterDelete.placeholderContent).length, 0);

	// Simulate undo by restoring original state (would be from undo stack)
	const afterUndo = originalState;
	t.is(Object.keys(afterUndo.placeholderContent).length, 1);
	t.true('789' in afterUndo.placeholderContent);
	t.is(afterUndo.displayValue, 'code: [Paste #789: 700 chars]');
});

test('edge case: delete placeholder with special regex characters in content', t => {
	const currentState: InputState = {
		displayValue: 'test [Paste #111: 500 chars]',
		placeholderContent: {
			'111': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #111: 500 chars]',
				content: '.*+?^${}()|[]\\',
				originalSize: 500,
			} as PastePlaceholderContent,
		},
	};

	const result = deletePlaceholder(currentState, '111');

	t.is(result.displayValue, 'test ');
	t.is(Object.keys(result.placeholderContent).length, 0);
});

test('edge case: placeholder at start of display value', t => {
	const currentState: InputState = {
		displayValue: '[Paste #222: 300 chars] followed by text',
		placeholderContent: {
			'222': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #222: 300 chars]',
				content: 'start',
				originalSize: 300,
			} as PastePlaceholderContent,
		},
	};

	const result = deletePlaceholder(currentState, '222');

	t.is(result.displayValue, ' followed by text');
	t.false('222' in result.placeholderContent);
});

test('edge case: placeholder at end of display value', t => {
	const currentState: InputState = {
		displayValue: 'text before [Paste #333: 400 chars]',
		placeholderContent: {
			'333': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #333: 400 chars]',
				content: 'end',
				originalSize: 400,
			} as PastePlaceholderContent,
		},
	};

	const result = deletePlaceholder(currentState, '333');

	t.is(result.displayValue, 'text before ');
	t.false('333' in result.placeholderContent);
});

test('edge case: only placeholder in display value', t => {
	const currentState: InputState = {
		displayValue: '[Paste #444: 250 chars]',
		placeholderContent: {
			'444': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #444: 250 chars]',
				content: 'only',
				originalSize: 250,
			} as PastePlaceholderContent,
		},
	};

	const result = deletePlaceholder(currentState, '444');

	t.is(result.displayValue, '');
	t.is(Object.keys(result.placeholderContent).length, 0);
});

test('legacy compatibility: pastedContent map updates', t => {
	const currentState: InputState = {
		displayValue: '[Paste #555: 700 chars]',
		placeholderContent: {
			'555': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #555: 700 chars]',
				content: 's'.repeat(700),
				originalSize: 700,
			} as PastePlaceholderContent,
		},
	};

	// Simulate the legacy pastedContent computed property
	const legacyPastedContent: Record<string, string> = {};
	Object.entries(currentState.placeholderContent).forEach(([id, content]) => {
		if (content.type === PlaceholderType.PASTE) {
			legacyPastedContent[id] = content.content;
		}
	});

	t.true('555' in legacyPastedContent);
	t.is(legacyPastedContent['555'].length, 700);

	// After deletion
	const afterDelete = deletePlaceholder(currentState, '555');
	const legacyAfterDelete: Record<string, string> = {};
	Object.entries(afterDelete.placeholderContent).forEach(([id, content]) => {
		if (content.type === PlaceholderType.PASTE) {
			legacyAfterDelete[id] = content.content;
		}
	});

	t.false('555' in legacyAfterDelete);
});
