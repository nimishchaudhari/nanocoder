import {existsSync, readFileSync} from 'fs';
import {homedir} from 'os';
import {join} from 'path';
import {substituteEnvVars} from '@/config/env-substitution';
import {getConfigPath} from '@/config/paths';
import type {MCPServerConfig} from '@/types/config';
import {logError} from '@/utils/message-queue';

// Configuration source types for tracking where each config came from
export type ConfigSource =
	| 'project-root'
	| 'project-alternative'
	| 'nanocoder-dir'
	| 'claude-dir'
	| 'local-overrides'
	| 'global-config';

export interface MCPServerWithSource {
	server: MCPServerConfig;
	source: ConfigSource;
}

/**
 * Load MCP configuration from project-level files with hierarchical priority
 * Priority order (highest to lowest):
 * 1. .nanocoder/mcp.local.json (local overrides, gitignored, highest priority)
 * 2. .mcp.json (project root)
 * 3. mcp.json (project root)
 * 4. .nanocoder/mcp.json
 * 5. .claude/mcp.json (for Claude Code compatibility)
 * 6. agents.config.json (existing global config, lowest priority)
 */
export function loadProjectMCPConfig(): MCPServerWithSource[] {
	const configLocations = [
		{
			path: join(process.cwd(), '.nanocoder', 'mcp.local.json'),
			source: 'local-overrides' as ConfigSource,
		},
		{
			path: join(process.cwd(), '.mcp.json'),
			source: 'project-root' as ConfigSource,
		},
		{
			path: join(process.cwd(), 'mcp.json'),
			source: 'project-alternative' as ConfigSource,
		},
		{
			path: join(process.cwd(), '.nanocoder', 'mcp.json'),
			source: 'nanocoder-dir' as ConfigSource,
		},
		{
			path: join(process.cwd(), '.claude', 'mcp.json'),
			source: 'claude-dir' as ConfigSource,
		},
	];

	// First, try project-level configuration files
	for (const {path, source} of configLocations) {
		if (existsSync(path)) {
			try {
				const rawData = readFileSync(path, 'utf-8');
				const config = JSON.parse(rawData);

				// Handle both direct MCP server arrays and nested nanocoder.mcpServers format
				// Also support Claude Code's object-based format where mcpServers is an object with named keys
				let mcpServers;
				if (Array.isArray(config)) {
					mcpServers = config;
				} else if (
					config.nanocoder &&
					Array.isArray(config.nanocoder.mcpServers)
				) {
					mcpServers = config.nanocoder.mcpServers;
				} else if (Array.isArray(config.mcpServers)) {
					mcpServers = config.mcpServers;
				} else if (
					config.mcpServers &&
					typeof config.mcpServers === 'object' &&
					!Array.isArray(config.mcpServers)
				) {
					// Claude Code format: { "serverName": { ...serverConfig } }
					mcpServers = Object.entries(config.mcpServers).map(
						([name, serverConfig]) => {
							// Add the name to the server config if it's not already there
							return {
								name,
								...(serverConfig as object),
							};
						},
					);
				} else {
					mcpServers = [];
				}

				if (Array.isArray(mcpServers) && mcpServers.length > 0) {
					// Apply environment variable substitution
					const processedServers = substituteEnvVars(mcpServers);

					return processedServers.map((server: any) => {
						// Type assertion to MCPServerConfig since we know the structure after env substitution
						const typedServer = server as MCPServerConfig;
						return {
							server: {
								name: typedServer.name,
								transport: typedServer.transport,
								command: typedServer.command,
								args: typedServer.args,
								env: typedServer.env,
								url: typedServer.url,
								headers: typedServer.headers,
								auth: typedServer.auth,
								timeout: typedServer.timeout,
								reconnect: typedServer.reconnect,
								description: typedServer.description,
								tags: typedServer.tags,
								enabled: typedServer.enabled,
							},
							source,
						};
					});
				}
			} catch (error) {
				logError(`Failed to load MCP config from ${path}: ${String(error)}`);
			}
		}
	}

	// If no project-level config found, return empty array
	// The global config will be handled separately
	return [];
}

/**
 * Load global MCP configuration from agents.config.json
 * This function mimics the path resolution logic from getClosestConfigFile
 */
export function loadGlobalMCPConfig(): MCPServerWithSource[] {
	// Use the same path resolution logic as getClosestConfigFile but only for global locations
	// (avoiding CWD which is handled by project-level loading)
	const configDir = getConfigPath();

	// First, lets check the $HOME for a hidden file. This should only be for
	// legacy support
	const homePath = join(homedir(), '.agents.config.json');
	if (existsSync(homePath)) {
		return loadMCPConfigFromFile(homePath, 'global-config');
	}

	// Next, lets look for a user level config.
	const configPath = join(configDir, 'agents.config.json');
	if (existsSync(configPath)) {
		return loadMCPConfigFromFile(configPath, 'global-config');
	}

	// Note: We don't check CWD here as that's handled by project-level loading
	return [];
}

