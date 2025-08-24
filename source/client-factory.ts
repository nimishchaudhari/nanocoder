import {OllamaClient} from './ollama-client.js';
import {OpenRouterClient} from './openrouter-client.js';
import {OpenAICompatibleClient} from './openai-compatible-client.js';
import {appConfig} from './config/index.js';
import {loadPreferences} from './config/preferences.js';
import type {LLMClient, ProviderType} from './types/index.js';
import {Ollama} from 'ollama';
// No longer need message queue imports for error logging
import {existsSync} from 'fs';
import {join} from 'path';

export async function createLLMClient(
	provider?: ProviderType,
): Promise<{client: LLMClient; actualProvider: ProviderType}> {
	// Check if agents.config.json exists
	const agentsJsonPath = join(process.cwd(), 'agents.config.json');
	const hasConfigFile = existsSync(agentsJsonPath);
	
	// If no provider specified, check user preferences (but only if config exists)
	if (!provider) {
		if (hasConfigFile) {
			const preferences = loadPreferences();
			provider = preferences.lastProvider || 'ollama';
		} else {
			// No config file - force Ollama only
			provider = 'ollama';
		}
	}
	
	// If no config file exists but user requested non-Ollama provider, force Ollama
	if (!hasConfigFile && provider !== 'ollama') {
		provider = 'ollama';
	}
	
	// Define available providers based on config file presence
	const allProviders: ProviderType[] = hasConfigFile 
		? ['ollama', 'openrouter', 'openai-compatible']
		: ['ollama'];
	
	// Put the requested provider first, then try others (if config exists)
	const tryOrder = hasConfigFile 
		? [provider, ...allProviders.filter(p => p !== provider)]
		: ['ollama'];
	
	const errors: string[] = [];

	// Try each provider in order
	for (const currentProvider of tryOrder as ProviderType[]) {
		try {
			let client: LLMClient;
			
			if (currentProvider === 'openrouter') {
				client = await createOpenRouterClient();
			} else if (currentProvider === 'openai-compatible') {
				client = await createOpenAICompatibleClient();
			} else {
				// Default to Ollama
				client = await createOllamaClient();
			}
			
			// If we get here, the provider worked
			return {client, actualProvider: currentProvider};
			
		} catch (error: any) {
			const errorMsg = `${currentProvider}: ${error.message}`;
			errors.push(errorMsg);
		}
	}

	// If we get here, all providers failed
	let combinedError: string;
	
	if (!hasConfigFile) {
		// No config file - only tried Ollama
		combinedError = `Ollama unavailable: ${errors[0]?.split(': ')[1] || 'Unknown error'}\n\nPlease install and run Ollama with a model:\n  ollama pull qwen3:0.6b\n\nOr create an agents.config.json file to configure other providers.`;
	} else {
		// Config file exists - tried multiple providers
		combinedError = `All configured providers failed:\n${errors.map(e => `• ${e}`).join('\n')}\n\nPlease either:\n1. Install and run Ollama with a model: ollama pull qwen3:0.6b\n2. Check your provider configuration in agents.config.json`;
	}
	
	throw new Error(combinedError);
}

async function createOllamaClient(): Promise<LLMClient> {
	const ollama = new Ollama();
	const models = await ollama.list();

	if (models.models.length === 0) {
		throw new Error('No Ollama models found');
	}

	const client = new OllamaClient();
	await client.waitForInitialization();
	return client;
}

async function createOpenRouterClient(): Promise<LLMClient> {
	if (!appConfig.openRouter?.apiKey) {
		throw new Error('OpenRouter requires API key in config');
	}
	if (
		!appConfig.openRouter?.models ||
		appConfig.openRouter.models.length === 0
	) {
		throw new Error('OpenRouter requires models array in config');
	}
	return new OpenRouterClient(
		appConfig.openRouter.apiKey,
		appConfig.openRouter.models,
	);
}

async function createOpenAICompatibleClient(): Promise<LLMClient> {
	if (!appConfig.openAICompatible?.baseUrl) {
		throw new Error('OpenAI-compatible API requires baseUrl in config');
	}
	return new OpenAICompatibleClient(
		appConfig.openAICompatible.baseUrl,
		appConfig.openAICompatible.apiKey,
		appConfig.openAICompatible.models,
	);
}
