import test from 'ava';
import {updateCommand} from './update.js';

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

// Note: Full integration tests with mocking would require a more sophisticated
// test setup with module mocking capabilities. The update-checker.spec.ts file
// provides comprehensive coverage of the update checking logic itself.
// This file focuses on verifying the command is properly structured and registered.
