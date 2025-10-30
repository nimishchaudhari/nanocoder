import React from 'react';
import type {
	ToolHandler,
	MCPInitResult,
	MCPServer,
	MCPTool,
	AISDKCoreTool,
} from '@/types/index';
import {
	toolRegistry as staticToolRegistry,
	toolFormatters as staticToolFormatters,
	toolValidators as staticToolValidators,
	nativeToolsRegistry as staticNativeToolsRegistry,
} from '@/tools/index';
import {MCPClient} from '@/mcp/mcp-client';
import {MCPToolAdapter} from '@/mcp/mcp-tool-adapter';

// Tool formatters accept dynamic args from LLM, so any is appropriate here
type ToolFormatter = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
	args: any,
	result?: string,
) =>
	| string
	| Promise<string>
	| React.ReactElement
	| Promise<React.ReactElement>;

type ToolValidator = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
	args: any,
) => Promise<{valid: true} | {valid: false; error: string}>;

/**
 * Manages both static tools and dynamic MCP tools
 * All tools are stored in AI SDK's native CoreTool format
 */
export class ToolManager {
	private mcpClient: MCPClient | null = null;
	private mcpAdapter: MCPToolAdapter | null = null;
	private toolRegistry: Record<string, ToolHandler> = {};
	private toolFormatters: Record<string, ToolFormatter> = {};
	private toolValidators: Record<string, ToolValidator> = {};
	private nativeToolsRegistry: Record<string, AISDKCoreTool> = {};

	constructor() {
		// Initialize with static tools
		this.toolRegistry = {...staticToolRegistry};
		this.toolFormatters = {...staticToolFormatters};
		this.toolValidators = {...staticToolValidators};
		this.nativeToolsRegistry = {...staticNativeToolsRegistry};
	}

	async initializeMCP(
		servers: MCPServer[],
		onProgress?: (result: MCPInitResult) => void,
	): Promise<MCPInitResult[]> {
		if (servers && servers.length > 0) {
			this.mcpClient = new MCPClient();
			this.mcpAdapter = new MCPToolAdapter(this.mcpClient);

			const results = await this.mcpClient.connectToServers(
				servers,
				onProgress,
			);

			// Register MCP tool handlers
			this.mcpAdapter.registerMCPTools(this.toolRegistry);

			// Register MCP native tools
			const mcpNativeTools = this.mcpClient.getNativeToolsRegistry();
			this.nativeToolsRegistry = {
				...staticNativeToolsRegistry,
				...mcpNativeTools,
			};

			return results;
		}
		return [];
	}

	/**
	 * Get all available native AI SDK tools (static + MCP)
	 */
	getAllTools(): Record<string, AISDKCoreTool> {
		return this.nativeToolsRegistry;
	}

	/**
	 * Get the tool registry
	 */
	getToolRegistry(): Record<string, ToolHandler> {
		return this.toolRegistry;
	}

	/**
	 * Get a specific tool handler
	 */
	getToolHandler(toolName: string): ToolHandler | undefined {
		return this.toolRegistry[toolName];
	}

	/**
	 * Get a specific tool formatter
	 */
	getToolFormatter(toolName: string): ToolFormatter | undefined {
		return this.toolFormatters[toolName];
	}

	/**
	 * Get a specific tool validator
	 */
	getToolValidator(toolName: string): ToolValidator | undefined {
		return this.toolValidators[toolName];
	}

	/**
	 * Get native AI SDK tools registry
	 * @deprecated Use getAllTools() instead - they now return the same thing
	 */
	getNativeToolsRegistry(): Record<string, AISDKCoreTool> {
		return this.nativeToolsRegistry;
	}

	/**
	 * Check if a tool exists
	 */
	hasTool(toolName: string): boolean {
		return toolName in this.toolRegistry;
	}

	/**
	 * Check if a tool is an MCP tool and get server info
	 */
	getMCPToolInfo(toolName: string): {isMCPTool: boolean; serverName?: string} {
		if (!this.mcpClient) {
			return {isMCPTool: false};
		}

		const toolMapping = this.mcpClient.getToolMapping();
		const mapping = toolMapping.get(toolName);

		if (mapping) {
			return {
				isMCPTool: true,
				serverName: mapping.serverName,
			};
		}

		return {isMCPTool: false};
	}

	/**
	 * Disconnect MCP servers
	 */
	async disconnectMCP(): Promise<void> {
		if (this.mcpClient && this.mcpAdapter) {
			// Unregister MCP tools
			this.mcpAdapter.unregisterMCPTools(this.toolRegistry);

			// Disconnect from servers
			await this.mcpClient.disconnect();

			// Reset to static tools only
			this.nativeToolsRegistry = {...staticNativeToolsRegistry};
			this.mcpClient = null;
			this.mcpAdapter = null;
		}
	}

	/**
	 * Get connected MCP servers
	 */
	getConnectedServers(): string[] {
		return this.mcpClient?.getConnectedServers() || [];
	}

	/**
	 * Get tools for a specific MCP server
	 */
	getServerTools(serverName: string): MCPTool[] {
		return this.mcpClient?.getServerTools(serverName) || [];
	}
}
