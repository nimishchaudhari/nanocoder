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
	ollama: {
		installed: boolean;
		running: boolean;
		models: string[];
	};
}

export type ProviderCategory = 'local-server' | 'hosted-api';

export interface ModelEntry {
	name: string;
	// Providers that can serve this model
	providers: string[]; // e.g., ['ollama', 'lmstudio', 'llamacpp'] for local models
	primaryProvider: string; // The main/recommended provider
	providerCategory: ProviderCategory;
	size: string; // "7B", "13B", "70B", "Unknown" for API models
	type: 'local' | 'api';
	requirements: {
		minMemory: number; // GB (minimal for API models)
		recommendedMemory: number; // GB
		minCpuCores: number;
		gpuRequired: boolean;
		gpuMemory?: number; // GB
	};
	capabilities: {
		codingQuality: 1 | 2 | 3 | 4 | 5; // 1=basic, 5=excellent
		agenticTasks: 1 | 2 | 3 | 4 | 5; // 1=poor, 5=excellent
		contextHandling: 1 | 2 | 3 | 4 | 5; // 1=limited, 5=excellent
		longFormCoding: 1 | 2 | 3 | 4 | 5; // 1=struggles, 5=excellent
		toolUsage: 1 | 2 | 3 | 4 | 5; // 1=basic, 5=advanced
	};
	useCases: {
		quickQuestions: boolean;
		simpleEdits: boolean;
		complexRefactoring: boolean;
		multiFileProjects: boolean;
		longWorkflows: boolean;
	};
	limitations: string[]; // ["Requires internet", "Usage costs apply"]
	downloadSize: number; // GB (0 for API models)
	cost: {
		type: 'free' | 'pay-per-use' | 'subscription';
		details: string; // Pricing details
		estimatedDaily?: string; // Estimated daily cost for typical usage
	};
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