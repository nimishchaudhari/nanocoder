import test from 'ava';
import React from 'react';
import type {Message} from '@/types/index';
import {clearCommand} from './clear';
import {exitCommand} from './exit';
import {modelCommand} from './model';
import {providerCommand} from './provider';
import {statusCommand} from './status';
import {themeCommand} from './theme';

// Test metadata
const testMetadata = {
	provider: 'test',
	model: 'test-model',
	tokens: 100,
	getMessageTokens: (m: Message) => 0,
};

const testMessages: Message[] = [];

// ============================================================================
// Tests for clear command
// ============================================================================

test('clearCommand - has correct name and description', t => {
	t.is(clearCommand.name, 'clear');
	t.is(clearCommand.description, 'Clear the chat history and model context');
});

test('clearCommand - handler returns React element', async t => {
	const result = await clearCommand.handler([], testMessages, testMetadata);

	// SuccessMessage is wrapped in memo() so just check it's a valid React element
	t.truthy(React.isValidElement(result));
});

test('clearCommand - handler ignores arguments', async t => {
	const result1 = await clearCommand.handler([], testMessages, testMetadata);
	const result2 = await clearCommand.handler(['arg1', 'arg2'], testMessages, testMetadata);

	t.truthy(React.isValidElement(result1));
	t.truthy(React.isValidElement(result2));
});

// ============================================================================
// Tests for exit command
// ============================================================================

test('exitCommand - has correct name and description', t => {
	t.is(exitCommand.name, 'exit');
	t.is(exitCommand.description, 'Exit the application');
});

test('exitCommand - handler returns InfoMessage component', async t => {
	// Stub process.exit to prevent actual exit during test
	const originalExit = process.exit;
	process.exit = (() => {
		throw new Error('process.exit called');
	}) as typeof process.exit;

	try {
		const result = await exitCommand.handler([], testMessages, testMetadata);

		// Should return InfoMessage first
		t.truthy(React.isValidElement(result));
	} finally {
		process.exit = originalExit;
	}
});

test('exitCommand - handler ignores arguments', async t => {
	const originalExit = process.exit;
	process.exit = (() => {
		throw new Error('process.exit called');
	}) as typeof process.exit;

	try {
		const result = await exitCommand.handler(['arg1'], testMessages, testMetadata);
		t.truthy(React.isValidElement(result));
	} finally {
		process.exit = originalExit;
	}
});

// ============================================================================
// Tests for model command
// ============================================================================

test('modelCommand - has correct name and description', t => {
	t.is(modelCommand.name, 'model');
	t.is(modelCommand.description, 'Select a model for the current provider');
});

test('modelCommand - handler returns empty fragment', async t => {
	const result = await modelCommand.handler([], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
	const element = result as React.ReactElement;
	t.is(element.type, React.Fragment);
});

test('modelCommand - handler ignores all parameters', async t => {
	const result = await modelCommand.handler(['arg1', 'arg2'], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
});

// ============================================================================
// Tests for provider command
// ============================================================================

test('providerCommand - has correct name and description', t => {
	t.is(providerCommand.name, 'provider');
	t.is(providerCommand.description, 'Switch between AI providers');
});

test('providerCommand - handler returns empty fragment', async t => {
	const result = await providerCommand.handler([], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
	const element = result as React.ReactElement;
	t.is(element.type, React.Fragment);
});

test('providerCommand - handler ignores all parameters', async t => {
	const result = await providerCommand.handler(['arg1', 'arg2'], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
});

// ============================================================================
// Tests for status command
// ============================================================================

test('statusCommand - has correct name and description', t => {
	t.is(statusCommand.name, 'status');
	t.is(statusCommand.description, 'Display current status (provider, model, theme)');
});

test('statusCommand - handler returns empty fragment', async t => {
	const result = await statusCommand.handler([], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
	const element = result as React.ReactElement;
	t.is(element.type, React.Fragment);
});

test('statusCommand - handler ignores all parameters', async t => {
	const result = await statusCommand.handler(['arg1', 'arg2'], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
});

// ============================================================================
// Tests for theme command
// ============================================================================

test('themeCommand - has correct name and description', t => {
	t.is(themeCommand.name, 'theme');
	t.is(themeCommand.description, 'Select a theme for the Nanocoder CLI');
});

test('themeCommand - handler returns empty fragment', async t => {
	const result = await themeCommand.handler([], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
	const element = result as React.ReactElement;
	t.is(element.type, React.Fragment);
});

test('themeCommand - handler ignores all parameters', async t => {
	const result = await themeCommand.handler(['arg1', 'arg2'], testMessages, testMetadata);

	t.truthy(React.isValidElement(result));
});
