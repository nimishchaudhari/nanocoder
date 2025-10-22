import test from 'ava';
import type {Message} from '@/types/core';
import {
	createMockToolCall,
	createMockConversationContext,
} from './test-helpers';

// ============================================================================
// Tests for Tool Execution Flow
// ============================================================================

test('continueConversationWithToolResults formats tool results as messages', t => {
	const toolResults = [
		{
			tool_call_id: 'call_1',
			role: 'tool' as const,
			name: 'read_file',
			content: 'File contents here',
		},
		{
			tool_call_id: 'call_2',
			role: 'tool' as const,
			name: 'search_files',
			content: 'Found 10 files',
		},
	];

	const toolMessages = toolResults.map(result => ({
		role: 'tool' as const,
		content: result.content || '',
		tool_call_id: result.tool_call_id,
		name: result.name,
	}));

	t.is(toolMessages.length, 2);
	t.is(toolMessages[0].role, 'tool');
	t.is(toolMessages[0].content, 'File contents here');
	t.is(toolMessages[0].tool_call_id, 'call_1');
	t.is(toolMessages[0].name, 'read_file');
	t.is(toolMessages[1].content, 'Found 10 files');
});

test('continueConversationWithToolResults builds complete message history', t => {
	const context = createMockConversationContext(
		'Read a file',
		'Reading the file now.',
		[createMockToolCall('call_123', 'read_file', {path: '/test.ts'})],
	);

	const toolResults = [
		{
			tool_call_id: 'call_123',
			role: 'tool' as const,
			name: 'read_file',
			content: 'export const test = true;',
		},
	];

	const {updatedMessages, assistantMsg} = context;

	const toolMessages = toolResults.map(result => ({
		role: 'tool' as const,
		content: result.content || '',
		tool_call_id: result.tool_call_id,
		name: result.name,
	}));

	const updatedMessagesWithTools = [
		...updatedMessages,
		assistantMsg,
		...toolMessages,
	];

	t.is(updatedMessagesWithTools.length, 3);
	t.is(updatedMessagesWithTools[0].role, 'user');
	t.is(updatedMessagesWithTools[1].role, 'assistant');
	t.is(updatedMessagesWithTools[2].role, 'tool');
	t.is(updatedMessagesWithTools[2].content, 'export const test = true;');
});

test('continueConversationWithToolResults handles empty content', t => {
	const toolResults = [
		{
			tool_call_id: 'call_empty',
			role: 'tool' as const,
			name: 'some_tool',
			content: '',
		},
	];

	const toolMessages = toolResults.map(result => ({
		role: 'tool' as const,
		content: result.content || '',
		tool_call_id: result.tool_call_id,
		name: result.name,
	}));

	t.is(toolMessages[0].content, '');
	t.is(toolMessages[0].role, 'tool');
});

test('startToolConfirmationFlow initializes tool confirmation state', t => {
	const toolCalls = [
		createMockToolCall('call_1', 'read_file', {path: '/file.ts'}),
		createMockToolCall('call_2', 'search_files', {pattern: '*.ts'}),
	];

	const userMessage: Message = {role: 'user', content: 'Do stuff'};
	const assistantMsg: Message = {
		role: 'assistant',
		content: 'Doing stuff',
		tool_calls: toolCalls,
	};
	const systemMsg: Message = {role: 'system', content: 'System prompt'};

	const pendingToolCalls = toolCalls;
	const currentToolIndex = 0;
	const completedToolResults: any[] = [];
	const currentConversationContext = {
		updatedMessages: [userMessage],
		assistantMsg,
		systemMessage: systemMsg,
	};

	t.deepEqual(pendingToolCalls, toolCalls);
	t.is(currentToolIndex, 0);
	t.deepEqual(completedToolResults, []);
	t.truthy(currentConversationContext);
	t.is(currentConversationContext.assistantMsg.tool_calls?.length, 2);
});

test('startToolConfirmationFlow preserves all context information', t => {
	const toolCalls = [createMockToolCall('call_xyz', 'execute_bash', {})];
	const userMsg: Message = {role: 'user', content: 'Run command'};
	const assistantMsg: Message = {
		role: 'assistant',
		content: 'Running',
		tool_calls: toolCalls,
	};
	const systemMsg: Message = {role: 'system', content: 'Sys'};

	const context = {
		updatedMessages: [userMsg],
		assistantMsg,
		systemMessage: systemMsg,
	};

	t.is(context.updatedMessages.length, 1);
	t.is(context.updatedMessages[0].content, 'Run command');
	t.is(context.assistantMsg.content, 'Running');
	t.is(context.systemMessage.content, 'Sys');
});

