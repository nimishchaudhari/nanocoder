import test from 'ava';
import {updateCommand} from './update.js';
import {toolRegistry} from '@/tools/index';

console.log(`\nupdate.spec.tsx`);

// Command Metadata Tests
// These tests verify the command is properly configured

test('updateCommand: has correct name', t => {
	t.is(updateCommand.name, 'update');
});

test('updateCommand: has description', t => {
	t.truthy(updateCommand.description);
	t.true(updateCommand.description.length > 0);
	t.regex(updateCommand.description, /update/i);
});

test('updateCommand: has handler function', t => {
	t.is(typeof updateCommand.handler, 'function');
});

test('updateCommand: handler is async', t => {
	const result = updateCommand.handler([]);
	t.truthy(result);
	t.true(result instanceof Promise);
});

// Basic behavior: when update available and installed via npm, handler runs npm update -g
test('updateCommand: runs update command when installed via npm', async t => {
	// Mock fetch to return newer version
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () => {
		return {
			ok: true,
			status: 200,
			statusText: 'OK',
			json: async () => ({
				version: '99.99.99',
				name: '@nanocollective/nanocoder',
			}),
		} as unknown as Response;
	}) as typeof fetch;

	// Set installation method override
	process.env.NANOCODER_INSTALL_METHOD = 'npm';

	let called = false;
	const originalExecuteBash = toolRegistry.execute_bash;
	toolRegistry.execute_bash = async ({command}: {command: string}) => {
		called = true;
		t.is(command, 'npm update -g @nanocollective/nanocoder');
		return 'ok';
	};

	await updateCommand.handler([]);

	// Cleanup
	toolRegistry.execute_bash = originalExecuteBash;
	globalThis.fetch = originalFetch;
	delete process.env.NANOCODER_INSTALL_METHOD;

	t.true(called);
});

test('updateCommand: does not run execute_bash for nix installations', async t => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () => {
		return {
			ok: true,
			status: 200,
			statusText: 'OK',
			json: async () => ({
				version: '99.99.99',
				name: '@nanocollective/nanocoder',
			}),
		} as unknown as Response;
	}) as typeof fetch;

	process.env.NANOCODER_INSTALL_METHOD = 'nix';

	let called = false;
	const originalExecuteBash = toolRegistry.execute_bash;
	toolRegistry.execute_bash = async ({command}: {command: string}) => {
		called = true;
		return 'ok';
	};

	await updateCommand.handler([]);

	// Cleanup
	toolRegistry.execute_bash = originalExecuteBash;
	globalThis.fetch = originalFetch;
	delete process.env.NANOCODER_INSTALL_METHOD;

	t.false(called);
});

test('updateCommand: handles execute_bash failure with error message', async t => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (async () => {
		return {
			ok: true,
			status: 200,
			statusText: 'OK',
			json: async () => ({
				version: '99.99.99',
				name: '@nanocollective/nanocoder',
			}),
		} as unknown as Response;
	}) as typeof fetch;

	process.env.NANOCODER_INSTALL_METHOD = 'npm';

	const originalExecuteBash = toolRegistry.execute_bash;
	toolRegistry.execute_bash = async () => {
		throw new Error('command failed: permission denied');
	};

	const result = await updateCommand.handler([]);
	// Expect the result is a React element with props.message containing 'Failed to execute'
	// @ts-ignore
	t.truthy(result.props?.message?.includes('Failed to execute'));

	// Cleanup
	toolRegistry.execute_bash = originalExecuteBash;
	globalThis.fetch = originalFetch;
	delete process.env.NANOCODER_INSTALL_METHOD;
});

// Note: Full integration tests with mocking would require a more sophisticated
// test setup with module mocking capabilities. The update-checker.spec.ts file
// provides comprehensive coverage of the update checking logic itself.
// This file focuses on verifying the command is properly structured and registered.
