import test from 'ava';
import type {InputState} from '@/types/hooks';
import {PlaceholderType} from '@/types/hooks';
import type {PastePlaceholderContent} from '@/types/hooks';

// Undo/Redo Stack Logic Tests
// These tests verify the undo/redo stack behavior that the hook implements

// Helper to simulate pushing to undo stack
function pushToUndoStack(
	undoStack: InputState[],
	redoStack: InputState[],
	currentState: InputState,
	newState: InputState,
): {
	newUndoStack: InputState[];
	newRedoStack: InputState[];
	newCurrentState: InputState;
} {
	return {
		newUndoStack: [...undoStack, currentState],
		newRedoStack: [], // Clear redo stack on new action
		newCurrentState: newState,
	};
}

// Helper to simulate undo
function performUndo(
	undoStack: InputState[],
	redoStack: InputState[],
	currentState: InputState,
): {
	newUndoStack: InputState[];
	newRedoStack: InputState[];
	newCurrentState: InputState;
} | null {
	if (undoStack.length === 0) {
		return null;
	}

	const previousState = undoStack[undoStack.length - 1];
	const newUndoStack = undoStack.slice(0, -1);

	return {
		newUndoStack,
		newRedoStack: [...redoStack, currentState],
		newCurrentState: previousState,
	};
}

// Helper to simulate redo
function performRedo(
	undoStack: InputState[],
	redoStack: InputState[],
	currentState: InputState,
): {
	newUndoStack: InputState[];
	newRedoStack: InputState[];
	newCurrentState: InputState;
} | null {
	if (redoStack.length === 0) {
		return null;
	}

	const nextState = redoStack[redoStack.length - 1];
	const newRedoStack = redoStack.slice(0, -1);

	return {
		newUndoStack: [...undoStack, currentState],
		newRedoStack,
		newCurrentState: nextState,
	};
}

test('undo stack: pushing new state adds current to undo stack', t => {
	const undoStack: InputState[] = [];
	const redoStack: InputState[] = [];
	const currentState: InputState = {
		displayValue: 'first',
		placeholderContent: {},
	};
	const newState: InputState = {displayValue: 'second', placeholderContent: {}};

	const result = pushToUndoStack(undoStack, redoStack, currentState, newState);

	t.is(result.newUndoStack.length, 1);
	t.is(result.newUndoStack[0].displayValue, 'first');
	t.is(result.newCurrentState.displayValue, 'second');
	t.is(result.newRedoStack.length, 0); // Redo stack cleared
});

test('undo stack: new change clears redo stack', t => {
	const undoStack: InputState[] = [
		{displayValue: 'old', placeholderContent: {}},
	];
	const redoStack: InputState[] = [
		{displayValue: 'future1', placeholderContent: {}},
		{displayValue: 'future2', placeholderContent: {}},
	];
	const currentState: InputState = {
		displayValue: 'current',
		placeholderContent: {},
	};
	const newState: InputState = {displayValue: 'new', placeholderContent: {}};

	const result = pushToUndoStack(undoStack, redoStack, currentState, newState);

	t.is(result.newRedoStack.length, 0, 'Redo stack should be cleared');
});

test('undo: returns null when undo stack is empty', t => {
	const undoStack: InputState[] = [];
	const redoStack: InputState[] = [];
	const currentState: InputState = {
		displayValue: 'current',
		placeholderContent: {},
	};

	const result = performUndo(undoStack, redoStack, currentState);

	t.is(result, null);
});

test('undo: pops from undo stack and pushes current to redo stack', t => {
	const state1: InputState = {displayValue: 'first', placeholderContent: {}};
	const state2: InputState = {displayValue: 'second', placeholderContent: {}};
	const currentState: InputState = {
		displayValue: 'third',
		placeholderContent: {},
	};

	const undoStack: InputState[] = [state1, state2];
	const redoStack: InputState[] = [];

	const result = performUndo(undoStack, redoStack, currentState);

	t.truthy(result);
	t.is(result!.newUndoStack.length, 1);
	t.is(result!.newUndoStack[0].displayValue, 'first');
	t.is(result!.newCurrentState.displayValue, 'second');
	t.is(result!.newRedoStack.length, 1);
	t.is(result!.newRedoStack[0].displayValue, 'third');
});

test('redo: returns null when redo stack is empty', t => {
	const undoStack: InputState[] = [
		{displayValue: 'old', placeholderContent: {}},
	];
	const redoStack: InputState[] = [];
	const currentState: InputState = {
		displayValue: 'current',
		placeholderContent: {},
	};

	const result = performRedo(undoStack, redoStack, currentState);

	t.is(result, null);
});

test('redo: pops from redo stack and pushes current to undo stack', t => {
	const currentState: InputState = {
		displayValue: 'current',
		placeholderContent: {},
	};
	const nextState: InputState = {displayValue: 'next', placeholderContent: {}};

	const undoStack: InputState[] = [
		{displayValue: 'old', placeholderContent: {}},
	];
	const redoStack: InputState[] = [nextState];

	const result = performRedo(undoStack, redoStack, currentState);

	t.truthy(result);
	t.is(result!.newRedoStack.length, 0);
	t.is(result!.newCurrentState.displayValue, 'next');
	t.is(result!.newUndoStack.length, 2);
	t.is(result!.newUndoStack[1].displayValue, 'current');
});

