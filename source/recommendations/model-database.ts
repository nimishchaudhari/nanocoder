import {ModelEntry} from '../types/index.js';

export const MODEL_DATABASE: ModelEntry[] = [
	// Local Models (OpenAI-compatible local servers)
	{
		name: 'llama3.1:8b',
		providers: ['ollama', 'lmstudio', 'llamacpp'],
		primaryProvider: 'ollama',
		providerCategory: 'local-server',
		size: '8B',
		type: 'local',
		requirements: {
			minMemory: 8,
			recommendedMemory: 16,
			minCpuCores: 4,
			gpuRequired: false,
			gpuMemory: 6,
		},
		capabilities: {
			codingQuality: 4,
			agenticTasks: 2, // Limited for complex workflows
			contextHandling: 4,
			longFormCoding: 3,
			toolUsage: 3,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: false,
			longWorkflows: false,
		},
		limitations: [
			'May lose context in long conversations',
			'Limited planning abilities for multi-step tasks',
		],
		downloadSize: 4.7,
		cost: {type: 'free', details: 'Local inference only'},
	},
	{
		name: 'qwen2.5-coder:7b',
		providers: ['ollama', 'lmstudio', 'llamacpp'],
		primaryProvider: 'ollama',
		providerCategory: 'local-server',
		size: '7B',
		type: 'local',
		requirements: {
			minMemory: 6,
			recommendedMemory: 12,
			minCpuCores: 4,
			gpuRequired: false,
			gpuMemory: 5,
		},
		capabilities: {
			codingQuality: 4,
			agenticTasks: 3,
			contextHandling: 4,
			longFormCoding: 4,
			toolUsage: 3,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: false,
		},
		limitations: [
			'Limited agentic reasoning for complex multi-step tasks',
		],
		downloadSize: 4.2,
		cost: {type: 'free', details: 'Local inference only'},
	},
	{
		name: 'qwen2.5-coder:32b',
		providers: ['ollama', 'lmstudio', 'llamacpp'],
		primaryProvider: 'ollama',
		providerCategory: 'local-server',
		size: '32B',
		type: 'local',
		requirements: {
			minMemory: 24,
			recommendedMemory: 32,
			minCpuCores: 8,
			gpuRequired: false,
			gpuMemory: 20,
		},
		capabilities: {
			codingQuality: 5,
			agenticTasks: 4,
			contextHandling: 5,
			longFormCoding: 5,
			toolUsage: 4,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: true,
		},
		limitations: [
			'Requires significant RAM',
			'Slower inference on CPU-only systems',
		],
		downloadSize: 19,
		cost: {type: 'free', details: 'Local inference only'},
	},
	{
		name: 'deepseek-coder-v2:16b',
		providers: ['ollama', 'lmstudio', 'llamacpp'],
		primaryProvider: 'ollama',
		providerCategory: 'local-server',
		size: '16B',
		type: 'local',
		requirements: {
			minMemory: 12,
			recommendedMemory: 20,
			minCpuCores: 6,
			gpuRequired: false,
			gpuMemory: 10,
		},
		capabilities: {
			codingQuality: 5,
			agenticTasks: 3,
			contextHandling: 4,
			longFormCoding: 4,
			toolUsage: 3,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: false,
		},
		limitations: [
			'Limited agentic capabilities compared to API models',
		],
		downloadSize: 9.1,
		cost: {type: 'free', details: 'Local inference only'},
	},
	{
		name: 'llama3.2:3b',
		providers: ['ollama', 'lmstudio', 'llamacpp'],
		primaryProvider: 'ollama',
		providerCategory: 'local-server',
		size: '3B',
		type: 'local',
		requirements: {
			minMemory: 4,
			recommendedMemory: 8,
			minCpuCores: 2,
			gpuRequired: false,
			gpuMemory: 3,
		},
		capabilities: {
			codingQuality: 3,
			agenticTasks: 2,
			contextHandling: 3,
			longFormCoding: 2,
			toolUsage: 2,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: false,
			multiFileProjects: false,
			longWorkflows: false,
		},
		limitations: [
			'Limited capabilities for complex tasks',
			'Best for simple questions and basic edits',
		],
		downloadSize: 2.0,
		cost: {type: 'free', details: 'Local inference only'},
	},

	// API Models (Hosted providers)
	{
		name: 'claude-3.5-sonnet',
		providers: ['openrouter', 'anthropic'],
		primaryProvider: 'openrouter',
		providerCategory: 'hosted-api',
		size: 'Unknown',
		type: 'api',
		requirements: {
			minMemory: 1, // Just needs to run the client
			recommendedMemory: 2,
			minCpuCores: 1,
			gpuRequired: false,
		},
		capabilities: {
			codingQuality: 5,
			agenticTasks: 5, // Excellent for complex workflows
			contextHandling: 5,
			longFormCoding: 5,
			toolUsage: 5,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: true,
		},
		limitations: ['Requires internet connection', 'Usage costs apply'],
		downloadSize: 0,
		cost: {
			type: 'pay-per-use',
			details: '$3/1M input tokens, $15/1M output tokens',
			estimatedDaily: '$0.50-5.00 for typical coding sessions',
		},
	},
	{
		name: 'gpt-4o',
		providers: ['openai', 'openrouter'],
		primaryProvider: 'openai',
		providerCategory: 'hosted-api',
		size: 'Unknown',
		type: 'api',
		requirements: {
			minMemory: 1,
			recommendedMemory: 2,
			minCpuCores: 1,
			gpuRequired: false,
		},
		capabilities: {
			codingQuality: 5,
			agenticTasks: 4,
			contextHandling: 5,
			longFormCoding: 5,
			toolUsage: 5,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: true,
		},
		limitations: [
			'Requires internet connection',
			'Higher cost than OpenRouter',
		],
		downloadSize: 0,
		cost: {
			type: 'pay-per-use',
			details: '$2.50/1M input tokens, $10/1M output tokens',
			estimatedDaily: '$1-10 for typical coding sessions',
		},
	},
	{
		name: 'deepseek-coder-v2.5',
		providers: ['openrouter', 'deepseek'],
		primaryProvider: 'openrouter',
		providerCategory: 'hosted-api',
		size: '236B',
		type: 'api',
		requirements: {
			minMemory: 1,
			recommendedMemory: 2,
			minCpuCores: 1,
			gpuRequired: false,
		},
		capabilities: {
			codingQuality: 5,
			agenticTasks: 4,
			contextHandling: 5,
			longFormCoding: 5,
			toolUsage: 4,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: true,
		},
		limitations: ['Requires internet connection'],
		downloadSize: 0,
		cost: {
			type: 'pay-per-use',
			details: '$0.14/1M input tokens, $0.28/1M output tokens',
			estimatedDaily: '$0.10-1.00 for typical coding sessions',
		},
	},
	{
		name: 'qwen2.5-coder-32b-instruct',
		providers: ['openrouter'],
		primaryProvider: 'openrouter',
		providerCategory: 'hosted-api',
		size: '32B',
		type: 'api',
		requirements: {
			minMemory: 1,
			recommendedMemory: 2,
			minCpuCores: 1,
			gpuRequired: false,
		},
		capabilities: {
			codingQuality: 5,
			agenticTasks: 3,
			contextHandling: 4,
			longFormCoding: 4,
			toolUsage: 3,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: false,
		},
		limitations: [
			'Requires internet connection',
			'Limited agentic capabilities',
		],
		downloadSize: 0,
		cost: {
			type: 'pay-per-use',
			details: '$0.20/1M input tokens, $1.00/1M output tokens',
			estimatedDaily: '$0.20-2.00 for typical coding sessions',
		},
	},
	{
		name: 'gpt-4o-mini',
		providers: ['openai', 'openrouter'],
		primaryProvider: 'openai',
		providerCategory: 'hosted-api',
		size: 'Unknown',
		type: 'api',
		requirements: {
			minMemory: 1,
			recommendedMemory: 2,
			minCpuCores: 1,
			gpuRequired: false,
		},
		capabilities: {
			codingQuality: 4,
			agenticTasks: 3,
			contextHandling: 4,
			longFormCoding: 4,
			toolUsage: 4,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: false,
			longWorkflows: false,
		},
		limitations: [
			'Requires internet connection',
			'Limited for complex multi-step tasks',
		],
		downloadSize: 0,
		cost: {
			type: 'pay-per-use',
			details: '$0.15/1M input tokens, $0.60/1M output tokens',
			estimatedDaily: '$0.05-0.50 for typical coding sessions',
		},
	},
	{
		name: 'gemini-2.0-flash-exp',
		providers: ['openrouter', 'google'],
		primaryProvider: 'openrouter',
		providerCategory: 'hosted-api',
		size: 'Unknown',
		type: 'api',
		requirements: {
			minMemory: 1,
			recommendedMemory: 2,
			minCpuCores: 1,
			gpuRequired: false,
		},
		capabilities: {
			codingQuality: 4,
			agenticTasks: 4,
			contextHandling: 5,
			longFormCoding: 4,
			toolUsage: 4,
		},
		useCases: {
			quickQuestions: true,
			simpleEdits: true,
			complexRefactoring: true,
			multiFileProjects: true,
			longWorkflows: true,
		},
		limitations: [
			'Requires internet connection',
			'Experimental model - may have inconsistencies',
		],
		downloadSize: 0,
		cost: {
			type: 'pay-per-use',
			details: '$0/1M input tokens, $0/1M output tokens',
			estimatedDaily: 'Free during experimental phase',
		},
	},
];

