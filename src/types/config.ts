import type { ProviderType } from "./core.js";

export interface AppConfig {
  openRouterApiKey?: string;
  openRouterModels?: string[];
  openAICompatible?: {
    baseUrl: string;
    apiKey?: string;
    models?: string[];
  };
  mcpServers?: {
    name: string;
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }[];
}

export interface UserPreferences {
  lastProvider?: ProviderType;
  lastModel?: string;
  providerModels?: {
    [key in ProviderType]?: string;
  };
}

export type LogLevel = "silent" | "normal" | "verbose";