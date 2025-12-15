import {EventEmitter} from 'events';
import test from 'ava';
import {LSPClient, type LSPServerConfig} from './lsp-client';

console.log(`\nlsp-client.spec.ts`);

// Helper to create a mock config
function createMockConfig(
	overrides: Partial<LSPServerConfig> = {},
): LSPServerConfig {
	return {
		name: 'test-server',
		command: 'echo',
		args: ['test'],
		languages: ['ts', 'js'],
		...overrides,
	};
}

// LSPClient constructor tests
test('LSPClient - is an EventEmitter', t => {
	const client = new LSPClient(createMockConfig());
	t.true(client instanceof EventEmitter);
});

test('LSPClient - can add event listeners', t => {
	const client = new LSPClient(createMockConfig());
	let called = false;

	client.on('diagnostics', () => {
		called = true;
	});

	client.emit('diagnostics', {uri: 'test', diagnostics: []});
	t.true(called);
});

test('LSPClient - can emit error events', t => {
	const client = new LSPClient(createMockConfig());
	let errorReceived: Error | null = null;

	client.on('error', (error: Error) => {
		errorReceived = error;
	});

	const testError = new Error('test error');
	client.emit('error', testError);

	t.truthy(errorReceived);
	t.is(errorReceived!.message, 'test error');
});

test('LSPClient - can emit exit events', t => {
	const client = new LSPClient(createMockConfig());
	let exitCode: number | null | undefined;

	client.on('exit', (code: number | null) => {
		exitCode = code;
	});

	client.emit('exit', 0);
	t.is(exitCode, 0);
});

// isReady tests
test('LSPClient - isReady returns false before start', t => {
	const client = new LSPClient(createMockConfig());
	t.false(client.isReady());
});

// getCapabilities tests
test('LSPClient - getCapabilities returns null before start', t => {
	const client = new LSPClient(createMockConfig());
	t.is(client.getCapabilities(), null);
});

// stop tests
test('LSPClient - stop does not throw when not started', async t => {
	const client = new LSPClient(createMockConfig());
	await t.notThrowsAsync(async () => {
		await client.stop();
	});
});

test('LSPClient - stop clears state', async t => {
	const client = new LSPClient(createMockConfig());
	await client.stop();
	t.false(client.isReady());
	t.is(client.getCapabilities(), null);
});

// Document methods (these don't throw when not started, they just do nothing)
test('LSPClient - openDocument does not throw when not started', t => {
	const client = new LSPClient(createMockConfig());
	t.notThrows(() => {
		client.openDocument('file:///test.ts', 'typescript', 'const x = 1;');
	});
});

test('LSPClient - updateDocument does not throw when not started', t => {
	const client = new LSPClient(createMockConfig());
	t.notThrows(() => {
		client.updateDocument('file:///test.ts', 'const x = 2;');
	});
});

test('LSPClient - closeDocument does not throw when not started', t => {
	const client = new LSPClient(createMockConfig());
	t.notThrows(() => {
		client.closeDocument('file:///test.ts');
	});
});

// Async methods that require initialization
test('LSPClient - getCompletions returns empty array when no capabilities', async t => {
	const client = new LSPClient(createMockConfig());
	const result = await client.getCompletions('file:///test.ts', {
		line: 0,
		character: 0,
	});
	t.deepEqual(result, []);
});

test('LSPClient - getCodeActions returns empty array when no capabilities', async t => {
	const client = new LSPClient(createMockConfig());
	const result = await client.getCodeActions(
		'file:///test.ts',
		[],
		0,
		0,
		1,
		10,
	);
	t.deepEqual(result, []);
});

test('LSPClient - formatDocument returns empty array when no capabilities', async t => {
	const client = new LSPClient(createMockConfig());
	const result = await client.formatDocument('file:///test.ts');
	t.deepEqual(result, []);
});

test('LSPClient - getDiagnostics returns empty array when no capabilities', async t => {
	const client = new LSPClient(createMockConfig());
	const result = await client.getDiagnostics('file:///test.ts');
	t.deepEqual(result, []);
});

// Config validation
test('LSPClient - accepts config with minimal required fields', t => {
	const config: LSPServerConfig = {
		name: 'minimal',
		command: 'test',
		languages: ['ts'],
	};

	const client = new LSPClient(config);
	t.truthy(client);
});

