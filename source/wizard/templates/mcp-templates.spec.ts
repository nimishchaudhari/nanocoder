import test from 'ava';
import {MCP_TEMPLATES} from './mcp-templates.js';
import type {McpTransportType} from './mcp-templates.js';

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
	t.deepEqual(config.args, [
		'-m',
		'server',
		'--port',
		'8000',
		'--host',
		'localhost',
	]);
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

// ============================================================================
// Tests for Remote Server Templates (New Feature)
// ============================================================================

test('deepwiki template: builds correct HTTP config', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'deepwiki');
	t.truthy(template);

	const config = template!.buildConfig({});

	t.is(config.name, 'deepwiki');
	t.is(config.transport, 'http');
	t.is(config.url, 'https://mcp.deepwiki.com/mcp');
	t.is(config.timeout, 30000);
	t.is(
		config.description,
		'Remote MCP server for wiki documentation and research',
	);
	t.deepEqual(config.tags, ['remote', 'wiki', 'documentation', 'http']);
});

test('sequential-thinking template: builds correct HTTP config', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'sequential-thinking');
	t.truthy(template);

	const config = template!.buildConfig({});

	t.is(config.name, 'sequential-thinking');
	t.is(config.transport, 'http');
	t.is(config.url, 'https://remote.mcpservers.org/sequentialthinking/mcp');
	t.is(config.timeout, 30000);
	t.is(
		config.description,
		'Remote MCP server for enhanced reasoning and analysis',
	);
	t.deepEqual(config.tags, ['remote', 'reasoning', 'analysis', 'http']);
});

test('context7 template: builds correct HTTP config', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'context7');
	t.truthy(template);

	const config = template!.buildConfig({});

	t.is(config.name, 'context7');
	t.is(config.transport, 'http');
	t.is(config.url, 'https://mcp.context7.com/mcp');
	t.is(config.timeout, 30000);
	t.is(
		config.description,
		'Remote MCP server for contextual information retrieval',
	);
	t.deepEqual(config.tags, ['remote', 'context', 'information', 'http']);
});

test('remote-fetch template: builds correct HTTP config', t => {
	const template = MCP_TEMPLATES.find(t => t.id === 'remote-fetch');
	t.truthy(template);

	const config = template!.buildConfig({});

	t.is(config.name, 'remote-fetch');
	t.is(config.transport, 'http');
	t.is(config.url, 'https://remote.mcpservers.org/fetch/mcp');
	t.is(config.timeout, 30000);
	t.is(
		config.description,
		'Remote MCP server for HTTP requests and web scraping',
	);
	t.deepEqual(config.tags, ['remote', 'http', 'scraping', 'fetch']);
});

test('remote templates: have no required fields', t => {
	const remoteTemplates = [
		'deepwiki',
		'sequential-thinking',
		'context7',
		'remote-fetch',
	];

	for (const templateId of remoteTemplates) {
		const template = MCP_TEMPLATES.find(t => t.id === templateId);
		t.truthy(template, `Remote template ${templateId} not found`);

		// Remote templates should build successfully with empty answers
		const config = template!.buildConfig({});
		t.truthy(
			config,
			`Remote template ${templateId} should build with empty answers`,
		);
		t.is(typeof config.name, 'string');
		t.is(typeof config.transport, 'string');
	}
});

// ============================================================================
// Tests for Transport Field (New Feature)
// ============================================================================

test('all templates: include transport field', t => {
	for (const template of MCP_TEMPLATES) {
		// Generate minimal valid answers
		const answers: Record<string, string> = {};
		for (const field of template.fields) {
			if (field.required) {
				// For transport field, use a valid transport type
				if (field.name === 'transport') {
					answers[field.name] = 'stdio';
				} else if (field.name === 'url' && answers.transport !== 'stdio') {
					answers[field.name] = 'http://example.com'; // Provide URL for remote transports
				} else {
					answers[field.name] = 'test-value';
				}
			}
		}

		// For stdio transport, ensure command is provided even if not required
		if (answers.transport === 'stdio') {
			const commandField = template.fields.find(f => f.name === 'command');
			if (commandField && !answers.command) {
				answers.command = 'node'; // Default command for stdio
			}
		}

		const config = template.buildConfig(answers);

		t.truthy(
			config.transport,
			`Template ${template.id} missing transport field`,
		);

		// Test that transport is a valid type
		const validTransports: McpTransportType[] = ['stdio', 'websocket', 'http'];
		t.true(
			validTransports.includes(config.transport),
			`Template ${template.id} has invalid transport: ${config.transport}`,
		);
	}
});

test('local templates: use stdio transport', t => {
	const localTemplates = [
		'filesystem',
		'github',
		'postgres',
		'brave-search',
		'fetch',
	];

	for (const templateId of localTemplates) {
		const template = MCP_TEMPLATES.find(t => t.id === templateId);
		t.truthy(template, `Template ${templateId} not found`);

		const answers: Record<string, string> = {};
		for (const field of template!.fields) {
			if (field.required) {
				answers[field.name] = 'test-value';
			}
		}

		const config = template!.buildConfig(answers);
		t.is(
			config.transport,
			'stdio',
			`Template ${templateId} should use stdio transport`,
		);
	}
});

test('remote templates: use http transport', t => {
	const remoteTemplates = [
		'deepwiki',
		'sequential-thinking',
		'context7',
		'remote-fetch',
	];

	for (const templateId of remoteTemplates) {
		const template = MCP_TEMPLATES.find(t => t.id === templateId);
		t.truthy(template, `Remote template ${templateId} not found`);

		const config = template!.buildConfig({});
		t.is(
			config.transport,
			'http',
			`Remote template ${templateId} should use http transport`,
		);
	}
});
