import test from 'ava';
import {MCPClient} from './mcp-client';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the MCP SDK Client
class MockClient {
	async connect() {
		return;
	}

	async listTools() {
		return {
			tools: [
				{
					name: 'test_tool',
					description: 'A test tool',
					inputSchema: {
						type: 'object',
						properties: {
							arg1: {type: 'string'},
						},
					},
				},
			],
		};
	}

	async callTool() {
		return {
			content: [{type: 'text', text: 'Test result'}],
		};
	}

	async close() {
		return;
	}
}

// Mock TransportFactory
const mockTransport = {};

const mockTransportFactory = {
	validateServerConfig: (server: any) => {
		if (!server.transport) {
			return {valid: false, errors: ['transport is required']};
		}
		if (server.transport === 'stdio' && !server.command) {
			return {valid: false, errors: ['stdio transport requires a command']};
		}
		if (server.transport === 'websocket' && !server.url) {
			return {valid: false, errors: ['websocket transport requires a URL']};
		}
		if (server.transport === 'http' && !server.url) {
			return {valid: false, errors: ['http transport requires a URL']};
		}
		return {valid: true, errors: []};
	},
	createTransport: () => mockTransport,
};

console.log(`\nmcp-client.spec.ts`);

// ============================================================================
// Tests for MCPClient - Transport Support
// ============================================================================

test('MCPClient: creates instance successfully', t => {
	const client = new MCPClient();

	t.truthy(client);
	t.is(typeof client.getConnectedServers, 'function');
	t.is(typeof client.getServerTools, 'function');
	t.is(typeof client.getServerInfo, 'function');
	t.is(typeof client.disconnect, 'function');
});

test('MCPClient: normalizeServerConfig adds default stdio transport', t => {
	const client = new MCPClient();
	const server = {
		name: 'test-legacy',
		command: 'node',
		args: ['server.js'],
		transport: undefined as any, // Legacy config
	};

	// Access private method via type assertion for testing
	const normalizeServerConfig = (client as any).normalizeServerConfig.bind(
		client,
	);
	const normalized = normalizeServerConfig(server);

	t.is(normalized.transport, 'stdio');
	t.is(normalized.name, 'test-legacy');
	t.is(normalized.command, 'node');
	t.deepEqual(normalized.args, ['server.js']);
});

test('MCPClient.getServerInfo: returns undefined for non-existent server', t => {
	const client = new MCPClient();
	const serverInfo = client.getServerInfo('non-existent');

	t.is(serverInfo, undefined);
});

test('MCPClient: maintains backward compatibility with existing APIs', t => {
	const client = new MCPClient();

	// Test that all existing methods still exist and are callable
	t.truthy(typeof client.getConnectedServers === 'function');
	t.truthy(typeof client.getServerTools === 'function');
	t.truthy(typeof client.getServerInfo === 'function');
	t.truthy(typeof client.disconnect === 'function');
	t.truthy(typeof client.callTool === 'function');
	t.truthy(typeof client.getAllTools === 'function');
	t.truthy(typeof client.getNativeToolsRegistry === 'function');

	// Test that they return expected types
	const connectedServers = client.getConnectedServers();
	t.true(Array.isArray(connectedServers));

	const serverTools = client.getServerTools('non-existent');
	t.true(Array.isArray(serverTools));
});

test('MCPClient: getConnectedServers returns array', t => {
	const client = new MCPClient();
	const connectedServers = client.getConnectedServers();
	t.true(Array.isArray(connectedServers));
});

test('MCPClient: isServerConnected returns false for non-existent servers', t => {
	const client = new MCPClient();

	// Should return false for any server that hasn't been connected
	t.false(client.isServerConnected('non-existent-server'));
	t.false(client.isServerConnected('another-server'));
	t.false(client.isServerConnected(''));
});

// ============================================================================
// Tests for getAllTools
// ============================================================================

test('MCPClient.getAllTools: returns empty array when no servers connected', t => {
	const client = new MCPClient();
	const tools = client.getAllTools();

	t.true(Array.isArray(tools));
	t.is(tools.length, 0);
});