// Helper function to load MCP config from a specific file
function loadMCPConfigFromFile(
	filePath: string,
	source: ConfigSource,
): MCPServerWithSource[] {
	try {
		const rawData = readFileSync(filePath, 'utf-8');
		const config = JSON.parse(rawData);

		let mcpServers;
		if (config.nanocoder && Array.isArray(config.nanocoder.mcpServers)) {
			mcpServers = config.nanocoder.mcpServers;
		} else if (
			config.nanocoder &&
			config.nanocoder.mcpServers &&
			typeof config.nanocoder.mcpServers === 'object' &&
			!Array.isArray(config.nanocoder.mcpServers)
		) {
			// Claude Code format: { "serverName": { ...serverConfig } }
			mcpServers = Object.entries(config.nanocoder.mcpServers).map(
				([name, serverConfig]) => {
					// Add the name to the server config if it's not already there
					return {
						name,
						...(serverConfig as object),
					};
				},
			);
		} else {
			mcpServers = [];
		}

		if (Array.isArray(mcpServers) && mcpServers.length > 0) {
			// Apply environment variable substitution
			const processedServers = substituteEnvVars(mcpServers);

			return processedServers.map((server: any) => {
				// Type assertion to MCPServerConfig since we know the structure after env substitution
				const typedServer = server as MCPServerConfig;
				return {
					server: {
						name: typedServer.name,
						transport: typedServer.transport,
						command: typedServer.command,
						args: typedServer.args,
						env: typedServer.env,
						url: typedServer.url,
						headers: typedServer.headers,
						auth: typedServer.auth,
						timeout: typedServer.timeout,
						reconnect: typedServer.reconnect,
						description: typedServer.description,
						tags: typedServer.tags,
						enabled: typedServer.enabled,
					},
					source,
				};
			});
		}
	} catch (error) {
		logError(`Failed to load MCP config from ${filePath}: ${String(error)}`);
	}

	return [];
}

/**
 * Merge project-level and global MCP configurations
 * Project-level configs take precedence over global configs
 */
export function mergeMCPConfigs(
	projectServers: MCPServerWithSource[],
	globalServers: MCPServerWithSource[],
): MCPServerWithSource[] {
	// Create a map of server names to track which source they came from
	const serverMap = new Map<string, MCPServerWithSource>();

	// Add global servers first (lower priority)
	for (const globalServer of globalServers) {
		serverMap.set(globalServer.server.name, globalServer);
	}

	// Add project servers (higher priority) - they will override global ones
	for (const projectServer of projectServers) {
		serverMap.set(projectServer.server.name, projectServer);
	}

	return Array.from(serverMap.values());
}

/**
 * Load all MCP configurations with proper hierarchy and merging
 */
export function loadAllMCPConfigs(): MCPServerWithSource[] {
	const projectServers = loadProjectMCPConfig();
	const globalServers = loadGlobalMCPConfig();

	return mergeMCPConfigs(projectServers, globalServers);
}

/**
 * Get MCP server sources (exported for use in commands)
 */
export function getMcpServerSources(): MCPServerWithSource[] {
	return loadAllMCPConfigs();
}

/**
 * Get the display label for a configuration source
 */
export function getSourceLabel(source: ConfigSource): string {
	const labels: Record<ConfigSource, string> = {
		'project-root': '[project]',
		'project-alternative': '[project]',
		'nanocoder-dir': '[project]',
		'claude-dir': '[project]',
		'local-overrides': '[local]',
		'global-config': '[global]',
	};

	return labels[source];
}

/**
 * Load provider configurations from all available levels (project and global)
 * This mirrors the approach used for MCP servers to support hierarchical loading
 */
export function loadAllProviderConfigs(): any[] {
	const projectProviders = loadProjectProviderConfigs();
	const globalProviders = loadGlobalProviderConfigs();

	// Merge providers with project providers taking precedence over global ones
	// If a provider with the same name exists in both, project version wins
	const providerMap = new Map<string, any>();

	// Add global providers first (lower priority)
	for (const provider of globalProviders) {
		providerMap.set(provider.name, provider);
	}

	// Add project providers (higher priority) - they will override global ones
	for (const provider of projectProviders) {
		providerMap.set(provider.name, provider);
	}

	return Array.from(providerMap.values());
}

/**
 * Load provider configurations from project-level files
 */
function loadProjectProviderConfigs(): any[] {
	// Try to find provider configs in project-level config files
	const configPath = join(process.cwd(), 'agents.config.json');

	if (existsSync(configPath)) {
		try {
			const rawData = readFileSync(configPath, 'utf-8');
			const config = JSON.parse(rawData);

			if (config.nanocoder && Array.isArray(config.nanocoder.providers)) {
				return config.nanocoder.providers;
			} else if (Array.isArray(config.providers)) {
				return config.providers;
			}
		} catch (error) {
			logError(
				`Failed to load project provider config from ${configPath}: ${String(error)}`,
			);
		}
	}

	return [];
}

/**
 * Load provider configurations from global config files using the same path resolution as the original system
 */
function loadGlobalProviderConfigs(): any[] {
	// Use the same path resolution logic as getClosestConfigFile
	const configDir = getConfigPath();

	// Check the $HOME for a hidden file. This should only be for legacy support
	const homePath = join(homedir(), '.agents.config.json');
	if (existsSync(homePath)) {
		const providers = loadProviderConfigFromFile(homePath);
		if (providers.length > 0) {
			return providers;
		}
	}

	// Next, lets look for a user level config.
	const configPath = join(configDir, 'agents.config.json');
	if (existsSync(configPath)) {
		return loadProviderConfigFromFile(configPath);
	}

	// Note: We don't check CWD here as that's handled by project-level loading
	return [];
}

// Helper function to load provider config from a specific file
function loadProviderConfigFromFile(filePath: string): any[] {
	try {
		const rawData = readFileSync(filePath, 'utf-8');
		const config = JSON.parse(rawData);

		if (config.nanocoder && Array.isArray(config.nanocoder.providers)) {
			// Apply environment variable substitution
			const processedProviders = substituteEnvVars(config.nanocoder.providers);
			return processedProviders;
		} else if (Array.isArray(config.providers)) {
			// Apply environment variable substitution
			const processedProviders = substituteEnvVars(config.providers);
			return processedProviders;
		}
	} catch (error) {
		logError(
			`Failed to load provider config from ${filePath}: ${String(error)}`,
		);
	}

	return [];
}
