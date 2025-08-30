import type { ProviderType } from "./core.js";

export interface AppConfig {
  openRouter?: {
    apiKey: string;
    models: string[];
  };
  openAICompatible?: {
    baseUrl: string;
    apiKey?: string;
    models?: string[];
  };
  llamaCpp?: {
    baseUrl?: string;
    apiKey?: string;
    models?: string[];
    timeout?: number;
    maxRetries?: number;
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
  lastUpdateCheck?: number;
}

export type LogLevel = "silent" | "normal" | "verbose";