import {LangChainClient} from './langchain-client.js';
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
	
	// Always use LangChain now - convert legacy config format to LangChain providers
	return createLangChainClient(provider, hasConfigFile);
}


async function createLangChainClient(
	requestedProvider?: ProviderType,
	hasConfigFile = true,
): Promise<{client: LLMClient; actualProvider: ProviderType}> {
	// Convert legacy config format to LangChain provider configs
	const providers = convertLegacyConfigToLangChain();
	
	if (providers.length === 0) {
		if (!hasConfigFile) {
			// No config file - suggest creating one
			throw new Error('No agents.config.json found. Please create a configuration file with openRouter or openAICompatible provider settings.');
		} else {
			throw new Error('No providers configured in agents.config.json');
		}
	}

	// Determine which provider to try first
	let targetProvider: ProviderType;
	if (requestedProvider) {
		targetProvider = requestedProvider;
	} else {
		// Use preferences or default to openai-compatible
		const preferences = loadPreferences();
		targetProvider = preferences.lastProvider || 'openai-compatible';
	}

	// Order providers: requested first, then others (only OpenRouter and OpenAI-compatible now)
	const providerOrder = [
		targetProvider,
		...(['openrouter', 'openai-compatible'] as ProviderType[]).filter(p => p !== targetProvider)
	];

	const errors: string[] = [];

	for (const providerType of providerOrder) {
		try {
			const providerConfig = providers.find(p => mapLangChainProviderToType(p) === providerType);
			if (!providerConfig) {
				continue;
			}

			// Test provider connection
			await testLangChainProviderConnection(providerConfig);
			
			const client = await LangChainClient.create(providerConfig);
			
			return { client, actualProvider: providerType };
			
		} catch (error: any) {
			errors.push(`${providerType}: ${error.message}`);
		}
	}

	// If we get here, all providers failed
	if (!hasConfigFile) {
		const combinedError = `No providers available: ${errors[0]?.split(': ')[1] || 'Unknown error'}\n\nPlease create an agents.config.json file with openRouter or openAICompatible configuration.`;
		throw new Error(combinedError);
	} else {
		const combinedError = `All configured providers failed:\n${errors.map(e => `• ${e}`).join('\n')}\n\nPlease check your provider configuration in agents.config.json`;
		throw new Error(combinedError);
	}
}

function convertLegacyConfigToLangChain(): LangChainProviderConfig[] {
	const providers: LangChainProviderConfig[] = [];

	// Convert OpenAI-compatible config
	if (appConfig.openAICompatible?.baseUrl) {
		providers.push({
			name: 'openai-compatible',
			type: 'openai',
			models: appConfig.openAICompatible.models || ['default'],
			config: {
				baseURL: appConfig.openAICompatible.baseUrl,
				apiKey: appConfig.openAICompatible.apiKey || 'dummy-key',
			}
		});
	}

	// Convert OpenRouter config
	if (appConfig.openRouter?.apiKey) {
		providers.push({
			name: 'openrouter',
			type: 'openai',
			models: appConfig.openRouter.models || [],
			config: {
				baseURL: 'https://openrouter.ai/api/v1',
				apiKey: appConfig.openRouter.apiKey,
			}
		});
	}

	return providers;
}

async function testLangChainProviderConnection(providerConfig: LangChainProviderConfig): Promise<void> {
	// For OpenAI-style providers, validate config and test local servers
	if (providerConfig.config.baseURL && providerConfig.config.baseURL.includes('localhost')) {
		try {
			await fetch(providerConfig.config.baseURL, {
				signal: AbortSignal.timeout(5000)
			});
			// Don't check response.ok as some servers return 404 for root path
		} catch (error) {
			throw new Error(`Server not accessible at ${providerConfig.config.baseURL}`);
		}
	}
	if (!providerConfig.config.apiKey && !providerConfig.config.baseURL?.includes('localhost')) {
		throw new Error('API key required for hosted providers');
	}
}

function mapLangChainProviderToType(providerConfig: LangChainProviderConfig): ProviderType {
	// Map based on provider name
	if (providerConfig.name === 'openrouter') {
		return 'openrouter';
	}
	if (providerConfig.name === 'openai-compatible') {
		return 'openai-compatible';
	}
	return 'openai-compatible'; // Default fallback
}
