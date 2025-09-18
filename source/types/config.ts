import type { ProviderType } from "./core.js";
import type { ThemePreset } from "./ui.js";

// LangChain provider configurations
export interface LangChainProviderConfig {
  name: string;
  type: "openai" | "anthropic" | "openai-compatible" | string;
  models: string[];
  config: Record<string, any>;
}

export interface AppConfig {
  // Providers array structure - all OpenAI compatible
  providers?: {
    name: string;
    baseUrl?: string;
    apiKey?: string;
    models: string[];
    [key: string]: any; // Allow additional provider-specific config
  }[];
  
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
  selectedTheme?: ThemePreset;
  trustedDirectories?: string[];
}

export type LogLevel = "silent" | "normal" | "verbose";