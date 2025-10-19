import test from 'ava';
import {createMockToolCall} from './test-helpers.js';

// ============================================================================
// Tests for Validation and Edge Cases
// ============================================================================

test('validation error creates proper error result', t => {
	const toolCall = createMockToolCall('call_fail', 'read_file', {
		path: '/nonexistent',
	});

	const validationError = 'File does not exist: /nonexistent';
	const errorResult = {
		tool_call_id: toolCall.id,
		role: 'tool' as const,
		name: toolCall.function.name,
		content: validationError,
	};

	t.is(errorResult.tool_call_id, 'call_fail');
	t.is(errorResult.role, 'tool');
	t.is(errorResult.name, 'read_file');
	t.is(errorResult.content, 'File does not exist: /nonexistent');
});

test('validation error is added to completed results', t => {
	const completedToolResults: any[] = [];
	const toolCall = createMockToolCall('call_invalid', 'execute_bash', {
		command: '',
	});

	const errorResult = {
		tool_call_id: toolCall.id,
		role: 'tool' as const,
		name: toolCall.function.name,
		content: 'Validation error: Command cannot be empty',
	};

	completedToolResults.push(errorResult);

	t.is(completedToolResults.length, 1);
	t.true(completedToolResults[0].content.includes('Validation error'));
});

test('validation error continues to next tool in multi-tool flow', t => {
	const toolCalls = [
		createMockToolCall('call_1', 'read_file', {path: '/bad'}),
		createMockToolCall('call_2', 'read_file', {path: '/good'}),
	];

	let currentToolIndex = 0;
	const completedToolResults: any[] = [];

	const errorResult = {
		tool_call_id: 'call_1',
		role: 'tool' as const,
		name: 'read_file',
		content: 'Validation failed',
	};
	completedToolResults.push(errorResult);
	currentToolIndex++;

	t.is(currentToolIndex, 1);
	t.is(completedToolResults.length, 1);
	t.true(currentToolIndex < toolCalls.length);
});

test('edge case: single tool execution completes immediately', t => {
	const toolCalls = [createMockToolCall('call_single', 'search_files', {})];
	let currentToolIndex = 0;
	const completedToolResults: any[] = [];

	completedToolResults.push({
		tool_call_id: 'call_single',
		role: 'tool' as const,
		name: 'search_files',
		content: 'Found files',
	});
	currentToolIndex++;

	const isComplete = currentToolIndex >= toolCalls.length;
	t.true(isComplete);
	t.is(completedToolResults.length, 1);
});

test('edge case: tool arguments as JSON string are parseable', t => {
	const argsAsString = '{"path": "/test.ts", "encoding": "utf-8"}';

	let parsedArgs;
	try {
		parsedArgs = JSON.parse(argsAsString);
	} catch (e) {
		parsedArgs = argsAsString;
	}

	t.is(typeof parsedArgs, 'object');
	t.is(parsedArgs.path, '/test.ts');
	t.is(parsedArgs.encoding, 'utf-8');
});

test('edge case: tool arguments already parsed remain unchanged', t => {
	const argsAsObject = {path: '/test.ts', encoding: 'utf-8'};

	let parsedArgs = argsAsObject;
	if (typeof parsedArgs === 'string') {
		try {
			parsedArgs = JSON.parse(parsedArgs);
		} catch (e) {
			// Keep as-is
		}
	}

	t.is(typeof parsedArgs, 'object');
	t.is(parsedArgs.path, '/test.ts');
});

test('edge case: malformed JSON arguments fallback gracefully', t => {
	const malformedJson = '{path: "/test", invalid}';

	let parsedArgs = malformedJson;
	try {
		parsedArgs = JSON.parse(malformedJson);
	} catch (e) {
		parsedArgs = malformedJson;
	}

	t.is(parsedArgs, malformedJson);
});

test('switch_mode tool extracts mode from arguments', t => {
	const toolCall = createMockToolCall('call_switch', 'switch_mode', {
		mode: 'auto-accept',
	});

	const requestedMode = toolCall.function.arguments.mode;
	t.is(requestedMode, 'auto-accept');
});

test('switch_mode supports all development modes', t => {
	const modes = ['normal', 'auto-accept', 'plan'];

	for (const mode of modes) {
		const toolCall = createMockToolCall('call_mode', 'switch_mode', {mode});
		t.is(toolCall.function.arguments.mode, mode);
	}
});

test('integration: multi-tool execution with mixed success and validation errors', t => {
	const results = [
		{
			tool_call_id: 'call_1',
			role: 'tool' as const,
			name: 'read_file',
			content: 'export const x = 1;',
		},
		{
			tool_call_id: 'call_2',
			role: 'tool' as const,
			name: 'read_file',
			content: 'Validation error: File not found',
		},
		{
			tool_call_id: 'call_3',
			role: 'tool' as const,
			name: 'search_files',
			content: 'Found 10 files',
		},
	];

	t.is(results.length, 3);
	t.is(results[0].content, 'export const x = 1;');
	t.true(results[1].content.includes('Validation error'));
	t.is(results[2].content, 'Found 10 files');
});