test('MCPClient.getAllTools: builds tools from connected servers', t => {
	const client = new MCPClient();

	// Simulate connected server by setting internal state directly
	(client as any).serverTools.set('test-server', [
		{
			name: 'tool1',
			description: 'Test tool 1',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
		{
			name: 'tool2',
			description: 'Test tool 2',
			inputSchema: {type: 'object', properties: {arg: {type: 'string'}}},
			serverName: 'test-server',
		},
	]);

	const tools = client.getAllTools();

	t.is(tools.length, 2);
	t.is(tools[0].type, 'function');
	t.is(tools[0].function.name, 'tool1');
	t.true(tools[0].function.description?.includes('[MCP:test-server]'));
	t.is(tools[1].function.name, 'tool2');
	t.true(tools[1].function.description?.includes('[MCP:test-server]'));
});

test('MCPClient.getAllTools: handles tools without description', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('test-server', [
		{
			name: 'tool_no_desc',
			description: undefined,
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const tools = client.getAllTools();

	t.is(tools.length, 1);
	t.is(tools[0].function.name, 'tool_no_desc');
	t.true(tools[0].function.description?.includes('MCP tool from test-server'));
});

test('MCPClient.getAllTools: includes required parameters from schema', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('test-server', [
		{
			name: 'tool_with_required',
			description: 'Tool with required params',
			inputSchema: {
				type: 'object',
				properties: {arg1: {type: 'string'}},
				required: ['arg1'],
			},
			serverName: 'test-server',
		},
	]);

	const tools = client.getAllTools();

	t.is(tools.length, 1);
	t.deepEqual(tools[0].function.parameters.required, ['arg1']);
});

test('MCPClient.getAllTools: handles multiple servers', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('server1', [
		{
			name: 'server1_tool',
			description: 'Server 1 tool',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'server1',
		},
	]);

	(client as any).serverTools.set('server2', [
		{
			name: 'server2_tool',
			description: 'Server 2 tool',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'server2',
		},
	]);

	const tools = client.getAllTools();

	t.is(tools.length, 2);
	t.true(
		tools.some(t => t.function.name === 'server1_tool'),
	);
	t.true(
		tools.some(t => t.function.name === 'server2_tool'),
	);
});

// ============================================================================
// Tests for getToolMapping
// ============================================================================

test('MCPClient.getToolMapping: returns empty map when no servers', t => {
	const client = new MCPClient();
	const mapping = client.getToolMapping();

	t.true(mapping instanceof Map);
	t.is(mapping.size, 0);
});

test('MCPClient.getToolMapping: maps tools to servers', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('test-server', [
		{
			name: 'tool1',
			description: 'Tool 1',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
		{
			name: 'tool2',
			description: 'Tool 2',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const mapping = client.getToolMapping();

	t.is(mapping.size, 2);
	t.deepEqual(mapping.get('tool1'), {
		serverName: 'test-server',
		originalName: 'tool1',
	});
	t.deepEqual(mapping.get('tool2'), {
		serverName: 'test-server',
		originalName: 'tool2',
	});
});

test('MCPClient.getToolMapping: handles multiple servers', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('server1', [
		{
			name: 'tool1',
			description: 'Tool 1',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'server1',
		},
	]);

	(client as any).serverTools.set('server2', [
		{
			name: 'tool2',
			description: 'Tool 2',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'server2',
		},
	]);

	const mapping = client.getToolMapping();

	t.is(mapping.size, 2);
	t.deepEqual(mapping.get('tool1'), {
		serverName: 'server1',
		originalName: 'tool1',
	});
	t.deepEqual(mapping.get('tool2'), {
		serverName: 'server2',
		originalName: 'tool2',
	});
});

// ============================================================================
// Tests for getServerTools
// ============================================================================

test('MCPClient.getServerTools: returns empty array for non-existent server', t => {
	const client = new MCPClient();
	const tools = client.getServerTools('non-existent');

	t.true(Array.isArray(tools));
	t.is(tools.length, 0);
});

test('MCPClient.getServerTools: returns tools for connected server', t => {
	const client = new MCPClient();

	const testTools = [
		{
			name: 'tool1',
			description: 'Tool 1',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
		{
			name: 'tool2',
			description: 'Tool 2',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	];

	(client as any).serverTools.set('test-server', testTools);

	const tools = client.getServerTools('test-server');

	t.is(tools.length, 2);
	t.deepEqual(tools, testTools);
});

// ============================================================================
// Tests for getToolEntries
// ============================================================================

test('MCPClient.getToolEntries: returns empty array when no servers', t => {
	const client = new MCPClient();
	const entries = client.getToolEntries();

	t.true(Array.isArray(entries));
	t.is(entries.length, 0);
});

test('MCPClient.getToolEntries: returns entries with tools and handlers', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('test-server', [
		{
			name: 'test_tool',
			description: 'Test tool',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const entries = client.getToolEntries();

	t.is(entries.length, 1);
	t.is(entries[0].name, 'test_tool');
	t.truthy(entries[0].tool);
	t.truthy(entries[0].handler);
	t.is(typeof entries[0].handler, 'function');
});

test('MCPClient.getToolEntries: includes handler that calls callTool', async t => {
	const client = new MCPClient();

	// Set up mock client
	const mockMCPClient = {
		callTool: async () => 'mocked result',
	};
	(client as any).serverTools.set('test-server', [
		{
			name: 'test_tool',
			description: 'Test tool',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const entries = client.getToolEntries();

	// Note: The handler will fail because there's no actual connected client
	// But we can verify the structure
	t.is(entries.length, 1);
	t.is(entries[0].name, 'test_tool');
	t.is(typeof entries[0].handler, 'function');
});

// ============================================================================
// Tests for callTool error handling
// ============================================================================

test('MCPClient.callTool: throws error for non-existent tool', async t => {
	const client = new MCPClient();

	await t.throwsAsync(
		async () => await client.callTool('non_existent_tool', {}),
		{message: /MCP tool not found/},
	);
});

test('MCPClient.callTool: throws error when client not connected for server', async t => {
	const client = new MCPClient();

	// Add tool mapping without actual client connection
	(client as any).serverTools.set('test-server', [
		{
			name: 'test_tool',
			description: 'Test tool',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	await t.throwsAsync(
		async () => await client.callTool('test_tool', {}),
		{message: /No MCP client connected for server/},
	);
});

// ============================================================================
// Tests for disconnect
// ============================================================================

test('MCPClient.disconnect: clears all state when no servers connected', async t => {
	const client = new MCPClient();

	// Add some mock state
	(client as any).clients.set('mock', {});
	(client as any).transports.set('mock', {});
	(client as any).serverTools.set('mock', []);
	(client as any).serverConfigs.set('mock', {});
	(client as any).isConnected = true;

	await client.disconnect();

	// State should be cleared
	t.is(client.getConnectedServers().length, 0);
	t.is(client.getServerTools('mock').length, 0);
	t.is(client.getServerInfo('mock'), undefined);
});

test('MCPClient.disconnect: handles disconnect when already disconnected', async t => {
	const client = new MCPClient();

	// Should not throw when disconnecting with no connections
	await t.notThrowsAsync(async () => await client.disconnect());
});

// ============================================================================
// Tests for getNativeToolsRegistry
// ============================================================================

test('MCPClient.getNativeToolsRegistry: returns empty object when no servers', t => {
	const client = new MCPClient();
	const registry = client.getNativeToolsRegistry();

	t.true(typeof registry === 'object');
	t.is(Object.keys(registry).length, 0);
});

test('MCPClient.getNativeToolsRegistry: creates tools with needsApproval callback', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('test-server', [
		{
			name: 'test_tool',
			description: 'Test tool',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const registry = client.getNativeToolsRegistry();

	t.is(Object.keys(registry).length, 1);
	t.truthy(registry.test_tool);
	t.truthy(registry.test_tool.description);
	t.truthy(registry.test_tool.needsApproval);
	t.is(typeof registry.test_tool.needsApproval, 'function');
});

test('MCPClient.getNativeToolsRegistry: includes description with server prefix', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('my-server', [
		{
			name: 'my_tool',
			description: 'My tool description',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'my-server',
		},
	]);

	const registry = client.getNativeToolsRegistry();

	t.true(registry.my_tool.description?.includes('[MCP:my-server]'));
	t.true(registry.my_tool.description?.includes('My tool description'));
});

test('MCPClient.getNativeToolsRegistry: generates default description when missing', t => {
	const client = new MCPClient();

	(client as any).serverTools.set('test-server', [
		{
			name: 'tool_no_desc',
			description: undefined,
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const registry = client.getNativeToolsRegistry();

	t.true(registry.tool_no_desc.description?.includes('MCP tool from test-server'));
});

// ============================================================================
// Tests for getServerInfo with connected servers
// ============================================================================

test('MCPClient.getServerInfo: returns info for connected server', t => {
	const client = new MCPClient();

	// Simulate a connected server by setting internal state
	const testConfig = {
		name: 'test-server',
		transport: 'stdio' as const,
		command: 'node',
		args: ['server.js'],
		description: 'Test server',
		tags: ['test', 'demo'],
	};

	const mockClient = {};

	(client as any).clients.set('test-server', mockClient);
	(client as any).serverConfigs.set('test-server', testConfig);
	(client as any).serverTools.set('test-server', [
		{
			name: 'tool1',
			description: 'Tool 1',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
		{
			name: 'tool2',
			description: 'Tool 2',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const serverInfo = client.getServerInfo('test-server');

	t.truthy(serverInfo);
	t.is(serverInfo?.name, 'test-server');
	t.is(serverInfo?.transport, 'stdio');
	t.is(serverInfo?.toolCount, 2);
	t.is(serverInfo?.connected, true);
	t.is(serverInfo?.description, 'Test server');
	t.deepEqual(serverInfo?.tags, ['test', 'demo']);
});

test('MCPClient.getServerInfo: includes URL for remote servers', t => {
	const client = new MCPClient();

	const testConfig = {
		name: 'remote-server',
		transport: 'websocket' as const,
		url: 'ws://localhost:3000',
	};

	const mockClient = {};

	(client as any).clients.set('remote-server', mockClient);
	(client as any).serverConfigs.set('remote-server', testConfig);
	(client as any).serverTools.set('remote-server', []);

	const serverInfo = client.getServerInfo('remote-server');

	t.truthy(serverInfo);
	t.is(serverInfo?.name, 'remote-server');
	t.is(serverInfo?.transport, 'websocket');
	t.is(serverInfo?.url, 'ws://localhost:3000');
});

test('MCPClient.getServerInfo: returns undefined when server not connected', t => {
	const client = new MCPClient();

	const serverInfo = client.getServerInfo('non-existent');

	t.is(serverInfo, undefined);
});

test('MCPClient.getServerInfo: returns undefined when only tools exist', t => {
	const client = new MCPClient();

	// Only set tools, not client or config
	(client as any).serverTools.set('test-server', [
		{
			name: 'tool1',
			description: 'Tool 1',
			inputSchema: {type: 'object', properties: {}},
			serverName: 'test-server',
		},
	]);

	const serverInfo = client.getServerInfo('test-server');

	t.is(serverInfo, undefined);
});