test('undo preserves placeholder content', t => {
	const stateWithPlaceholder: InputState = {
		displayValue: '[Paste #123: 100 chars]',
		placeholderContent: {
			'123': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #123: 100 chars]',
				content: 'large content here',
				originalSize: 100,
			} as PastePlaceholderContent,
		},
	};

	const currentState: InputState = {
		displayValue: 'changed',
		placeholderContent: {},
	};
	const undoStack: InputState[] = [stateWithPlaceholder];
	const redoStack: InputState[] = [];

	const result = performUndo(undoStack, redoStack, currentState);

	t.truthy(result);
	t.is(Object.keys(result!.newCurrentState.placeholderContent).length, 1);
	t.true('123' in result!.newCurrentState.placeholderContent);
});

test('redo preserves placeholder content', t => {
	const stateWithPlaceholder: InputState = {
		displayValue: '[Paste #456: 200 chars]',
		placeholderContent: {
			'456': {
				type: PlaceholderType.PASTE,
				displayText: '[Paste #456: 200 chars]',
				content: 'restored content',
				originalSize: 200,
			} as PastePlaceholderContent,
		},
	};

	const currentState: InputState = {
		displayValue: 'current',
		placeholderContent: {},
	};
	const undoStack: InputState[] = [];
	const redoStack: InputState[] = [stateWithPlaceholder];

	const result = performRedo(undoStack, redoStack, currentState);

	t.truthy(result);
	t.is(Object.keys(result!.newCurrentState.placeholderContent).length, 1);
	t.true('456' in result!.newCurrentState.placeholderContent);
});

test('integration: multiple undo/redo operations', t => {
	const states = [
		{displayValue: 'state1', placeholderContent: {}},
		{displayValue: 'state2', placeholderContent: {}},
		{displayValue: 'state3', placeholderContent: {}},
	];

	// Start at state3 with state1 and state2 in undo stack
	let undoStack: InputState[] = [states[0], states[1]];
	let redoStack: InputState[] = [];
	let currentState: InputState = states[2];

	// Undo to state2
	let result = performUndo(undoStack, redoStack, currentState);
	t.truthy(result);
	undoStack = result!.newUndoStack;
	redoStack = result!.newRedoStack;
	currentState = result!.newCurrentState;
	t.is(currentState.displayValue, 'state2');

	// Undo to state1
	result = performUndo(undoStack, redoStack, currentState);
	t.truthy(result);
	undoStack = result!.newUndoStack;
	redoStack = result!.newRedoStack;
	currentState = result!.newCurrentState;
	t.is(currentState.displayValue, 'state1');

	// Redo to state2
	result = performRedo(undoStack, redoStack, currentState);
	t.truthy(result);
	undoStack = result!.newUndoStack;
	redoStack = result!.newRedoStack;
	currentState = result!.newCurrentState;
	t.is(currentState.displayValue, 'state2');

	// Redo to state3
	result = performRedo(undoStack, redoStack, currentState);
	t.truthy(result);
	currentState = result!.newCurrentState;
	t.is(currentState.displayValue, 'state3');
});

test('integration: new change after undo clears redo path', t => {
	const state1: InputState = {displayValue: 'first', placeholderContent: {}};
	const state2: InputState = {displayValue: 'second', placeholderContent: {}};
	const state3: InputState = {displayValue: 'third', placeholderContent: {}};

	// Start at state3
	let undoStack: InputState[] = [state1, state2];
	let redoStack: InputState[] = [];
	let currentState: InputState = state3;

	// Undo to state2
	const undoResult = performUndo(undoStack, redoStack, currentState);
	t.truthy(undoResult);
	undoStack = undoResult!.newUndoStack;
	redoStack = undoResult!.newRedoStack;
	currentState = undoResult!.newCurrentState;

	t.is(redoStack.length, 1, 'Should have state3 in redo stack');

	// Make new change
	const newState: InputState = {
		displayValue: 'alternate',
		placeholderContent: {},
	};
	const pushResult = pushToUndoStack(
		undoStack,
		redoStack,
		currentState,
		newState,
	);
	undoStack = pushResult.newUndoStack;
	redoStack = pushResult.newRedoStack;
	currentState = pushResult.newCurrentState;

	t.is(redoStack.length, 0, 'Redo stack should be cleared');
	t.is(currentState.displayValue, 'alternate');
});

test('edge case: undo/redo with empty initial state', t => {
	const emptyState: InputState = {displayValue: '', placeholderContent: {}};
	const filledState: InputState = {
		displayValue: 'text',
		placeholderContent: {},
	};

	// Start with filled state, empty in undo stack
	let undoStack: InputState[] = [emptyState];
	let redoStack: InputState[] = [];
	let currentState: InputState = filledState;

	// Undo to empty
	const undoResult = performUndo(undoStack, redoStack, currentState);
	t.truthy(undoResult);
	currentState = undoResult!.newCurrentState;
	t.is(currentState.displayValue, '');

	// Redo back to filled
	const redoResult = performRedo(
		undoResult!.newUndoStack,
		undoResult!.newRedoStack,
		currentState,
	);
	t.truthy(redoResult);
	t.is(redoResult!.newCurrentState.displayValue, 'text');
});

test('edge case: multiple placeholders in undo/redo', t => {
	const stateWithTwoPlaceholders: InputState = {
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

	const currentState: InputState = {
		displayValue: 'no placeholders',
		placeholderContent: {},
	};
	const undoStack: InputState[] = [stateWithTwoPlaceholders];
	const redoStack: InputState[] = [];

	const result = performUndo(undoStack, redoStack, currentState);

	t.truthy(result);
	t.is(Object.keys(result!.newCurrentState.placeholderContent).length, 2);
	t.true('1' in result!.newCurrentState.placeholderContent);
	t.true('2' in result!.newCurrentState.placeholderContent);
});
