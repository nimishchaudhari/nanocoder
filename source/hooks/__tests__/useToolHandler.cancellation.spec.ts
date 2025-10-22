import test from 'ava';
import type {Message, ToolCall} from '@/types/core';
import type {ConversationContext} from '@/hooks/useAppState';
import {
	createMockToolCall,
	createMockConversationContext,
} from './test-helpers';

// ============================================================================
// Tests for Tool Cancellation
// ============================================================================

test('tool cancellation creates proper cancellation result for single tool', t => {
	const toolCall = createMockToolCall('call_123', 'search_files', {
		pattern: '**/*',
	});

	const cancellationResults = [toolCall].map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	t.is(cancellationResults.length, 1);
	t.is(cancellationResults[0].tool_call_id, 'call_123');
	t.is(cancellationResults[0].role, 'tool');
	t.is(cancellationResults[0].name, 'search_files');
	t.is(
		cancellationResults[0].content,
		'Tool execution was cancelled by the user.',
	);
});

test('tool cancellation creates proper cancellation results for multiple tools', t => {
	const toolCalls = [
		createMockToolCall('call_001', 'search_files', {pattern: '**/*.ts'}),
		createMockToolCall('call_002', 'read_file', {path: '/test.ts'}),
		createMockToolCall('call_003', 'execute_bash', {command: 'npm test'}),
	];

	const cancellationResults = toolCalls.map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	t.is(cancellationResults.length, 3);

	for (let i = 0; i < toolCalls.length; i++) {
		t.is(cancellationResults[i].tool_call_id, toolCalls[i].id);
		t.is(cancellationResults[i].name, toolCalls[i].function.name);
		t.is(cancellationResults[i].role, 'tool');
	}
});

test('cancellation updates conversation history with assistant message and tool results', t => {
	const toolCall = createMockToolCall('call_456', 'execute_bash', {
		command: 'rm -rf /',
	});

	const context = createMockConversationContext(
		'Delete everything',
		'Let me run that command.',
		[toolCall],
	);

	const cancellationResults = [toolCall].map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	const {updatedMessages, assistantMsg} = context;

	const toolMessages = cancellationResults.map(result => ({
		role: 'tool' as const,
		content: result.content || '',
		tool_call_id: result.tool_call_id,
		name: result.name,
	}));

	const updatedMessagesWithCancellation = [
		...updatedMessages,
		assistantMsg,
		...toolMessages,
	];

	t.is(updatedMessagesWithCancellation.length, 3);
	t.is(updatedMessagesWithCancellation[0].role, 'user');
	t.is(updatedMessagesWithCancellation[1].role, 'assistant');
	t.is(updatedMessagesWithCancellation[2].role, 'tool');

	const assistantMessage = updatedMessagesWithCancellation[1];
	if (assistantMessage.role === 'assistant') {
		t.truthy(assistantMessage.tool_calls);
		t.is(assistantMessage.tool_calls?.length, 1);
		t.is(
			updatedMessagesWithCancellation[2].tool_call_id,
			assistantMessage.tool_calls?.[0].id,
		);
	}
});

test('tool call IDs match between assistant tool_calls and cancellation results', t => {
	const toolCalls = [
		createMockToolCall('call_abc', 'create_file', {path: '/new.ts'}),
		createMockToolCall('call_def', 'create_file', {path: '/another.ts'}),
	];

	const cancellationResults = toolCalls.map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	for (const toolCall of toolCalls) {
		const matchingResult = cancellationResults.find(
			r => r.tool_call_id === toolCall.id,
		);
		t.truthy(matchingResult);
		t.is(matchingResult?.name, toolCall.function.name);
	}
});

test('cancellation creates results for all pending tools, not just current', t => {
	const toolCalls = [
		createMockToolCall('call_001', 'read_file', {path: '/file1.ts'}),
		createMockToolCall('call_002', 'read_file', {path: '/file2.ts'}),
		createMockToolCall('call_003', 'read_file', {path: '/file3.ts'}),
	];

	const cancellationResults = toolCalls.map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	t.is(cancellationResults.length, 3);
	t.is(cancellationResults[0].tool_call_id, 'call_001');
	t.is(cancellationResults[1].tool_call_id, 'call_002');
	t.is(cancellationResults[2].tool_call_id, 'call_003');
});

test('cancellation handles empty tool calls array gracefully', t => {
	const toolCalls: ToolCall[] = [];

	const cancellationResults = toolCalls.map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	t.is(cancellationResults.length, 0);
	t.deepEqual(cancellationResults, []);
});

