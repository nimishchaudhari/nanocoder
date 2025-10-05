import {ModelEntry} from '../types/index.js';

/**
export interface ModelEntry {
	name: string;
	size: string; // "7B", "13B", "70B", "Unknown" for API models
	local: boolean; // Can be run locally (Ollama, etc.)
	api: boolean; // Available via hosted API (OpenRouter, etc.)
	minMemoryGB?: number; // Minimum RAM needed (only for local models, GPU always recommended)
	// Quality ratings (1-5 scale)
	quality: {
		coding: number // Overall coding ability
		agentic: number // Multi-step task planning and execution
		tools: number // Function calling and tool usage
	};
	// Cost info
	costType: 'free' | 'paid';
	costDetails?: string; // e.g., "$0.15/1M tokens" or "Free via Ollama"
}
*/

export const MODEL_DATABASE: ModelEntry[] = [
	{
		name: 'gpt-oss-20b',
		author: 'OpenAI',
		size: '20B',
		local: true,
		api: true,
		minMemoryGB: 16,
		quality: {
			coding: 4,
			agentic: 4,
			tools: 4,
		},
		costType: 'free',
		costDetails: 'Free to run locally. API costs vary.',
	},
	{
		name: 'gpt-oss-120b',
		author: 'OpenAI',
		size: '120B',
		local: true,
		api: true,
		minMemoryGB: 80,
		quality: {
			coding: 5,
			agentic: 5,
			tools: 5,
		},
		costType: 'free',
		costDetails: 'Free to run locally. API costs vary.',
	},
	{
		name: 'qwen3-coder:30b',
		author: 'Alibaba',
		size: '30B',
		local: true,
		api: true,
		minMemoryGB: 24,
		quality: {
			coding: 4,
			agentic: 4,
			tools: 4,
		},
		costType: 'free',
		costDetails: 'Free to run locally. API costs vary.',
	},
	{
		name: 'qwen3-coder:480b',
		author: 'Alibaba',
		size: '480B',
		local: true,
		api: true,
		minMemoryGB: 256,
		quality: {
			coding: 8,
			agentic: 8,
			tools: 8,
		},
		costType: 'free',
		costDetails: 'Free to run locally. API costs vary.',
	},
	{
		name: 'glm-4.6',
		author: 'Z.ai',
		size: '357B',
		local: true,
		api: true,
		minMemoryGB: 256,
		quality: {
			coding: 8.5,
			agentic: 8.5,
			tools: 8.5,
		},
		costType: 'free',
		costDetails: 'Free to run locally. API costs vary.',
	},
	{
		name: 'glm-4.5-air',
		author: 'Z.ai',
		size: '110B',
		local: true,
		api: true,
		minMemoryGB: 80,
		quality: {
			coding: 7,
			agentic: 7,
			tools: 7,
		},
		costType: 'free',
		costDetails: 'Free to run locally. API costs vary.',
	},
	{
		name: 'grok-code-fast-1',
		author: 'xAI',
		size: 'Unknown',
		local: false,
		api: true,
		quality: {
			coding: 8,
			agentic: 8,
			tools: 8,
		},
		costType: 'paid',
		costDetails: '$0.20/input, $1.50/output',
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
}

export const modelDatabase = ModelDatabase.getInstance();
