import test from 'ava';
import {executeBashTool} from './execute-bash.js';
import {readFileTool} from './read-file.js';
import {createFileTool} from './create-file.js';
import {writeFile, unlink, readFile} from 'fs/promises';
import {resolve} from 'path';
import {tmpdir} from 'os';

// ============================================================================
// Tests for v6 Execute Functions
// ============================================================================
// These tests validate that v6 execute functions work correctly and maintain
// backward compatibility with handler functions.

// ============================================================================
// Bash Execute Function
// ============================================================================

test('execute_bash execute function runs simple command', async t => {
	const tool = executeBashTool.tool;
	if (!tool.execute) {
		t.fail('execute function not defined');
		return;
	}

	const result = await tool.execute!(
		{command: 'echo "test"'},
		{
			toolCallId: 'test-1',
			messages: [],
			abortSignal: new AbortController().signal,
		},
	);

	t.truthy(result);
	t.regex(result, /test/);
});

test('execute_bash execute function includes exit code', async t => {
	const tool = executeBashTool.tool;
	const result = await tool.execute!(
		{command: 'echo "success"'},
		{
			toolCallId: 'test-2',
			messages: [],
			abortSignal: new AbortController().signal,
		},
	);

	t.truthy(result);
	t.regex(result, /EXIT_CODE: 0/);
});

test('execute_bash execute function captures stderr', async t => {
	const tool = executeBashTool.tool;
	const result = await tool.execute!(
		{command: 'echo "error" >&2'},
		{
			toolCallId: 'test-3',
			messages: [],
			abortSignal: new AbortController().signal,
		},
	);

	t.truthy(result);
	t.regex(result, /STDERR:/);
	t.regex(result, /error/);
});

// ============================================================================
// Read File Execute Function
// ============================================================================

