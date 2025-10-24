import React from 'react';
import type {
	Tool,
	ToolHandler,
	MCPInitResult,
	MCPServer,
	MCPTool,
} from '@/types/index';
import {
	tools as staticTools,
	toolRegistry as staticToolRegistry,
	toolFormatters as staticToolFormatters,
	toolValidators as staticToolValidators,
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
 */
export class ToolManager {
	private mcpClient: MCPClient | null = null;
	private mcpAdapter: MCPToolAdapter | null = null;
	private toolRegistry: Record<string, ToolHandler> = {};
	private toolFormatters: Record<string, ToolFormatter> = {};
	private toolValidators: Record<string, ToolValidator> = {};
	private allTools: Tool[] = [];

	constructor() {
		// Initialize with static tools
		this.toolRegistry = {...staticToolRegistry};
		this.toolFormatters = {...staticToolFormatters};
		this.toolValidators = {...staticToolValidators};
		this.allTools = [...staticTools];
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

			// Register MCP tools
			this.mcpAdapter.registerMCPTools(this.toolRegistry);

			// Add MCP tools to the tool list
			const mcpTools = this.mcpClient.getAllTools();
			this.allTools = [...staticTools, ...mcpTools];

			return results;
		}
		return [];
	}

	/**
	 * Get all available tools (static + MCP)
	 */
	getAllTools(): Tool[] {
		return this.allTools;
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
			this.allTools = [...staticTools];
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
