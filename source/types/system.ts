export interface SystemCapabilities {
	cpu: {
		cores: number;
		architecture: string;
	};
	memory: {
		total: number; // GB
		available: number; // GB
	};
	gpu: {
		available: boolean;
		type: 'nvidia' | 'amd' | 'apple' | 'intel' | 'none';
		memory?: number; // GB
	};
	platform: NodeJS.Platform;
	network: {
		connected: boolean;
		speed?: 'slow' | 'medium' | 'fast';
	};
}

export type ProviderCategory = 'local-server' | 'hosted-api';

export interface ProviderInfo {
	name: string;
	category: ProviderCategory;
}

export interface ModelEntry {
	name: string;
	author: string; // Model creator/organization (e.g., "Meta", "Anthropic", "Qwen")
	size: string; // "7B", "13B", "70B", "Unknown" for API models
	local: boolean; // Can be run locally (Ollama, etc.)
	api: boolean; // Available via hosted API (OpenRouter, etc.)
	minMemoryGB?: number; // Minimum RAM needed (only for local models, GPU always recommended)
	// Quality ratings (0-10 scale, 0 = not supported)
	quality: {
		agentic: number; // Tool use, instruction following, multi-file reasoning for coding tasks
		local: number; // Feasibility to run locally (0 = proprietary/impossible, 10 = easy to run locally)
		cost: number; // Cost-effectiveness (10 = free/cheap, 0 = very expensive)
	};
	// Cost info
	costType: 'free' | 'paid';
	costDetails?: string; // e.g., "$0.15/1M tokens" or "Free via Ollama"
}

export interface ProviderRecommendation {
	provider: string;
	providerCategory: ProviderCategory;
	priority: 'high' | 'medium' | 'low';
	reasoning: string[];
	setupInstructions: string;
	models: ModelRecommendation[];
	isConfigured?: boolean; // Whether this provider is in agents.config.json
	isRunning?: boolean; // For local servers
}

export interface ModelRecommendation {
	model: ModelEntry;
	compatibility: 'perfect' | 'good' | 'marginal' | 'incompatible';
	warnings: string[]; // ["May be slow on your system", "Limited agentic capabilities"]
	recommendation: string; // "Excellent for complex coding tasks"
}
