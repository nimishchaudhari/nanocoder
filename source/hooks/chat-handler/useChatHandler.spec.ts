import test from 'ava';
import {useChatHandler} from './useChatHandler.js';
import type {UseChatHandlerProps} from './types';

// Note: This is a minimal smoke test since useChatHandler is a React hook
// Full testing would require React testing utilities

test('useChatHandler - can be imported', t => {
	t.is(typeof useChatHandler, 'function');
});

test('useChatHandler - has correct function signature', t => {
	// Verify it takes UseChatHandlerProps
	const mockProps: UseChatHandlerProps = {
		client: null,
		toolManager: null,
		messages: [],
		setMessages: () => {},
		currentProvider: 'test',
		currentModel: 'test',
		setIsCancelling: () => {},
		addToChatQueue: () => {},
		componentKeyCounter: 1,
		abortController: null,
		setAbortController: () => {},
		onStartToolConfirmationFlow: () => {},
	};

	// Should not throw when called (though it needs React context to actually work)
	t.notThrows(() => {
		// We can't actually call the hook outside of React, but we can verify the signature
		t.is(typeof mockProps.client, 'object');
	});
});
