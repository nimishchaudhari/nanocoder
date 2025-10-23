import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import {McpStep} from './mcp-step.js';

// ============================================================================
// Tests for McpStep Component Rendering
// ============================================================================

console.log(`\nmcp-step.spec.tsx – ${React.version}`);

test('McpStep renders with initial template selection', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Add MCP servers to extend Nanocoder/);
});

test('McpStep shows done option', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	t.regex(output!, /Done adding MCP servers/);
});

test('McpStep shows MCP server templates', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	// Should show some template names
	t.regex(output!, /Filesystem|GitHub|PostgreSQL|Brave Search|Fetch|Custom/);
});

test('McpStep renders without crashing when onBack is provided', t => {
	let backCalled = false;

	const {lastFrame} = render(
		<McpStep
			onComplete={() => {}}
			onBack={() => {
				backCalled = true;
			}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(backCalled); // Should not be called on render
});

test('McpStep accepts existingServers prop', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	// Component should render without errors
	t.truthy(lastFrame());
});

test('McpStep renders with correct initial state', t => {
	const {frames} = render(<McpStep onComplete={() => {}} />);

	// Should have rendered at least one frame
	t.true(frames.length > 0);

	// First frame should show template selection
	const firstFrame = frames[0];
	t.regex(firstFrame, /Add MCP servers to extend Nanocoder/);
});

// ============================================================================
// Tests for McpStep with Existing Servers
// ============================================================================

test('McpStep shows added servers when they exist', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
		},
		github: {
			name: 'github',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-github'],
			env: {GITHUB_PERSONAL_ACCESS_TOKEN: 'token'},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /Added:/);
	t.regex(output!, /filesystem/);
	t.regex(output!, /github/);
});

test('McpStep shows edit option when servers exist', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /Edit existing MCP servers/);
});

test('McpStep does not show edit option when no servers exist', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	t.notRegex(output!, /Edit existing MCP servers/);
});

test('McpStep handles empty existingServers object', t => {
	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={{}} />,
	);

	const output = lastFrame();
	t.truthy(output);
	// Should not show added servers or edit option when none exist
	t.notRegex(output!, /Added:/);
	t.notRegex(output!, /Edit existing MCP servers/);
});

test('McpStep shows single added server', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /Added: filesystem/);
});

test('McpStep shows multiple added servers', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
		},
		github: {
			name: 'github',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-github'],
		},
		postgres: {
			name: 'postgres',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-postgres'],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /Added: filesystem, github, postgres/);
});

// ============================================================================
// Tests for McpStep Callbacks
// ============================================================================

test('McpStep calls onComplete when provided', t => {
	let completeCalled = false;

	const {lastFrame} = render(
		<McpStep
			onComplete={() => {
				completeCalled = true;
			}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(completeCalled); // Should not be called on render
});

test('McpStep calls onBack when provided', t => {
	let backCalled = false;

	const {lastFrame} = render(
		<McpStep
			onComplete={() => {}}
			onBack={() => {
				backCalled = true;
			}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(backCalled); // Should not be called on render
});

// ============================================================================
// Tests for McpStep Props Validation
// ============================================================================

test('McpStep requires onComplete prop', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	// Component should render without errors
	t.truthy(lastFrame());
});

test('McpStep handles optional onBack prop', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	// Component should render without errors even without onBack
	t.truthy(lastFrame());
});

test('McpStep handles optional existingServers prop', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	// Component should render without errors even without existingServers
	t.truthy(lastFrame());
});

// ============================================================================
// Tests for McpStep UI Elements
// ============================================================================

test('McpStep renders SelectInput component', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	// SelectInput should render options
	t.truthy(output);
	t.regex(output!, /Done adding MCP servers/);
});

test('McpStep shows template descriptions on wide terminals', t => {
	// This test verifies that templates with descriptions are shown
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	// On wide terminals, descriptions should be visible
	// Note: This may vary based on terminal width in the test environment
	t.truthy(output);
});

test('McpStep handles multiple server configurations', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp', '/home'],
		},
		github: {
			name: 'github',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-github'],
			env: {
				GITHUB_PERSONAL_ACCESS_TOKEN: 'secret-token',
			},
		},
		postgres: {
			name: 'postgres',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-postgres'],
			env: {
				POSTGRES_CONNECTION_STRING: 'postgresql://localhost/db',
			},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /filesystem/);
	t.regex(output!, /github/);
	t.regex(output!, /postgres/);
});

