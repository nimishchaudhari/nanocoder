import {LangGraphClient} from './langgraph-client.js';
import {appConfig} from './config/index.js';
import {loadPreferences} from './config/preferences.js';
import type {LLMClient, ProviderType, LangChainProviderConfig} from './types/index.js';
import {existsSync} from 'fs';
import {join} from 'path';

export async function createLLMClient(
	provider?: ProviderType,
): Promise<{client: LLMClient; actualProvider: ProviderType}> {
	// Check if agents.config.json exists
	const agentsJsonPath = join(process.cwd(), 'agents.config.json');
	const hasConfigFile = existsSync(agentsJsonPath);
	
	// Always use LangGraph - it handles both tool-calling and non-tool-calling models
	return createLangGraphClient(provider, hasConfigFile);
}

async function createLangGraphClient(
	requestedProvider?: ProviderType,
	hasConfigFile = true,
): Promise<{client: LLMClient; actualProvider: ProviderType}> {
	// Load provider configs
	const providers = loadProviderConfigs();
	
	if (providers.length === 0) {
		if (!hasConfigFile) {
			throw new Error('No agents.config.json found. Please create a configuration file with provider settings.');
		} else {
			throw new Error('No providers configured in agents.config.json');
		}
	}

	// Determine which provider to try first
	let targetProvider: ProviderType;
	if (requestedProvider) {
		targetProvider = requestedProvider;
	} else {
		// Use preferences or default to first available provider
		const preferences = loadPreferences();
		targetProvider = preferences.lastProvider || providers[0].name as ProviderType;
	}

	// Order providers: requested first, then others
	const availableProviders = providers.map(p => p.name as ProviderType);
	const providerOrder = [
		targetProvider,
		...availableProviders.filter(p => p !== targetProvider)
	];

	const errors: string[] = [];

	for (const providerType of providerOrder) {
		try {
			const providerConfig = providers.find(p => p.name === providerType);
			if (!providerConfig) {
				continue;
			}

			// Test provider connection
			await testProviderConnection(providerConfig);
			
			const client = await LangGraphClient.create(providerConfig);
			
			return { client, actualProvider: providerType };
			
		} catch (error: any) {
			errors.push(`${providerType}: ${error.message}`);
		}
	}

	// If we get here, all providers failed
	if (!hasConfigFile) {
		const combinedError = `No providers available: ${errors[0]?.split(': ')[1] || 'Unknown error'}\n\nPlease create an agents.config.json file with provider configuration.`;
		throw new Error(combinedError);
	} else {
		const combinedError = `All configured providers failed:\n${errors.map(e => `• ${e}`).join('\n')}\n\nPlease check your provider configuration in agents.config.json`;
		throw new Error(combinedError);
	}
}

function loadProviderConfigs(): LangChainProviderConfig[] {
	const providers: LangChainProviderConfig[] = [];

	// Load providers from the new providers array structure
	if (appConfig.providers) {
		for (const provider of appConfig.providers) {
			providers.push({
				name: provider.name,
				type: 'openai',
				models: provider.models || [],
				config: {
					baseURL: provider.baseUrl,
					apiKey: provider.apiKey || 'dummy-key',
				}
			});
		}
	}

	return providers;
}

async function testProviderConnection(providerConfig: LangChainProviderConfig): Promise<void> {
	// Test local servers for connectivity
	if (providerConfig.config.baseURL && providerConfig.config.baseURL.includes('localhost')) {
		try {
			await fetch(providerConfig.config.baseURL, {
				signal: AbortSignal.timeout(5000)
			});
			// Don't check response.ok as some servers return 404 for root path
			// We just need to confirm the server responded (not a network error)
		} catch (error) {
			// Only throw if it's a network error, not a 404 or other HTTP response
			if (error instanceof TypeError) {
				throw new Error(`Server not accessible at ${providerConfig.config.baseURL}`);
			}
			// For AbortError (timeout), also throw
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Server not accessible at ${providerConfig.config.baseURL}`);
			}
			// Other errors (like HTTP errors) mean the server is responding, so pass
		}
	}
	// Require API key for hosted providers
	if (!providerConfig.config.apiKey && !providerConfig.config.baseURL?.includes('localhost')) {
		throw new Error('API key required for hosted providers');
	}
}