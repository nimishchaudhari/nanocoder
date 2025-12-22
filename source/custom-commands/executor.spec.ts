import test from 'ava';
import type {CustomCommand} from '@/types/index';
import {CustomCommandExecutor} from './executor';

const executor = new CustomCommandExecutor();

test('execute returns prompt with command content', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'This is a test command',
		metadata: {},
	};

	const result = executor.execute(command, []);
	t.true(result.includes('This is a test command'));
	t.true(result.includes('/test'));
});

test('execute substitutes cwd variable', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Working in {{cwd}}',
		metadata: {},
	};

	const result = executor.execute(command, []);
	const expectedCwd = process.cwd();
	t.true(result.includes(expectedCwd));
});

test('execute substitutes command variable', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Running {{command}}',
		metadata: {},
	};

	const result = executor.execute(command, []);
	t.true(result.includes('/test'));
});

test('execute substitutes parameter variables', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Arg1: {{arg1}}, Arg2: {{arg2}}',
		metadata: {
			parameters: ['arg1', 'arg2'],
		},
	};

	const result = executor.execute(command, ['value1', 'value2']);
	t.true(result.includes('value1'));
	t.true(result.includes('value2'));
});

test('execute handles missing parameters gracefully', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Arg1: {{arg1}}',
		metadata: {
			parameters: ['arg1', 'arg2'],
		},
	};

	const result = executor.execute(command, ['value1']);
	// Should still work, missing arg2 becomes empty string
	t.true(result.includes('value1'));
});

test('execute includes args variable with all arguments', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'All args: {{args}}',
		metadata: {
			parameters: ['arg1', 'arg2'],
		},
	};

	const result = executor.execute(command, ['hello', 'world']);
	t.true(result.includes('hello world'));
});

test('execute adds note about custom command', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Test content',
		metadata: {},
	};

	const result = executor.execute(command, []);
	t.true(result.includes('Executing custom command'));
	t.true(result.includes('enhance it'));
});

test('formatHelp returns command name', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Test',
		metadata: {},
	};

	const result = executor.formatHelp(command);
	t.true(result.includes('/test'));
});

test('formatHelp includes parameters', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Test',
		metadata: {
			parameters: ['arg1', 'arg2'],
		},
	};

	const result = executor.formatHelp(command);
	t.true(result.includes('<arg1>'));
	t.true(result.includes('<arg2>'));
});

test('formatHelp includes description', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Test',
		metadata: {
			description: 'This is a test command',
		},
	};

	const result = executor.formatHelp(command);
	t.true(result.includes('This is a test command'));
});

test('formatHelp includes aliases', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'namespace:test',
		namespace: 'namespace',
		content: 'Test',
		metadata: {
			aliases: ['t', 'testy'],
		},
	};

	const result = executor.formatHelp(command);
	t.true(result.includes('namespace:t'));
	t.true(result.includes('namespace:testy'));
});

test('formatHelp includes aliases without namespace', t => {
	const command: CustomCommand = {
		name: 'test',
		fullName: 'test',
		namespace: '',
		content: 'Test',
		metadata: {
			aliases: ['t', 'testy'],
		},
	};

	const result = executor.formatHelp(command);
	t.true(result.includes('t, testy'));
});