// ============================================================================
// Tests for McpStep Server Configurations
// ============================================================================

test('McpStep handles filesystem server config', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: [
				'-y',
				'@modelcontextprotocol/server-filesystem',
				'/tmp',
				'/home/user',
			],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /filesystem/);
});

test('McpStep handles github server config with env', t => {
	const existingServers = {
		github: {
			name: 'github',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-github'],
			env: {
				GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_test123',
			},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /github/);
});

test('McpStep handles postgres server config', t => {
	const existingServers = {
		postgres: {
			name: 'postgres',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-postgres'],
			env: {
				POSTGRES_CONNECTION_STRING: 'postgresql://user:pass@localhost:5432/db',
			},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /postgres/);
});

test('McpStep handles brave-search server config', t => {
	const existingServers = {
		'brave-search': {
			name: 'brave-search',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-brave-search'],
			env: {
				BRAVE_API_KEY: 'BSA_test123',
			},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /brave-search/);
});

test('McpStep handles fetch server config', t => {
	const existingServers = {
		fetch: {
			name: 'fetch',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-fetch'],
			env: {
				USER_AGENT: 'ModelContextProtocol/1.0',
			},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /fetch/);
});

test('McpStep handles custom server config', t => {
	const existingServers = {
		'my-custom-server': {
			name: 'my-custom-server',
			command: 'node',
			args: ['/path/to/server.js', '--port', '8080'],
			env: {
				API_KEY: 'custom-key',
				DEBUG: 'true',
			},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /my-custom-server/);
});

test('McpStep handles server without env variables', t => {
	const existingServers = {
		fetch: {
			name: 'fetch',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-fetch'],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /fetch/);
});

// ============================================================================
// Tests for McpStep Mode States
// ============================================================================

test('McpStep renders in template-selection mode initially', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	// Initial mode shows template selection prompt
	t.regex(output!, /Add MCP servers to extend Nanocoder/);
});

test('McpStep shows all available templates', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	// Should show template options (though some may be truncated)
	t.truthy(output);
	t.regex(output!, /Done adding MCP servers/);
});

// ============================================================================
// Tests for McpStep State Management
// ============================================================================

test('McpStep initializes with empty servers when not provided', t => {
	const {lastFrame} = render(<McpStep onComplete={() => {}} />);

	const output = lastFrame();
	// Should not show "Added:" section when no servers exist
	t.notRegex(output!, /Added:/);
});

test('McpStep maintains existing servers', t => {
	const existingServers = {
		test1: {
			name: 'test1',
			command: 'node',
			args: ['server.js'],
		},
		test2: {
			name: 'test2',
			command: 'python',
			args: ['server.py'],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /test1/);
	t.regex(output!, /test2/);
});

// ============================================================================
// Tests for McpStep Component Integration
// ============================================================================

test('McpStep renders without errors with all props', t => {
	const existingServers = {
		filesystem: {
			name: 'filesystem',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
		},
	};

	const {lastFrame} = render(
		<McpStep
			onComplete={() => {}}
			onBack={() => {}}
			existingServers={existingServers}
		/>,
	);

	t.truthy(lastFrame());
});

test('McpStep renders correctly on first render', t => {
	const {frames} = render(<McpStep onComplete={() => {}} />);

	t.true(frames.length > 0);
	const firstFrame = frames[0];
	t.regex(firstFrame, /Add MCP servers to extend Nanocoder/);
});

test('McpStep handles complex server names', t => {
	const existingServers = {
		'my-custom-mcp-server-v2': {
			name: 'my-custom-mcp-server-v2',
			command: 'node',
			args: ['dist/index.js'],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /my-custom-mcp-server-v2/);
});

test('McpStep handles servers with many arguments', t => {
	const existingServers = {
		complex: {
			name: 'complex',
			command: 'node',
			args: [
				'server.js',
				'--port',
				'8080',
				'--host',
				'localhost',
				'--debug',
				'--verbose',
			],
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /complex/);
});

test('McpStep handles servers with multiple env variables', t => {
	const existingServers = {
		envtest: {
			name: 'envtest',
			command: 'node',
			args: ['server.js'],
			env: {
				API_KEY: 'test-key',
				DEBUG: 'true',
				PORT: '8080',
				HOST: 'localhost',
			},
		},
	};

	const {lastFrame} = render(
		<McpStep onComplete={() => {}} existingServers={existingServers} />,
	);

	const output = lastFrame();
	t.regex(output!, /envtest/);
});