export class ModelDatabase {
	private static instance: ModelDatabase;

	static getInstance(): ModelDatabase {
		if (!ModelDatabase.instance) {
			ModelDatabase.instance = new ModelDatabase();
		}
		return ModelDatabase.instance;
	}

	getAllModels(): ModelEntry[] {
		return MODEL_DATABASE;
	}

	getModelsByProvider(provider: string): ModelEntry[] {
		return MODEL_DATABASE.filter(model =>
			model.providers.includes(provider) || model.primaryProvider === provider
		);
	}

	getModelsByProviderCategory(category: 'local-server' | 'hosted-api'): ModelEntry[] {
		return MODEL_DATABASE.filter(model => model.providerCategory === category);
	}

	getModelsByType(type: 'local' | 'api'): ModelEntry[] {
		return MODEL_DATABASE.filter(model => model.type === type);
	}

	getModelByName(name: string, provider?: string): ModelEntry | undefined {
		return MODEL_DATABASE.find(model =>
			model.name === name && (provider ? model.providers.includes(provider) || model.primaryProvider === provider : true)
		);
	}

	getLocalModels(): ModelEntry[] {
		return this.getModelsByType('local');
	}

	getApiModels(): ModelEntry[] {
		return this.getModelsByType('api');
	}

	getFreeModels(): ModelEntry[] {
		return MODEL_DATABASE.filter(model => model.cost.type === 'free');
	}

	getModelsByCapabilityThreshold(capability: keyof ModelEntry['capabilities'], minRating: 1 | 2 | 3 | 4 | 5): ModelEntry[] {
		return MODEL_DATABASE.filter(model => model.capabilities[capability] >= minRating);
	}
}

export const modelDatabase = ModelDatabase.getInstance();