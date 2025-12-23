import ModelSelector from './model-selector.js';
import type {LLMClient} from '../types/core.js';
import {renderWithTheme} from '../test-utils/render-with-theme.js';
import test from 'ava';
import React from 'react';

console.log('\nmodel-selector.spec.tsx');

// Mock LLM client
function createMockClient(models: string[]): LLMClient {
	return {
		getCurrentModel: () => 'test-model',
		setModel: () => {},
		getContextSize: () => 4096,
		getAvailableModels: async () => models,
		chat: async () => ({
			content: 'test response',
			toolCalls: [],
			choices: [],
		}),
		clearContext: async () => {},
	};
}

test('model-selector renders loading state initially', t => {
	const mockClient = createMockClient(['model1', 'model2']);
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: mockClient,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Loading available models/i);
});

test('model-selector shows error when client is null', async t => {
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: null,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /No active client found/i);
});

test('model-selector shows error when getAvailableModels throws', async t => {
	const errorClient: LLMClient = {
		getCurrentModel: () => 'test-model',
		setModel: () => {},
		getContextSize: () => 4096,
		getAvailableModels: async () => {
			throw new Error('Failed to fetch models');
		},
		chat: async () => ({
			content: 'test response',
			toolCalls: [],
			choices: [],
		}),
		clearContext: async () => {},
	};

	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: errorClient,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Error accessing models/i);
});

test('model-selector shows error when no models available', async t => {
	const emptyClient = createMockClient([]);
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: emptyClient,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /No models available/i);
});

test('model-selector renders model list after loading', async t => {
	const mockClient = createMockClient(['model1', 'model2', 'model3']);
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: mockClient,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect to complete
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Select a Model/i);
});

test('model-selector marks current model in list', async t => {
	const mockClient = createMockClient(['model1', 'model2', 'model3']);
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: mockClient,
			currentModel: 'model2',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /model2.*\(current\)/i);
});

test('model-selector shows cancel instruction', async t => {
	const mockClient = createMockClient(['model1', 'model2']);
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: mockClient,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Press Escape to cancel/i);
});

test('model-selector component renders without crashing', t => {
	const mockClient = createMockClient(['model1']);
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {unmount} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: mockClient,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	t.notThrows(() => unmount());
});

test('model-selector handles multiple models', async t => {
	const manyModels = Array.from({length: 10}, (_, i) => `model-${i + 1}`);
	const mockClient = createMockClient(manyModels);
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: mockClient,
			currentModel: 'model-1',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	// Should show model selector title
	t.regex(output!, /Select a Model/i);
});

test('model-selector error state shows helpful message', async t => {
	const onModelSelect = () => {};
	const onCancel = () => {};

	const {lastFrame} = renderWithTheme(
		React.createElement(ModelSelector, {
			client: null,
			currentModel: 'model1',
			onModelSelect,
			onCancel,
		}),
	);

	// Wait for async effect
	await new Promise(resolve => setTimeout(resolve, 100));

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Make sure your provider is properly configured/i);
});

test('model-selector accepts valid props', t => {
	const mockClient = createMockClient(['model1']);
	const onModelSelect = () => {};
	const onCancel = () => {};

	t.notThrows(() => {
		renderWithTheme(
			React.createElement(ModelSelector, {
				client: mockClient,
				currentModel: 'model1',
				onModelSelect,
				onCancel,
			}),
		);
	});
});
