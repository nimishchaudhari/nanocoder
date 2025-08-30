import {appConfig} from './config/index.js';
import {loadPreferences} from './config/preferences.js';
import type {LLMClient, ProviderType} from './types/index.js';
import {existsSync} from 'fs';
import {join} from 'path';
import {createLangChainLLMClient} from './langchain-factory.js';

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
			provider = preferences.lastProvider || 'openai-compatible';
		} else {
			// No config file - force OpenAI-compatible only
			provider = 'openai-compatible';
		}
	}
	
	// If no config file exists but user requested non-supported provider, force OpenAI-compatible
	if (!hasConfigFile && provider !== 'openai-compatible' && provider !== 'openrouter') {
		provider = 'openai-compatible';
	}
	
	// Define available providers based on config file presence
	const allProviders: ProviderType[] = hasConfigFile 
		? ['openai-compatible', 'openrouter']
		: ['openai-compatible'];
	
	// Put the requested provider first, then try others (if config exists)
	const tryOrder = hasConfigFile 
		? [provider, ...allProviders.filter(p => p !== provider)]
		: ['openai-compatible'];
	
	const errors: string[] = [];

	// Try each provider in order
	for (const currentProvider of tryOrder as ProviderType[]) {
		try {
			// Only try OpenAI-compatible and OpenRouter providers
			if (currentProvider === 'openai-compatible' || currentProvider === 'openrouter') {
				// Pass configuration from appConfig to the LangChain factory
				let config;
				if (currentProvider === 'openai-compatible') {
					if (!appConfig.openAICompatible?.baseUrl) {
						throw new Error('OpenAI-compatible API requires baseUrl in config');
					}
					config = {
						baseUrl: appConfig.openAICompatible.baseUrl,
						apiKey: appConfig.openAICompatible.apiKey,
						models: appConfig.openAICompatible.models,
						model: appConfig.openAICompatible.models?.[0],
					};
				} else {
					// OpenRouter
					if (!appConfig.openRouter?.apiKey) {
						throw new Error('OpenRouter requires API key in config');
					}
					if (!appConfig.openRouter?.models || appConfig.openRouter.models.length === 0) {
						throw new Error('OpenRouter requires models array in config');
					}
					config = {
						baseUrl: "https://openrouter.ai/api/v1",
						apiKey: appConfig.openRouter.apiKey,
						models: appConfig.openRouter.models,
						model: appConfig.openRouter.models?.[0],
					};
				}
				
				const result = await createLangChainLLMClient(currentProvider, config);
				return result;
			}
		} catch (error: any) {
			const errorMsg = `${currentProvider}: ${error.message}`;
			errors.push(errorMsg);
		}
	}

  // If we get here, all providers failed
  let combinedError: string;
  
  if (!hasConfigFile) {
    // No config file - only tried OpenAI-compatible
    combinedError = `OpenAI-compatible API unavailable: ${errors[0]?.split(': ')[1] || 'Unknown error'}\n\n` +
      `Please ensure your OpenAI-compatible API is running and configured properly.`;
  } else {
    // Config file exists - tried multiple providers
    combinedError = `All configured providers failed:\n${errors.map(e => `• ${e}`).join('\n')}\n\n` +
      `Please check your provider configuration in agents.config.json`;
  }
  
  throw new Error(combinedError);
}

