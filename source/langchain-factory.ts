import { ChatOpenAI } from "@langchain/openai";
import { LangChainClient } from "./langchain-client.js";
import { appConfig } from "./config/index.js";
import type { ProviderType } from "./types/core.js";

interface ModelConfig {
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
  model?: string;
  temperature?: number;
  contextSize?: number;
}

export async function createLangChainLLMClient(
  provider?: ProviderType,
  config?: ModelConfig
): Promise<{client: LangChainClient; actualProvider: ProviderType}> {
  // For this refactoring, we only focus on OpenAI-compatible APIs
  provider = provider || 'openai-compatible';
  
  // Validate that we're working with OpenAI-compatible provider
  if (provider !== 'openai-compatible' && provider !== 'openrouter') {
    throw new Error(`This refactoring only supports OpenAI-compatible APIs. Provider: ${provider}`);
  }
  
  // Get configuration from parameters or appConfig
  let modelConfig: ModelConfig;
  
  if (config) {
    // Use passed configuration
    modelConfig = config;
  } else if (provider === 'openai-compatible' && appConfig.openAICompatible) {
    // Use appConfig for openai-compatible
    modelConfig = {
      baseUrl: appConfig.openAICompatible.baseUrl,
      apiKey: appConfig.openAICompatible.apiKey,
      models: appConfig.openAICompatible.models,
      model: appConfig.openAICompatible.models?.[0],
      temperature: 0.7,
      contextSize: undefined
    };
  } else if (provider === 'openrouter' && appConfig.openRouter) {
    // Use appConfig for openrouter
    modelConfig = {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: appConfig.openRouter.apiKey,
      models: appConfig.openRouter.models,
      model: appConfig.openRouter.models?.[0],
      temperature: 0.7,
      contextSize: undefined
    };
  } else {
    // Fallback defaults
    modelConfig = {
      baseUrl: 'http://localhost:11434/v1', // Default to Ollama's OpenAI API
      apiKey: 'ollama', // Dummy key for Ollama
      models: ['llama3'],
      model: 'llama3',
      temperature: 0.7,
      contextSize: undefined
    };
  }
  
  // Validate required configuration
  if (!modelConfig.baseUrl) {
    throw new Error("Base URL is required for OpenAI-compatible API");
  }
  
  // Set default model if not provided
  if (!modelConfig.model && modelConfig.models && modelConfig.models.length > 0) {
    modelConfig.model = modelConfig.models[0];
  }
  
  // Ensure we have a valid API key for the LangChain OpenAI client
  // For local APIs like Ollama, we can use any non-empty string as the API key
  // For OpenRouter, we need a real API key
  let apiKey = modelConfig.apiKey;
  if (!apiKey) {
    // For local APIs, use a dummy key
    if (modelConfig.baseUrl.includes('localhost') || modelConfig.baseUrl.includes('127.0.0.1')) {
      apiKey = "ollama"; // Dummy key for local APIs
    } else {
      // For remote APIs, check if we have an API key in environment variables
      if (provider === 'openai-compatible') {
        apiKey = process.env.OPENAI_API_KEY || "ollama"; // Fallback to dummy key
      } else if (provider === 'openrouter') {
        apiKey = process.env.OPENROUTER_API_KEY || ""; // OpenRouter requires a real key
      }
    }
  }
  
  // Create LangChain model
  const model = new ChatOpenAI({
    modelName: modelConfig.model,
    apiKey: apiKey,
    temperature: modelConfig.temperature,
    configuration: {
      baseURL: modelConfig.baseUrl
    }
  });
  
  // Create client
  const client = new LangChainClient(provider, model, modelConfig.model, modelConfig.contextSize);
  
  // Initialize the client
  await client.initialize(modelConfig.baseUrl, modelConfig.apiKey);
  
  return { client, actualProvider: provider };
}