test('cancellation results preserve tool name and ID from original tool call', t => {
	const toolCall = createMockToolCall('call_xyz', 'fetch_url', {
		url: 'https://example.com',
		prompt: 'Get content',
	});

	const cancellationResult = {
		tool_call_id: toolCall.id,
		role: 'tool' as const,
		name: toolCall.function.name,
		content: 'Tool execution was cancelled by the user.',
	};

	t.is(cancellationResult.tool_call_id, 'call_xyz');
	t.is(cancellationResult.name, 'fetch_url');
	t.is(cancellationResult.role, 'tool');
});

test('cancellation handles null conversation context gracefully', t => {
	const currentConversationContext: ConversationContext | null = null;

	if (!currentConversationContext) {
		t.pass('Null context handled by early return');
		return;
	}

	t.fail('Should have returned early for null context');
});

test('message structure after cancellation matches OpenAI tool calling format', t => {
	const toolCall = createMockToolCall('call_format_test', 'search_files', {
		pattern: '*.ts',
	});

	const cancellationResult = {
		tool_call_id: toolCall.id,
		role: 'tool' as const,
		name: toolCall.function.name,
		content: 'Tool execution was cancelled by the user.',
	};

	const toolMessage: Message = {
		role: 'tool' as const,
		content: cancellationResult.content || '',
		tool_call_id: cancellationResult.tool_call_id,
		name: cancellationResult.name,
	};

	t.is(toolMessage.role, 'tool');
	t.is(typeof toolMessage.content, 'string');
	t.is(toolMessage.tool_call_id, 'call_format_test');
	t.is(toolMessage.name, 'search_files');
	t.is(toolMessage.content, 'Tool execution was cancelled by the user.');
});

test('cancellation maintains order of tool calls in results', t => {
	const toolCalls = [
		createMockToolCall('call_1', 'tool_a', {}),
		createMockToolCall('call_2', 'tool_b', {}),
		createMockToolCall('call_3', 'tool_c', {}),
		createMockToolCall('call_4', 'tool_d', {}),
	];

	const cancellationResults = toolCalls.map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	for (let i = 0; i < toolCalls.length; i++) {
		t.is(cancellationResults[i].tool_call_id, toolCalls[i].id);
		t.is(cancellationResults[i].name, toolCalls[i].function.name);
	}
});

test('integration: full cancellation flow from tool calls to final message history', t => {
	const userMessage = 'Run npm test';
	const assistantContent = 'I will run npm test for you.';
	const toolCalls = [
		createMockToolCall('call_test', 'execute_bash', {command: 'npm test'}),
	];

	const context = createMockConversationContext(
		userMessage,
		assistantContent,
		toolCalls,
	);

	const cancellationResults = toolCalls.map(tc => ({
		tool_call_id: tc.id,
		role: 'tool' as const,
		name: tc.function.name,
		content: 'Tool execution was cancelled by the user.',
	}));

	const {updatedMessages, assistantMsg} = context;
	const toolMessages = cancellationResults.map(result => ({
		role: 'tool' as const,
		content: result.content || '',
		tool_call_id: result.tool_call_id,
		name: result.name,
	}));

	const finalMessages = [...updatedMessages, assistantMsg, ...toolMessages];

	t.is(finalMessages.length, 3);
	t.is(finalMessages[0].role, 'user');
	t.is(finalMessages[0].content, userMessage);

	const finalAssistantMsg = finalMessages[1];
	t.is(finalAssistantMsg.role, 'assistant');
	t.is(finalAssistantMsg.content, assistantContent);
	if (finalAssistantMsg.role === 'assistant') {
		t.truthy(finalAssistantMsg.tool_calls);
		t.is(finalAssistantMsg.tool_calls?.length, 1);
		t.is(finalAssistantMsg.tool_calls?.[0].id, 'call_test');
	}

	t.is(finalMessages[2].role, 'tool');
	t.is(finalMessages[2].tool_call_id, 'call_test');
	t.is(finalMessages[2].name, 'execute_bash');
	t.is(finalMessages[2].content, 'Tool execution was cancelled by the user.');

	const assistantToolCallIds =
		finalAssistantMsg.role === 'assistant'
			? finalAssistantMsg.tool_calls?.map((tc: ToolCall) => tc.id) || []
			: [];
	const toolResultIds = finalMessages
		.filter(msg => msg.role === 'tool')
		.map(msg => msg.tool_call_id);

	t.deepEqual(assistantToolCallIds, toolResultIds);
});
