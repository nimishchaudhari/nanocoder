import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import {SummaryStep} from './summary-step.js';

// ============================================================================
// Tests for SummaryStep Component Rendering
// ============================================================================

console.log(`\nsummary-step.spec.tsx – ${React.version}`);

test('SummaryStep renders configuration summary', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Configuration Summary/);
});

test('SummaryStep shows config location', t => {
	const configPath = '/test/project/agents.config.json';
	const {lastFrame} = render(
		<SummaryStep
			configPath={configPath}
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Location:/);
	t.regex(output!, /agents\.config\.json/);
});

test('SummaryStep shows provider count', t => {
	const providers = [
		{
			name: 'ollama',
			baseUrl: 'http://localhost:11434/v1',
			models: ['llama2'],
		},
		{
			name: 'openrouter',
			baseUrl: 'https://openrouter.ai/api/v1',
			apiKey: 'test-key',
			models: ['gpt-4'],
		},
	];

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={providers}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Providers \(2\):/);
});

test('SummaryStep shows MCP server count', t => {
	const mcpServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem'],
			env: {},
		},
		github: {
			name: 'github',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-github'],
			env: {GITHUB_TOKEN: 'test'},
		},
	};

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={mcpServers}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /MCP Servers \(2\):/);
});

test('SummaryStep displays provider names', t => {
	const providers = [
		{
			name: 'ollama',
			baseUrl: 'http://localhost:11434/v1',
			models: ['llama2'],
		},
	];

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={providers}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /ollama/);
});

test('SummaryStep displays MCP server names', t => {
	const mcpServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem'],
			env: {},
		},
	};

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={mcpServers}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /filesystem/);
});

test('SummaryStep shows warning when no providers configured', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Warning: No providers configured\./);
});

test('SummaryStep shows None when no providers exist', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Providers \(0\):/);
	t.regex(output!, /None/);
});

test('SummaryStep shows None when no MCP servers exist', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /MCP Servers \(0\):/);
	t.regex(output!, /None/);
});

// ============================================================================
// Tests for SummaryStep Component Actions
// ============================================================================

test('SummaryStep shows save configuration option', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Save configuration/);
});

test('SummaryStep shows add more providers option', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Add more providers/);
});

test('SummaryStep shows add more MCP servers option', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Add more MCP servers/);
});

test('SummaryStep shows cancel option', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Cancel \(discard changes\)/);
});

// ============================================================================
// Tests for SummaryStep Component Callbacks
// ============================================================================

test('SummaryStep calls onSave when provided', t => {
	let saveCalled = false;

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {
				saveCalled = true;
			}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(saveCalled); // Should not be called on render
});

test('SummaryStep calls onAddProviders when provided', t => {
	let addProvidersCalled = false;

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {
				addProvidersCalled = true;
			}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(addProvidersCalled); // Should not be called on render
});

test('SummaryStep calls onAddMcpServers when provided', t => {
	let addMcpServersCalled = false;

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {
				addMcpServersCalled = true;
			}}
			onCancel={() => {}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(addMcpServersCalled); // Should not be called on render
});

test('SummaryStep calls onCancel when provided', t => {
	let cancelCalled = false;

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {
				cancelCalled = true;
			}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(cancelCalled); // Should not be called on render
});

test('SummaryStep calls onBack when provided', t => {
	let backCalled = false;

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
			onBack={() => {
				backCalled = true;
			}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(backCalled); // Should not be called on render
});

// ============================================================================
// Tests for SummaryStep Props Validation
// ============================================================================

test('SummaryStep requires all callback props', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	t.truthy(lastFrame());
});

test('SummaryStep handles optional onBack prop', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	t.truthy(lastFrame());
});

// ============================================================================
// Tests for SummaryStep UI Elements
// ============================================================================

test('SummaryStep renders SelectInput component', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Save configuration|Add more providers|Cancel/);
});

test('SummaryStep renders with correct initial state', t => {
	const {frames} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	t.true(frames.length > 0);

	const firstFrame = frames[0];
	t.regex(firstFrame, /Configuration Summary/);
});

test('SummaryStep displays provider details', t => {
	const providers = [
		{
			name: 'ollama',
			baseUrl: 'http://localhost:11434/v1',
			models: ['llama2', 'codellama'],
		},
	];

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={providers}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /ollama/);
});

test('SummaryStep displays MCP server details', t => {
	const mcpServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem'],
			env: {},
		},
	};

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={mcpServers}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /filesystem/);
});

test('SummaryStep renders without crashing', t => {
	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={[]}
			mcpServers={{}}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	t.truthy(lastFrame());
});

test('SummaryStep handles multiple providers and servers', t => {
	const providers = [
		{
			name: 'ollama',
			baseUrl: 'http://localhost:11434/v1',
			models: ['llama2'],
		},
		{
			name: 'openrouter',
			baseUrl: 'https://openrouter.ai/api/v1',
			apiKey: 'test',
			models: ['gpt-4'],
		},
	];

	const mcpServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem'],
			env: {},
		},
		github: {
			name: 'github',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-github'],
			env: {GITHUB_TOKEN: 'test'},
		},
	};

	const {lastFrame} = render(
		<SummaryStep
			configPath="/test/agents.config.json"
			providers={providers}
			mcpServers={mcpServers}
			onSave={() => {}}
			onAddProviders={() => {}}
			onAddMcpServers={() => {}}
			onCancel={() => {}}
		/>,
	);

	const output = lastFrame();
	t.regex(output!, /Providers \(2\):/);
	t.regex(output!, /MCP Servers \(2\):/);
});
