import { OllamaClient } from "./ollama-client.js";
import { OpenRouterClient } from "./openrouter-client.js";
import { appConfig } from "../config/index.js";
import * as p from "@clack/prompts";
import type { LLMClient, ProviderType } from "../types/index.js";
import { Ollama } from "ollama";

export async function createLLMClient(
  provider: ProviderType = "ollama"
): Promise<LLMClient> {
  // If user explicitly requests OpenRouter, try that first
  if (provider === "openrouter") {
    return await createOpenRouterClient();
  }

  // Default flow: Try Ollama first, fallback to OpenRouter
  try {
    return await createOllamaClient();
  } catch (ollamaError: any) {
    p.log.warn(`Ollama unavailable: ${ollamaError.message}`);
    p.log.info("Falling back to OpenRouter...");

    try {
      return await createOpenRouterClient();
    } catch (openRouterError: any) {
      p.log.error("Both Ollama and OpenRouter are unavailable.");
      p.log.error("Please either:");
      p.log.error("1. Install and run Ollama with a model: 'ollama pull qwen3:0.6b'");
      p.log.error("2. Configure OpenRouter in agents.config.json");
      process.exit(1);
    }
  }
}

async function createOllamaClient(): Promise<LLMClient> {
  const ollama = new Ollama();
  const models = await ollama.list();

  if (models.models.length === 0) {
    throw new Error("No Ollama models found");
  }

  const client = new OllamaClient();
  await client.waitForInitialization();
  return client;
}

async function createOpenRouterClient(): Promise<LLMClient> {
  if (!appConfig.openRouterApiKey) {
    throw new Error("OpenRouter requires API key in config");
  }
  if (!appConfig.openRouterModels || appConfig.openRouterModels.length === 0) {
    throw new Error("OpenRouter requires models array in config");
  }
  return new OpenRouterClient(
    appConfig.openRouterApiKey,
    appConfig.openRouterModels
  );
}