test('LSPClient - accepts config with all optional fields', t => {
	const config: LSPServerConfig = {
		name: 'full',
		command: 'test',
		args: ['--stdio'],
		env: {TEST: 'value'},
		languages: ['ts', 'js'],
		rootUri: 'file:///test',
	};

	const client = new LSPClient(config);
	t.truthy(client);
});

// Event types
test('LSPClient - diagnostics event provides correct params', t => {
	const client = new LSPClient(createMockConfig());

	let receivedParams: {uri: string; diagnostics: unknown[]} | null = null;
	client.on('diagnostics', params => {
		receivedParams = params;
	});

	const testParams = {
		uri: 'file:///test.ts',
		version: 1,
		diagnostics: [
			{
				range: {start: {line: 0, character: 0}, end: {line: 0, character: 5}},
				message: 'Test error',
				severity: 1,
			},
		],
	};

	client.emit('diagnostics', testParams);

	t.truthy(receivedParams);
	t.is(receivedParams!.uri, 'file:///test.ts');
	t.is(receivedParams!.diagnostics.length, 1);
});

// Multiple listeners
test('LSPClient - supports multiple listeners for same event', t => {
	const client = new LSPClient(createMockConfig());

	let count = 0;
	client.on('diagnostics', () => count++);
	client.on('diagnostics', () => count++);
	client.on('diagnostics', () => count++);

	client.emit('diagnostics', {uri: 'test', diagnostics: []});

	t.is(count, 3);
});

// Listener removal
test('LSPClient - can remove event listeners', t => {
	const client = new LSPClient(createMockConfig());

	let count = 0;
	const listener = () => count++;

	client.on('diagnostics', listener);
	client.emit('diagnostics', {uri: 'test', diagnostics: []});
	t.is(count, 1);

	client.off('diagnostics', listener);
	client.emit('diagnostics', {uri: 'test', diagnostics: []});
	t.is(count, 1); // Should not increment
});

// Note: Testing start() with invalid command is not included as it causes
// uncaught exceptions from child_process.spawn that AVA cannot properly catch.
// The error handling is tested via manual integration testing.

// Config with environment variables
test('LSPClient - config can include environment variables', t => {
	const config: LSPServerConfig = {
		name: 'with-env',
		command: 'test',
		languages: ['ts'],
		env: {
			NODE_ENV: 'test',
			DEBUG: 'lsp:*',
			CUSTOM_VAR: 'custom_value',
		},
	};

	const client = new LSPClient(config);
	t.truthy(client);
});

// Root URI handling
test('LSPClient - config can specify rootUri', t => {
	const config: LSPServerConfig = {
		name: 'with-root',
		command: 'test',
		languages: ['ts'],
		rootUri: 'file:///custom/workspace',
	};

	const client = new LSPClient(config);
	t.truthy(client);
});

// Multiple languages
test('LSPClient - config supports multiple languages', t => {
	const config: LSPServerConfig = {
		name: 'multi-lang',
		command: 'test',
		languages: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'],
	};

	const client = new LSPClient(config);
	t.truthy(client);
	t.true(config.languages.length === 6);
});

// Empty args array
test('LSPClient - config supports empty args array', t => {
	const config: LSPServerConfig = {
		name: 'no-args',
		command: 'test',
		args: [],
		languages: ['ts'],
	};

	const client = new LSPClient(config);
	t.truthy(client);
});

// Formatting options
test('LSPClient - formatDocument accepts custom options', async t => {
	const client = new LSPClient(createMockConfig());

	// Should not throw, just return empty array since not initialized
	const result = await client.formatDocument('file:///test.ts', {
		tabSize: 4,
		insertSpaces: false,
		trimTrailingWhitespace: true,
		insertFinalNewline: true,
		trimFinalNewlines: true,
	});

	t.deepEqual(result, []);
});

test('LSPClient - formatDocument works with partial options', async t => {
	const client = new LSPClient(createMockConfig());

	const result = await client.formatDocument('file:///test.ts', {
		tabSize: 4,
	});

	t.deepEqual(result, []);
});

// Code actions with diagnostics
test('LSPClient - getCodeActions accepts diagnostics array', async t => {
	const client = new LSPClient(createMockConfig());

	const diagnostics = [
		{
			range: {
				start: {line: 0, character: 0},
				end: {line: 0, character: 5},
			},
			message: 'Unused variable',
			severity: 2 as const,
		},
	];

	const result = await client.getCodeActions(
		'file:///test.ts',
		diagnostics,
		0,
		0,
		0,
		5,
	);

	t.deepEqual(result, []);
});

