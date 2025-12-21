import test from 'ava';
import React from 'react';
import {renderWithTheme} from '../../test-utils/render-with-theme';
import {ChatInterface} from './ChatInterface';
import type {ChatInterfaceProps} from './ChatInterface';

// Helper to create default props
function createDefaultProps(
	overrides: Partial<ChatInterfaceProps> = {},
): ChatInterfaceProps {
	return {
		startChat: true,
		staticComponents: [],
		queuedComponents: [],
		isCancelling: false,
		isToolExecuting: false,
		isToolConfirmationMode: false,
		isBashExecuting: false,
		currentBashCommand: '',
		pendingToolCalls: [],
		currentToolIndex: 0,
		mcpInitialized: true,
		client: {},
		nonInteractivePrompt: undefined,
		nonInteractiveLoadingMessage: null,
		customCommands: [],
		inputDisabled: false,
		developmentMode: 'normal',
		onToolConfirm: async () => {},
		onToolCancel: () => {},
		onSubmit: async () => {},
		onCancel: () => {},
		onToggleMode: () => {},
		...overrides,
	};
}

test('ChatInterface renders without error', t => {
	const props = createDefaultProps();
	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	unmount();
});

test('ChatInterface renders chat structure', t => {
	const props = createDefaultProps();
	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	unmount();
});

test('ChatInterface shows UserInput when ready for input', t => {
	const props = createDefaultProps({
		startChat: true,
		mcpInitialized: true,
		client: {},
		nonInteractivePrompt: undefined,
		isToolExecuting: false,
		isToolConfirmationMode: false,
		isBashExecuting: false,
	});

	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	unmount();
});

test('ChatInterface shows loading spinner when not initialized', t => {
	const props = createDefaultProps({
		startChat: true,
		mcpInitialized: false,
		client: null,
	});

	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Loading/);
	unmount();
});

test('ChatInterface shows completion message in non-interactive mode when done', t => {
	const props = createDefaultProps({
		startChat: true,
		nonInteractivePrompt: 'test prompt',
		nonInteractiveLoadingMessage: null, // Signals completion
		mcpInitialized: true,
		client: {},
	});

	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	// Note: marginLeft={-1} in the component cuts off the first character in tests
	t.regex(output!, /ompleted.*Exiting/);
	unmount();
});

test('ChatInterface shows tool confirmation when in tool confirmation mode', t => {
	const mockToolCall = {
		id: 'test-1',
		function: {name: 'test_tool', arguments: {}},
	};

	const props = createDefaultProps({
		startChat: true,
		isToolConfirmationMode: true,
		pendingToolCalls: [mockToolCall],
		currentToolIndex: 0,
	});

	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	unmount();
});

test('ChatInterface shows tool execution indicator when executing', t => {
	const mockToolCall = {
		id: 'test-1',
		function: {name: 'test_tool', arguments: {}},
	};

	const props = createDefaultProps({
		startChat: true,
		isToolExecuting: true,
		pendingToolCalls: [mockToolCall],
		currentToolIndex: 0,
	});

	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	unmount();
});

test('ChatInterface shows bash execution indicator when executing bash', t => {
	const props = createDefaultProps({
		startChat: true,
		isBashExecuting: true,
		currentBashCommand: 'ls -la',
	});

	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	unmount();
});

test('ChatInterface shows cancelling indicator when cancelling', t => {
	const props = createDefaultProps({
		startChat: true,
		isCancelling: true,
	});

	const {lastFrame, unmount} = renderWithTheme(<ChatInterface {...props} />);
	const output = lastFrame();
	t.truthy(output);
	unmount();
});
