import test from 'ava';
import type {AISDKCoreTool, StreamCallbacks} from '@/types/index';
import {processXMLToolCalls} from './tool-processor.js';

test('processXMLToolCalls returns empty result when no tools available', t => {
	const content = 'Some response text';
	const tools: Record<string, AISDKCoreTool> = {};
	const callbacks: StreamCallbacks = {};

	const result = processXMLToolCalls(content, tools, callbacks);

	t.deepEqual(result.toolCalls, []);
	t.is(result.cleanedContent, content);
});

test('processXMLToolCalls returns empty result when content is empty', t => {
	const content = '';
	const tools: Record<string, AISDKCoreTool> = {
		test_tool: {} as AISDKCoreTool, // Type-only check, actual structure doesn't matter for empty content test
	};
	const callbacks: StreamCallbacks = {};

	const result = processXMLToolCalls(content, tools, callbacks);

	t.deepEqual(result.toolCalls, []);
	t.is(result.cleanedContent, content);
});

test('processXMLToolCalls handles malformed XML gracefully', t => {
	const content = '<tool_call>\n<name>test_tool</name>\n<arguments>';
	const tools: Record<string, AISDKCoreTool> = {
		test_tool: {} as AISDKCoreTool,
	};
	const callbacks: StreamCallbacks = {
		onToolCall: () => {},
	};

	// Function should not throw, even with malformed XML
	const result = processXMLToolCalls(content, tools, callbacks);

	t.truthy(result);
	t.true(Array.isArray(result.toolCalls));
	t.is(typeof result.cleanedContent, 'string');
});

test('processXMLToolCalls handles valid XML content', t => {
	const content =
		'<tool_call>\n<name>test_tool</name>\n<arguments>{"arg": "value"}</arguments>\n</tool_call>';
	const tools: Record<string, AISDKCoreTool> = {
		test_tool: {} as AISDKCoreTool,
	};

	const callbacks: StreamCallbacks = {
		onToolCall: () => {},
	};

	// Function should not throw with valid XML structure
	const result = processXMLToolCalls(content, tools, callbacks);

	t.truthy(result);
	t.true(Array.isArray(result.toolCalls));
	t.is(typeof result.cleanedContent, 'string');
});

test('processXMLToolCalls handles mixed content', t => {
	const content =
		'Some text before\n<tool_call>\n<name>test_tool</name>\n<arguments>{}</arguments>\n</tool_call>\nSome text after';
	const tools: Record<string, AISDKCoreTool> = {
		test_tool: {} as AISDKCoreTool,
	};
	const callbacks: StreamCallbacks = {};

	// Function should not throw with mixed content
	const result = processXMLToolCalls(content, tools, callbacks);

	t.truthy(result);
	t.true(Array.isArray(result.toolCalls));
	t.is(typeof result.cleanedContent, 'string');
});

test('processXMLToolCalls returns original content when no XML tool calls', t => {
	const content = 'Just some plain text response';
	const tools: Record<string, AISDKCoreTool> = {
		test_tool: {} as AISDKCoreTool,
	};
	const callbacks: StreamCallbacks = {};

	const result = processXMLToolCalls(content, tools, callbacks);

	t.deepEqual(result.toolCalls, []);
	t.is(result.cleanedContent, content);
});