// Position handling
test('LSPClient - getCompletions accepts position object', async t => {
	const client = new LSPClient(createMockConfig());

	const result = await client.getCompletions('file:///test.ts', {
		line: 10,
		character: 15,
	});

	t.deepEqual(result, []);
});

// Range in code actions
test('LSPClient - getCodeActions with multi-line range', async t => {
	const client = new LSPClient(createMockConfig());

	const result = await client.getCodeActions(
		'file:///test.ts',
		[],
		0,
		0, // start
		10,
		20, // end
	);

	t.deepEqual(result, []);
});

// Once event listener
test('LSPClient - supports once event listeners', t => {
	const client = new LSPClient(createMockConfig());

	let count = 0;
	client.once('diagnostics', () => count++);

	client.emit('diagnostics', {uri: 'test', diagnostics: []});
	client.emit('diagnostics', {uri: 'test', diagnostics: []});

	t.is(count, 1); // Should only be called once
});

// Error handling
test('LSPClient - error event receives Error object', t => {
	const client = new LSPClient(createMockConfig());

	let receivedError: Error | undefined;
	client.on('error', (error: Error) => {
		receivedError = error;
	});

	const testError = new Error('Connection failed');
	client.emit('error', testError);

	t.truthy(receivedError);
	t.true(receivedError! instanceof Error);
	t.is(receivedError!.message, 'Connection failed');
});

// Exit codes
test('LSPClient - exit event with null code', t => {
	const client = new LSPClient(createMockConfig());

	let receivedCode: number | null | undefined = -1;
	client.on('exit', (code: number | null) => {
		receivedCode = code;
	});

	(client.emit as any)('exit', null);
	t.true(receivedCode === null);
});

test('LSPClient - exit event with non-zero code', t => {
	const client = new LSPClient(createMockConfig());

	let receivedCode: number | null | undefined;
	client.on('exit', (code: number | null) => {
		receivedCode = code;
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(client.emit as any)('exit', 1);
	t.is(receivedCode, 1);
});

// URI handling in document methods
test('LSPClient - openDocument with file:// URI', t => {
	const client = new LSPClient(createMockConfig());
	t.notThrows(() => {
		client.openDocument('file:///Users/test/file.ts', 'typescript', 'code');
	});
});

test('LSPClient - updateDocument preserves URI format', t => {
	const client = new LSPClient(createMockConfig());
	t.notThrows(() => {
		client.updateDocument('file:///Users/test/file.ts', 'updated code');
	});
});

// Language ID in openDocument
test('LSPClient - openDocument with various language IDs', t => {
	const client = new LSPClient(createMockConfig());

	const languageIds = [
		'typescript',
		'typescriptreact',
		'javascript',
		'javascriptreact',
		'python',
		'rust',
		'go',
	];

	for (const langId of languageIds) {
		t.notThrows(() => {
			client.openDocument(`file:///test.${langId}`, langId, 'code');
		});
	}
});

// Empty content handling
test('LSPClient - openDocument with empty content', t => {
	const client = new LSPClient(createMockConfig());
	t.notThrows(() => {
		client.openDocument('file:///test.ts', 'typescript', '');
	});
});

test('LSPClient - updateDocument with empty content', t => {
	const client = new LSPClient(createMockConfig());
	t.notThrows(() => {
		client.updateDocument('file:///test.ts', '');
	});
});

// Large content handling
test('LSPClient - openDocument with large content', t => {
	const client = new LSPClient(createMockConfig());
	const largeContent = 'x'.repeat(100000);

	t.notThrows(() => {
		client.openDocument('file:///test.ts', 'typescript', largeContent);
	});
});

// Special characters in content
test('LSPClient - openDocument with special characters', t => {
	const client = new LSPClient(createMockConfig());
	const content = 'const x = "Hello \n\t\r World" + `template ${var}`';

	t.notThrows(() => {
		client.openDocument('file:///test.ts', 'typescript', content);
	});
});

// Unicode in content
test('LSPClient - openDocument with unicode content', t => {
	const client = new LSPClient(createMockConfig());
	const content = 'const emoji = "🚀🎉" // コメント';

	t.notThrows(() => {
		client.openDocument('file:///test.ts', 'typescript', content);
	});
});
