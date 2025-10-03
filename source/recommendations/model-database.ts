import {ModelEntry} from '../types/index.js';

export const MODEL_DATABASE: ModelEntry[] = [
	// Models available both locally and via API
	{
		name: 'qwen2.5-coder:32b',
		providers: [
			{name: 'ollama', category: 'local-server'},
			{name: 'lmstudio', category: 'local-server'},
			{name: 'llamacpp', category: 'local-server'},
			{name: 'openrouter', category: 'hosted-api'},
		],
		primaryProvider: 'ollama',
		size: '32B',
		accessMethods: ['local-server', 'hosted-api'],
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
			'Requires significant RAM for local use',
			'Slower inference on CPU-only systems when local',
		],
		downloadSize: 19,
		cost: {
			type: 'free',
			details: 'Free locally, pay-per-use via API (~$0.20-2.00/day)',
			estimatedDaily: 'Free locally',
		},
	},
	{
		name: 'deepseek-coder-v2:16b',
		providers: [
			{name: 'ollama', category: 'local-server'},
			{name: 'lmstudio', category: 'local-server'},
			{name: 'llamacpp', category: 'local-server'},
			{name: 'openrouter', category: 'hosted-api'},
		],
		primaryProvider: 'ollama',
		size: '16B',
		accessMethods: ['local-server', 'hosted-api'],
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
		cost: {
			type: 'free',
			details: 'Free locally, pay-per-use via API',
			estimatedDaily: 'Free locally',
		},
	},
	{
		name: 'qwen2.5-coder:7b',
		providers: [
			{name: 'ollama', category: 'local-server'},
			{name: 'lmstudio', category: 'local-server'},
			{name: 'llamacpp', category: 'local-server'},
		],
		primaryProvider: 'ollama',
		size: '7B',
		accessMethods: ['local-server'],
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
		name: 'llama3.1:8b',
		providers: [
			{name: 'ollama', category: 'local-server'},
			{name: 'lmstudio', category: 'local-server'},
			{name: 'llamacpp', category: 'local-server'},
		],
		primaryProvider: 'ollama',
		size: '8B',
		accessMethods: ['local-server'],
		requirements: {
			minMemory: 8,
			recommendedMemory: 16,
			minCpuCores: 4,
			gpuRequired: false,
			gpuMemory: 6,
		},
		capabilities: {
			codingQuality: 4,
			agenticTasks: 2,
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
		name: 'llama3.2:3b',
		providers: [
			{name: 'ollama', category: 'local-server'},
			{name: 'lmstudio', category: 'local-server'},
			{name: 'llamacpp', category: 'local-server'},
		],
		primaryProvider: 'ollama',
		size: '3B',
		accessMethods: ['local-server'],
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

	// API-only models
	{
		name: 'claude-3.5-sonnet',
		providers: [
			{name: 'openrouter', category: 'hosted-api'},
			{name: 'anthropic', category: 'hosted-api'},
		],
		primaryProvider: 'openrouter',
		size: 'Unknown',
		accessMethods: ['hosted-api'],
		requirements: {
			minMemory: 1,
			recommendedMemory: 2,
			minCpuCores: 1,
			gpuRequired: false,
		},
		capabilities: {
			codingQuality: 5,
			agenticTasks: 5,
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
		providers: [
			{name: 'openai', category: 'hosted-api'},
			{name: 'openrouter', category: 'hosted-api'},
		],
		primaryProvider: 'openai',
		size: 'Unknown',
		accessMethods: ['hosted-api'],
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
			'Higher cost than alternatives',
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
		providers: [
			{name: 'openrouter', category: 'hosted-api'},
			{name: 'deepseek', category: 'hosted-api'},
		],
		primaryProvider: 'openrouter',
		size: '236B',
		accessMethods: ['hosted-api'],
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
		name: 'gpt-4o-mini',
		providers: [
			{name: 'openai', category: 'hosted-api'},
			{name: 'openrouter', category: 'hosted-api'},
		],
		primaryProvider: 'openai',
		size: 'Unknown',
		accessMethods: ['hosted-api'],
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
		providers: [
			{name: 'openrouter', category: 'hosted-api'},
			{name: 'google', category: 'hosted-api'},
		],
		primaryProvider: 'openrouter',
		size: 'Unknown',
		accessMethods: ['hosted-api'],
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
			model.providers.some(p => p.name === provider)
		);
	}

	getModelsByAccessMethod(method: 'local-server' | 'hosted-api'): ModelEntry[] {
		return MODEL_DATABASE.filter(model =>
			model.accessMethods.includes(method)
		);
	}

	getModelByName(name: string, provider?: string): ModelEntry | undefined {
		return MODEL_DATABASE.find(model =>
			model.name === name && (provider ? model.providers.some(p => p.name === provider) : true)
		);
	}

	getLocalModels(): ModelEntry[] {
		return this.getModelsByAccessMethod('local-server');
	}

	getApiModels(): ModelEntry[] {
		return this.getModelsByAccessMethod('hosted-api');
	}

	getDualAccessModels(): ModelEntry[] {
		return MODEL_DATABASE.filter(model =>
			model.accessMethods.includes('local-server') && model.accessMethods.includes('hosted-api')
		);
	}
}

export const modelDatabase = ModelDatabase.getInstance();
