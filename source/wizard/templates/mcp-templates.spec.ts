import test from 'ava';
import {MCP_TEMPLATES} from './mcp-templates.js';

test('filesystem template: single directory', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'filesystem');
	t.truthy(template);

	const config = template!.buildConfig({
		allowedDirs: '/home/user/projects',
	});

	t.deepEqual(config.args, [
		'-y',
		'@modelcontextprotocol/server-filesystem',
		'/home/user/projects',
	]);
});

test('filesystem template: multiple comma-separated directories', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'filesystem');
	t.truthy(template);

	const config = template!.buildConfig({
		allowedDirs: '/home/user/projects, /home/user/documents, /tmp',
	});

	t.deepEqual(config.args, [
		'-y',
		'@modelcontextprotocol/server-filesystem',
		'/home/user/projects',
		'/home/user/documents',
		'/tmp',
	]);
});

test('filesystem template: handles extra whitespace', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'filesystem');
	t.truthy(template);

	const config = template!.buildConfig({
		allowedDirs: '  /home/user/projects  ,  /home/user/documents  ,  /tmp  ',
	});

	t.deepEqual(config.args, [
		'-y',
		'@modelcontextprotocol/server-filesystem',
		'/home/user/projects',
		'/home/user/documents',
		'/tmp',
	]);
});

test('filesystem template: filters empty strings', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'filesystem');
	t.truthy(template);

	const config = template!.buildConfig({
		allowedDirs: '/home/user/projects,,/tmp,',
	});

	t.deepEqual(config.args, [
		'-y',
		'@modelcontextprotocol/server-filesystem',
		'/home/user/projects',
		'/tmp',
	]);
});

test('github template: creates config with env', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'github');
	t.truthy(template);

	const config = template!.buildConfig({
		githubToken: 'ghp_test123',
	});

	t.is(config.name, 'github');
	t.deepEqual(config.args, ['-y', '@modelcontextprotocol/server-github']);
	t.deepEqual(config.env, {
		GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_test123',
	});
});

test('postgres template: creates config with connection string', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'postgres');
	t.truthy(template);

	const config = template!.buildConfig({
		connectionString: 'postgresql://user:pass@localhost:5432/db',
	});

	t.is(config.name, 'postgres');
	t.deepEqual(config.args, ['-y', '@modelcontextprotocol/server-postgres']);
	t.deepEqual(config.env, {
		POSTGRES_CONNECTION_STRING: 'postgresql://user:pass@localhost:5432/db',
	});
});

test('brave-search template: creates config with API key', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'brave-search');
	t.truthy(template);

	const config = template!.buildConfig({
		braveApiKey: 'test-api-key',
	});

	t.is(config.name, 'brave-search');
	t.deepEqual(config.args, ['-y', '@modelcontextprotocol/server-brave-search']);
	t.deepEqual(config.env, {
		BRAVE_API_KEY: 'test-api-key',
	});
});

test('fetch template: creates config without env when no user agent', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'fetch');
	t.truthy(template);

	const config = template!.buildConfig({
		userAgent: '',
	});

	t.is(config.name, 'fetch');
	t.deepEqual(config.args, ['-y', '@modelcontextprotocol/server-fetch']);
	t.is(config.env, undefined);
});

test('fetch template: creates config with env when user agent provided', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'fetch');
	t.truthy(template);

	const config = template!.buildConfig({
		userAgent: 'CustomBot/1.0',
	});

	t.is(config.name, 'fetch');
	t.deepEqual(config.args, ['-y', '@modelcontextprotocol/server-fetch']);
	t.deepEqual(config.env, {
		USER_AGENT: 'CustomBot/1.0',
	});
});

test('custom template: single arg', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: 'node',
		args: 'server.js',
	});

	t.is(config.name, 'my-server');
	t.is(config.command, 'node');
	t.deepEqual(config.args, ['server.js']);
});

test('custom template: multiple space-separated args', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: 'python',
		args: '-m server --port 8000 --host localhost',
	});

	t.is(config.name, 'my-server');
	t.is(config.command, 'python');
	t.deepEqual(config.args, ['-m', 'server', '--port', '8000', '--host', 'localhost']);
});

test('custom template: handles extra whitespace in args', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: 'node',
		args: '  server.js   --verbose  ',
	});

	t.deepEqual(config.args, ['server.js', '--verbose']);
});

test('custom template: filters empty strings in args', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: 'node',
		args: 'server.js  --verbose',
	});

	t.deepEqual(config.args, ['server.js', '--verbose']);
});

test('custom template: no args', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: '/usr/local/bin/my-command',
		args: '',
	});

	t.is(config.name, 'my-server');
	t.is(config.command, '/usr/local/bin/my-command');
	t.deepEqual(config.args, []);
});

test('custom template: with environment variables', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: 'node',
		args: 'server.js',
		envVars: 'PORT=8000\nHOST=localhost\nDEBUG=true',
	});

	t.deepEqual(config.env, {
		PORT: '8000',
		HOST: 'localhost',
		DEBUG: 'true',
	});
});

test('custom template: handles env vars with = in value', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: 'node',
		args: 'server.js',
		envVars: 'DB_URL=postgresql://user:pass=word@localhost:5432/db',
	});

	t.deepEqual(config.env, {
		DB_URL: 'postgresql://user:pass=word@localhost:5432/db',
	});
});

test('custom template: handles empty env var lines', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'custom');
	t.truthy(template);

	const config = template!.buildConfig({
		serverName: 'my-server',
		command: 'node',
		args: 'server.js',
		envVars: 'PORT=8000\n\n\nHOST=localhost\n',
	});

	t.deepEqual(config.env, {
		PORT: '8000',
		HOST: 'localhost',
	});
});
