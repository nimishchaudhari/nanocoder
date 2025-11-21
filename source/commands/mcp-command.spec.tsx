import test from 'ava';
import React from 'react';
import {render} from '@testing-library/react';
import {MCP} from './mcp';
import {ToolManager} from '../tools/tool-manager';

// ============================================================================
// Tests for Enhanced MCP Command Display
// ============================================================================

test('MCP command: shows no servers when none connected', t => {
	const mockToolManager = {
		getConnectedServers: () => [],
		getServerTools: () => [],
		getServerInfo: () => undefined,
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show the "No MCP servers connected" message
	t.true(container.textContent.includes('No MCP servers connected'));
});

test('MCP command: displays transport type icons', t => {
	const mockToolManager = {
		getConnectedServers: () => [
			'stdio-server',
			'websocket-server',
			'http-server',
		],
		getServerTools: (serverName: string) => [
			{name: `tool-${serverName}`, description: 'Test tool'},
		],
		getServerInfo: (serverName: string) => ({
			name: serverName,
			transport: serverName.includes('stdio')
				? 'stdio'
				: serverName.includes('websocket')
				? 'websocket'
				: 'http',
			toolCount: 1,
			connected: true,
		}),
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show transport icons
	t.true(container.textContent.includes('💻')); // stdio icon
	t.true(container.textContent.includes('🔄')); // websocket icon
	t.true(container.textContent.includes('🌐')); // http icon

	// Should show transport type names
	t.true(container.textContent.includes('STDIO'));
	t.true(container.textContent.includes('WEBSOCKET'));
	t.true(container.textContent.includes('HTTP'));
});

test('MCP command: displays URLs for remote servers', t => {
	const mockToolManager = {
		getConnectedServers: () => ['remote-server'],
		getServerTools: () => [{name: 'remote-tool', description: 'Remote tool'}],
		getServerInfo: () => ({
			name: 'remote-server',
			transport: 'http',
			url: 'https://example.com/mcp',
			toolCount: 1,
			connected: true,
		}),
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show the URL for remote server
	t.true(container.textContent.includes('URL: https://example.com/mcp'));
});

test('MCP command: displays server descriptions', t => {
	const mockToolManager = {
		getConnectedServers: () => ['server-with-description'],
		getServerTools: () => [{name: 'test-tool', description: 'Test tool'}],
		getServerInfo: () => ({
			name: 'server-with-description',
			transport: 'stdio',
			toolCount: 1,
			connected: true,
			description: 'This is a test server description',
		}),
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show the description
	t.true(container.textContent.includes('This is a test server description'));
});

test('MCP command: displays server tags', t => {
	const mockToolManager = {
		getConnectedServers: () => ['server-with-tags'],
		getServerTools: () => [{name: 'test-tool', description: 'Test tool'}],
		getServerInfo: () => ({
			name: 'server-with-tags',
			transport: 'http',
			toolCount: 1,
			connected: true,
			tags: ['documentation', 'remote', 'http'],
		}),
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show the tags with # prefix
	t.true(container.textContent.includes('Tags: #documentation #remote #http'));
});

test('MCP command: displays tool information correctly', t => {
	const mockToolManager = {
		getConnectedServers: () => ['multi-tool-server'],
		getServerTools: () => [
			{name: 'tool-1', description: 'First tool'},
			{name: 'tool-2', description: 'Second tool'},
			{name: 'tool-3', description: 'Third tool'},
		],
		getServerInfo: () => ({
			name: 'multi-tool-server',
			transport: 'stdio',
			toolCount: 3,
			connected: true,
		}),
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show correct tool count
	t.true(container.textContent.includes('3 tools'));

	// Should list tool names
	t.true(container.textContent.includes('Tools:'));
	t.true(container.textContent.includes('tool-1'));
	t.true(container.textContent.includes('tool-2'));
	t.true(container.textContent.includes('tool-3'));
});

test('MCP command: handles singular tool count', t => {
	const mockToolManager = {
		getConnectedServers: () => ['single-tool-server'],
		getServerTools: () => [{name: 'only-tool', description: 'Only tool'}],
		getServerInfo: () => ({
			name: 'single-tool-server',
			transport: 'websocket',
			toolCount: 1,
			connected: true,
		}),
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show singular "tool" (not "tools")
	t.true(container.textContent.includes('1 tool'));
	t.false(container.textContent.includes('1 tools'));
});

test('MCP command: shows server count header', t => {
	const mockToolManager = {
		getConnectedServers: () => ['server-1', 'server-2', 'server-3'],
		getServerTools: () => [],
		getServerInfo: () => ({
			name: 'test-server',
			transport: 'stdio',
			toolCount: 0,
			connected: true,
		}),
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show connected servers count
	t.true(container.textContent.includes('Connected MCP Servers (3):'));
});

test('MCP command: shows configuration examples', t => {
	const mockToolManager = {
		getConnectedServers: () => [],
		getServerTools: () => [],
		getServerInfo: () => undefined,
	} as unknown as ToolManager;

	const Component = () => <MCP toolManager={mockToolManager} />;

	const {container} = render(<Component />);

	// Should show configuration examples with transport field
	t.true(container.textContent.includes('"transport": "stdio"'));
	t.true(container.textContent.includes('"transport": "http"'));

	// Should include transport field in examples
	t.true(container.textContent.includes('"command":'));
	t.true(container.textContent.includes('"url":'));
});

test('MCP command: uses transport type getTransportIcon function correctly', t => {
	// Test the helper function indirectly through component rendering
	const testCases = [
		{transport: 'stdio', expectedIcon: '💻'},
		{transport: 'websocket', expectedIcon: '🔄'},
		{transport: 'http', expectedIcon: '🌐'},
		{transport: 'unknown', expectedIcon: '❓'},
	];

	for (const testCase of testCases) {
		const mockToolManager = {
			getConnectedServers: () => ['test-server'],
			getServerTools: () => [],
			getServerInfo: () => ({
				name: 'test-server',
				transport: testCase.transport as any,
				toolCount: 0,
				connected: true,
			}),
		} as unknown as ToolManager;

		const Component = () => <MCP toolManager={mockToolManager} />;

		const {container} = render(<Component />);

		// Should show the correct icon for the transport type
		t.true(
			container.textContent.includes(testCase.expectedIcon),
			`Should show ${testCase.expectedIcon} for ${testCase.transport} transport`,
		);
	}
});
