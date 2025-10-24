import type {ProviderConfig} from '../types/config';
import type {McpServerConfig} from './templates/mcp-templates';

interface ValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

interface ProviderTestResult {
	providerName: string;
	connected: boolean;
	error?: string;
}

/**
 * Validates the structure of the configuration object
 */
export function validateConfig(
	providers: ProviderConfig[],
	mcpServers: Record<string, McpServerConfig>,
): ValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Validate providers
	if (providers.length === 0) {
		warnings.push(
			'No providers configured. Nanocoder requires at least one provider to function.',
		);
	}

	for (const provider of providers) {
		if (!provider.name) {
			errors.push('Provider missing name');
		}

		if (!provider.models || provider.models.length === 0) {
			errors.push(`Provider "${provider.name}" has no models configured`);
		}

		// Validate base URL if present
		if (provider.baseUrl) {
			try {
				new URL(provider.baseUrl);
			} catch {
				errors.push(
					`Provider "${provider.name}" has invalid base URL: ${provider.baseUrl}`,
				);
			}
		}
	}

	// Validate MCP servers
	for (const [name, server] of Object.entries(mcpServers)) {
		if (!server.command) {
			errors.push(`MCP server "${name}" missing command`);
		}

		if (!server.args) {
			errors.push(`MCP server "${name}" missing args array`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Tests connectivity to a provider
 */
export async function testProviderConnection(
	provider: ProviderConfig,
	timeout = 5000,
): Promise<ProviderTestResult> {
	// If no base URL, assume it's valid (will be validated when actually connecting)
	if (!provider.baseUrl) {
		return {
			providerName: provider.name,
			connected: true,
		};
	}

	try {
		const url = new URL(provider.baseUrl);

		// Only test localhost connections (don't want to spam cloud APIs)
		if (
			!url.hostname.includes('localhost') &&
			!url.hostname.includes('127.0.0.1')
		) {
			return {
				providerName: provider.name,
				connected: true, // Assume cloud APIs are reachable
			};
		}

		// Test localhost connection with a simple fetch
		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, timeout);

		const response = await fetch(provider.baseUrl, {
			method: 'GET',
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		return {
			providerName: provider.name,
			connected: response.ok || response.status === 404, // 404 is ok, server is running
		};
	} catch (error) {
		return {
			providerName: provider.name,
			connected: false,
			error:
				error instanceof Error
					? error.message
					: 'Unknown error testing connection',
		};
	}
}

/**
 * Builds the final configuration object
 */
export function buildConfigObject(
	providers: ProviderConfig[],
	mcpServers: Record<string, McpServerConfig>,
): Record<string, any> {
	const config: Record<string, any> = {
		nanocoder: {
			providers: providers.map(p => {
				const providerConfig: Record<string, any> = {
					name: p.name,
					models: p.models,
				};

				if (p.baseUrl) {
					providerConfig.baseUrl = p.baseUrl;
				}

				if (p.apiKey) {
					providerConfig.apiKey = p.apiKey;
				}

				if (p.organizationId) {
					providerConfig.organizationId = p.organizationId;
				}

				if (p.timeout) {
					providerConfig.timeout = p.timeout;
				}

				return providerConfig;
			}),
		},
	};

	// Add MCP servers if any
	if (Object.keys(mcpServers).length > 0) {
		config.nanocoder.mcpServers = mcpServers;
	}

	return config;
}