test('read_file execute function reads existing file', async t => {
	const testFile = resolve(tmpdir(), `nanocoder-test-${Date.now()}.txt`);
	await writeFile(testFile, 'test content', 'utf-8');

	try {
		const tool = readFileTool.tool;
		const result = await tool.execute!(
			{path: testFile},
			{
				toolCallId: 'test-4',
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);

		t.truthy(result);
		t.regex(result, /test content/);
	} finally {
		await unlink(testFile).catch(() => {});
	}
});

test('read_file execute function handles non-existent file', async t => {
	const nonExistentFile = resolve(tmpdir(), 'non-existent-file.txt');

	const tool = readFileTool.tool;
	await t.throwsAsync(
		async () => {
			await tool.execute!(
				{path: nonExistentFile},
				{
					toolCallId: 'test-5',
					messages: [],
					abortSignal: new AbortController().signal,
				},
			);
		},
		{message: /does not exist|no such file or directory|ENOENT/i},
	);
});

test('read_file execute function reads file with line ranges', async t => {
	const testFile = resolve(tmpdir(), `nanocoder-test-${Date.now()}.txt`);
	await writeFile(testFile, 'line1\nline2\nline3\nline4\nline5', 'utf-8');

	try {
		const tool = readFileTool.tool;
		const result = await tool.execute!(
			{path: testFile, start_line: 2, end_line: 4},
			{
				toolCallId: 'test-6',
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);

		t.truthy(result);
		t.regex(result, /line2/);
		t.regex(result, /line3/);
		t.regex(result, /line4/);
		t.notRegex(result, /line1/);
		t.notRegex(result, /line5/);
	} finally {
		await unlink(testFile).catch(() => {});
	}
});

// ============================================================================
// Create File Execute Function
// ============================================================================

test('create_file execute function creates file', async t => {
	const testFile = resolve(tmpdir(), `nanocoder-test-${Date.now()}.txt`);

	try {
		const tool = createFileTool.tool;
		const result = await tool.execute!(
			{
				path: testFile,
				content: 'created by test',
			},
			{
				toolCallId: 'test-7',
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);

		t.is(result, 'File written successfully');

		// Verify file was created
		const content = await readFile(testFile, 'utf-8');
		t.is(content, 'created by test');
	} finally {
		await unlink(testFile).catch(() => {});
	}
});

test('create_file execute function overwrites existing file', async t => {
	const testFile = resolve(tmpdir(), `nanocoder-test-${Date.now()}.txt`);
	await writeFile(testFile, 'original content', 'utf-8');

	try {
		const tool = createFileTool.tool;
		await tool.execute!(
			{
				path: testFile,
				content: 'new content',
			},
			{
				toolCallId: 'test-8',
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);

		// Verify file was overwritten
		const content = await readFile(testFile, 'utf-8');
		t.is(content, 'new content');
	} finally {
		await unlink(testFile).catch(() => {});
	}
});

// ============================================================================
// Backward Compatibility: Execute vs Handler
// ============================================================================

test('read_file execute function matches handler function output', async t => {
	const testFile = resolve(tmpdir(), `nanocoder-test-${Date.now()}.txt`);
	await writeFile(testFile, 'consistency test', 'utf-8');

	try {
		const tool = readFileTool.tool;
		const handler = readFileTool.handler;

		// Execute via v6 execute
		const executeResult = await tool.execute!(
			{path: testFile},
			{
				toolCallId: 'test-9',
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);

		// Execute via handler
		const handlerResult = await handler!({path: testFile});

		// Both should produce same result
		t.is(executeResult, handlerResult);
	} finally {
		await unlink(testFile).catch(() => {});
	}
});

test('create_file execute function matches handler function output', async t => {
	const testFile1 = resolve(tmpdir(), `nanocoder-test-${Date.now()}-1.txt`);
	const testFile2 = resolve(tmpdir(), `nanocoder-test-${Date.now()}-2.txt`);

	try {
		const tool = createFileTool.tool;
		const handler = createFileTool.handler;

		// Execute via v6 execute
		const executeResult = await tool.execute!(
			{path: testFile1, content: 'test content'},
			{
				toolCallId: 'test-10',
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);

		// Execute via handler
		const handlerResult = await handler!({
			path: testFile2,
			content: 'test content',
		});

		// Both should produce same result
		t.is(executeResult, handlerResult);

		// Verify both files have same content
		const content1 = await readFile(testFile1, 'utf-8');
		const content2 = await readFile(testFile2, 'utf-8');
		t.is(content1, content2);
	} finally {
		await unlink(testFile1).catch(() => {});
		await unlink(testFile2).catch(() => {});
	}
});

test('execute_bash execute function matches handler function output', async t => {
	const tool = executeBashTool.tool;
	const handler = executeBashTool.handler;

	// Execute via v6 execute
	const executeResult = await tool.execute!(
		{command: 'echo "consistency"'},
		{
			toolCallId: 'test-11',
			messages: [],
			abortSignal: new AbortController().signal,
		},
	);

	// Execute via handler
	const handlerResult = await handler!({command: 'echo "consistency"'});

	// Both should produce same result
	t.is(executeResult, handlerResult);
});

// ============================================================================
// Execute Function with Empty/Invalid Arguments
// ============================================================================

test('create_file execute function handles empty content', async t => {
	const testFile = resolve(tmpdir(), `nanocoder-test-${Date.now()}.txt`);

	try {
		const tool = createFileTool.tool;
		await tool.execute!(
			{
				path: testFile,
				content: '',
			},
			{
				toolCallId: 'test-12',
				messages: [],
				abortSignal: new AbortController().signal,
			},
		);

		// Verify empty file was created
		const content = await readFile(testFile, 'utf-8');
		t.is(content, '');
	} finally {
		await unlink(testFile).catch(() => {});
	}
});

test('read_file execute function rejects empty file', async t => {
	const testFile = resolve(tmpdir(), `nanocoder-test-${Date.now()}.txt`);
	await writeFile(testFile, '', 'utf-8');

	try {
		const tool = readFileTool.tool;
		await t.throwsAsync(
			async () => {
				await tool.execute!(
					{path: testFile},
					{
						toolCallId: 'test-13',
						messages: [],
						abortSignal: new AbortController().signal,
					},
				);
			},
			{message: /empty/i},
		);
	} finally {
		await unlink(testFile).catch(() => {});
	}
});