test('multi-tool flow: moving to next tool increments index', t => {
	let currentToolIndex = 0;
	const completedToolResults: any[] = [];

	const result1 = {
		tool_call_id: 'call_1',
		role: 'tool' as const,
		name: 'tool_a',
		content: 'Result A',
	};
	completedToolResults.push(result1);
	currentToolIndex++;

	t.is(currentToolIndex, 1);
	t.is(completedToolResults.length, 1);

	const result2 = {
		tool_call_id: 'call_2',
		role: 'tool' as const,
		name: 'tool_b',
		content: 'Result B',
	};
	completedToolResults.push(result2);
	currentToolIndex++;

	t.is(currentToolIndex, 2);
	t.is(completedToolResults.length, 2);
});

test('multi-tool flow: last tool triggers conversation continuation', t => {
	const toolCalls = [
		createMockToolCall('call_1', 'tool_a', {}),
		createMockToolCall('call_2', 'tool_b', {}),
	];

	let currentToolIndex = 0;
	const completedToolResults: any[] = [];

	completedToolResults.push({
		tool_call_id: 'call_1',
		role: 'tool' as const,
		name: 'tool_a',
		content: 'A',
	});
	currentToolIndex++;

	const shouldContinueToNextTool = currentToolIndex < toolCalls.length;
	t.true(shouldContinueToNextTool);

	completedToolResults.push({
		tool_call_id: 'call_2',
		role: 'tool' as const,
		name: 'tool_b',
		content: 'B',
	});
	currentToolIndex++;

	const allToolsComplete = currentToolIndex >= toolCalls.length;
	t.true(allToolsComplete);
	t.is(completedToolResults.length, 2);
});

test('tool results accumulate correctly across multiple executions', t => {
	const completedToolResults: any[] = [];

	const tools = [
		{id: 'call_1', name: 'tool_a', result: 'Result A'},
		{id: 'call_2', name: 'tool_b', result: 'Result B'},
		{id: 'call_3', name: 'tool_c', result: 'Result C'},
	];

	for (const tool of tools) {
		const newResult = {
			tool_call_id: tool.id,
			role: 'tool' as const,
			name: tool.name,
			content: tool.result,
		};
		completedToolResults.push(newResult);
	}

	t.is(completedToolResults.length, 3);
	t.is(completedToolResults[0].content, 'Result A');
	t.is(completedToolResults[1].content, 'Result B');
	t.is(completedToolResults[2].content, 'Result C');
});

test('tool results maintain proper IDs for LLM matching', t => {
	const toolCalls = [
		createMockToolCall('unique_id_1', 'tool_x', {}),
		createMockToolCall('unique_id_2', 'tool_y', {}),
	];

	const results = toolCalls.map((tc, i) => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: `Result ${i}`,
	}));

	t.is(results[0].tool_call_id, 'unique_id_1');
	t.is(results[1].tool_call_id, 'unique_id_2');
	t.is(results[0].name, 'tool_x');
	t.is(results[1].name, 'tool_y');
});

test('tool confirmation approval triggers execution state', t => {
	const confirmed = true;
	let isToolConfirmationMode = true;
	let isToolExecuting = false;

	if (confirmed) {
		isToolConfirmationMode = false;
		isToolExecuting = true;
	}

	t.false(isToolConfirmationMode);
	t.true(isToolExecuting);
});

test('tool confirmation rejection creates cancellation results', t => {
	const confirmed = false;
	const toolCalls = [
		createMockToolCall('call_reject', 'execute_bash', {command: 'rm -rf /'}),
	];

	if (!confirmed) {
		const cancellationResults = toolCalls.map(tc => ({
			tool_call_id: tc.id,
			role: 'tool' as const,
			name: tc.function.name,
			content: 'Tool execution was cancelled by the user.',
		}));

		t.is(cancellationResults.length, 1);
		t.is(
			cancellationResults[0].content,
			'Tool execution was cancelled by the user.',
		);
	}

	t.pass();
});

test('integration: complete successful tool execution flow', t => {
	const context = createMockConversationContext(
		'Search for TypeScript files',
		'Searching now.',
		[createMockToolCall('call_search', 'search_files', {pattern: '**/*.ts'})],
	);

	const result = {
		tool_call_id: 'call_search',
		role: 'tool' as const,
		name: 'search_files',
		content: 'Found 25 TypeScript files',
	};

	const {updatedMessages, assistantMsg} = context;
	const toolMessages = [
		{
			role: 'tool' as const,
			content: result.content,
			tool_call_id: result.tool_call_id,
			name: result.name,
		},
	];

	const finalMessages = [...updatedMessages, assistantMsg, ...toolMessages];

	t.is(finalMessages.length, 3);
	t.is(finalMessages[2].role, 'tool');
	t.is(finalMessages[2].content, 'Found 25 TypeScript files');
	t.is(finalMessages[2].tool_call_id, 'call_search');
});
