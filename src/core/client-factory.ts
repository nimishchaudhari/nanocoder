import { OllamaClient } from "./ollama-client.js";
import { OpenRouterClient } from "./openrouter-client.js";
import { OpenAICompatibleClient } from "./openai-compatible-client.js";
import { appConfig } from "../config/index.js";
import { loadPreferences } from "../config/preferences.js";
import * as p from "@clack/prompts";
import type { LLMClient, ProviderType } from "../types/index.js";
import { Ollama } from "ollama";
import { endConversation } from "../ui/output.js";
import { blueColor, errorColor } from "../ui/colors.js";

export async function createLLMClient(
  provider?: ProviderType
): Promise<{ client: LLMClient; actualProvider: ProviderType }> {
  p.log.info("Loading preferences...");

  // If no provider specified, check user preferences
  if (!provider) {
    const preferences = loadPreferences();
    provider = preferences.lastProvider || "ollama";
  }

  // Try the preferred/specified provider first
  try {
    if (provider === "openrouter") {
      const client = await createOpenRouterClient();
      return { client, actualProvider: "openrouter" };
    }

    if (provider === "openai-compatible") {
      const client = await createOpenAICompatibleClient();
      return { client, actualProvider: "openai-compatible" };
    }

    // Default to Ollama
    const client = await createOllamaClient();
    return { client, actualProvider: "ollama" };
  } catch (preferredError: any) {
    // If preferred provider failed and it wasn't Ollama, try Ollama as fallback
    if (provider !== "ollama") {
      p.log.error(
        errorColor(`${provider} unavailable: ${preferredError.message}`)
      );
      p.log.info(blueColor("Falling back to Ollama..."));

      try {
        const client = await createOllamaClient();
        return { client, actualProvider: "ollama" };
      } catch (ollamaError: any) {
        p.log.error(
          errorColor(`Ollama unavailable: ${ollamaError.message}\n\nPlease either:\n
1. Install and run Ollama with a model: ollama pull qwen3:0.6b
2. Configure your preferred provider in an \`agents.config.json\` file in the current directory`)
        );

        endConversation();
        process.exit(1);
      }
    } else {
      p.log.error(
        errorColor(`Ollama unavailable: ${preferredError.message}\n\nPlease either:\n
1. Install and run Ollama with a model: ollama pull qwen3:0.6b
2. Configure your preferred provider in an \`agents.config.json\` file in the current directory`)
      );
      endConversation();
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
  if (!appConfig.openRouter?.apiKey) {
    throw new Error("OpenRouter requires API key in config");
  }
  if (
    !appConfig.openRouter?.models ||
    appConfig.openRouter.models.length === 0
  ) {
    throw new Error("OpenRouter requires models array in config");
  }
  return new OpenRouterClient(
    appConfig.openRouter.apiKey,
    appConfig.openRouter.models
  );
}

async function createOpenAICompatibleClient(): Promise<LLMClient> {
  if (!appConfig.openAICompatible?.baseUrl) {
    throw new Error("OpenAI-compatible API requires baseUrl in config");
  }
  return new OpenAICompatibleClient(
    appConfig.openAICompatible.baseUrl,
    appConfig.openAICompatible.apiKey,
    appConfig.openAICompatible.models
  );
}
