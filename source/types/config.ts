import type {ThemePreset} from '@/types/ui';

// AI provider configurations (OpenAI-compatible)
export interface AIProviderConfig {
	name: string;
	type: string;
	models: string[];
	requestTimeout?: number;
	socketTimeout?: number;
	connectionPool?: {
		idleTimeout?: number;
		cumulativeMaxIdleTimeout?: number;
	};
	config: {
		baseURL?: string;
		apiKey?: string;
		[key: string]: unknown;
	};
}

export interface AppConfig {
  // Existing config from main branch
  theme: 'light' | 'dark';
  autoSave: boolean;
  saveInterval: number;
  maxSessions: number;
  retentionDays: number;
  directory: string;
  // Conflict resolution: merged session config with existing preferences
  sessions: {
    autoSave: boolean;
    saveInterval: number;
    maxSessions: number;
    retentionDays: number;
    directory: string;
  };
}

// Provider configuration type for wizard and config building
export interface ProviderConfig {
	name: string;
	baseUrl?: string;
	apiKey?: string;
	models: string[];
	requestTimeout?: number;
	socketTimeout?: number;
	organizationId?: string;
	timeout?: number;
	connectionPool?: {
		idleTimeout?: number;
		cumulativeMaxIdleTimeout?: number;
	};
	[key: string]: unknown; // Allow additional provider-specific config
}

export interface AppConfig {
	// Providers array structure - all OpenAI compatible
	providers?: {
		name: string;
		baseUrl?: string;
		apiKey?: string;
		models: string[];
		requestTimeout?: number;
		socketTimeout?: number;
		connectionPool?: {
			idleTimeout?: number;
			cumulativeMaxIdleTimeout?: number;
		};
		[key: string]: unknown; // Allow additional provider-specific config
	}[];

	mcpServers?: {
		name: string;
		command: string;
		args?: string[];
		env?: Record<string, string>;
	}[];
}

export interface UserPreferences {
	lastProvider?: string;
	lastModel?: string;
	providerModels?: {
	[key in string]?: string;
	};
	lastUpdateCheck?: number;
	selectedTheme?: ThemePreset;
	trustedDirectories?: string[];
<<<<<<< HEAD
	sessions?: {
	autoSave?: boolean;
		saveInterval?: number;
		maxSessions?: number;
		retentionDays?: number;
		directory?: string;
		maxSizeMB?: number;
		diskSpaceThreshold?: number;
	};
=======
	streamingEnabled?: boolean;
>>>>>>> origin/main
}

