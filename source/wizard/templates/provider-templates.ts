import type {ProviderConfig} from '../../types/config.js';

export interface TemplateField {
	name: string;
	prompt: string;
	default?: string;
	required?: boolean;
	sensitive?: boolean; // For API keys, passwords, etc.
	validator?: (value: string) => string | undefined; // Return error message if invalid
}

export interface ProviderTemplate {
	id: string;
	name: string;
	description: string;
	fields: TemplateField[];
	buildConfig: (answers: Record<string, string>) => ProviderConfig;
}

const urlValidator = (value: string): string | undefined => {
	if (!value) return undefined;
	try {
		new URL(value);
		return undefined;
	} catch {
		return 'Invalid URL format';
	}
};

export const PROVIDER_TEMPLATES: ProviderTemplate[] = [
	{
		id: 'ollama',
		name: 'Ollama',
		description: 'Local LLM inference via Ollama',
		fields: [
			{
				name: 'baseUrl',
				prompt: 'Base URL',
				default: 'http://localhost:11434/v1',
				validator: urlValidator,
			},
			{
				name: 'model',
				prompt: 'Model name',
				default: 'qwen2.5-coder:32b',
				required: true,
			},
		],
		buildConfig: (answers) => ({
			name: 'ollama',
			baseUrl: answers.baseUrl || 'http://localhost:11434/v1',
			models: [answers.model],
		}),
	},
	{
		id: 'openrouter',
		name: 'OpenRouter',
		description: 'Cloud AI via OpenRouter',
		fields: [
			{
				name: 'apiKey',
				prompt: 'API Key',
				required: true,
				sensitive: true,
			},
			{
				name: 'model',
				prompt: 'Model name',
				default: 'anthropic/claude-3.5-sonnet',
				required: true,
			},
			{
				name: 'providerName',
				prompt: 'Provider name',
				default: 'openrouter',
			},
		],
		buildConfig: (answers) => ({
			name: answers.providerName || 'openrouter',
			baseUrl: 'https://openrouter.ai/api/v1',
			apiKey: answers.apiKey,
			models: [answers.model],
		}),
	},
	{
		id: 'openai',
		name: 'OpenAI',
		description: 'OpenAI GPT models',
		fields: [
			{
				name: 'apiKey',
				prompt: 'API Key',
				required: true,
				sensitive: true,
			},
			{
				name: 'model',
				prompt: 'Model name',
				default: 'gpt-4',
				required: true,
			},
			{
				name: 'organizationId',
				prompt: 'Organization ID (optional)',
				required: false,
			},
			{
				name: 'providerName',
				prompt: 'Provider name',
				default: 'openai',
			},
		],
		buildConfig: (answers) => {
			const config: ProviderConfig = {
				name: answers.providerName || 'openai',
				baseUrl: 'https://api.openai.com/v1',
				apiKey: answers.apiKey,
				models: [answers.model],
			};
			if (answers.organizationId) {
				config.organizationId = answers.organizationId;
			}
			return config;
		},
	},
	{
		id: 'anthropic',
		name: 'Anthropic Claude',
		description: 'Anthropic Claude models',
		fields: [
			{
				name: 'apiKey',
				prompt: 'API Key',
				required: true,
				sensitive: true,
			},
			{
				name: 'model',
				prompt: 'Model name',
				default: 'claude-3-5-sonnet-20241022',
				required: true,
			},
			{
				name: 'providerName',
				prompt: 'Provider name',
				default: 'anthropic',
			},
		],
		buildConfig: (answers) => ({
			name: answers.providerName || 'anthropic',
			baseUrl: 'https://api.anthropic.com/v1',
			apiKey: answers.apiKey,
			models: [answers.model],
		}),
	},
	{
		id: 'lmstudio',
		name: 'LM Studio',
		description: 'Local LLM inference via LM Studio',
		fields: [
			{
				name: 'baseUrl',
				prompt: 'Base URL',
				default: 'http://localhost:1234/v1',
				validator: urlValidator,
			},
			{
				name: 'model',
				prompt: 'Model name',
				default: 'local-model',
				required: true,
			},
		],
		buildConfig: (answers) => ({
			name: 'lmstudio',
			baseUrl: answers.baseUrl || 'http://localhost:1234/v1',
			models: [answers.model],
		}),
	},
	{
		id: 'custom',
		name: 'Custom Provider',
		description: 'Custom OpenAI-compatible API',
		fields: [
			{
				name: 'providerName',
				prompt: 'Provider name',
				required: true,
			},
			{
				name: 'baseUrl',
				prompt: 'Base URL',
				required: true,
				validator: urlValidator,
			},
			{
				name: 'apiKey',
				prompt: 'API Key (optional)',
				required: false,
				sensitive: true,
			},
			{
				name: 'model',
				prompt: 'Model name',
				required: true,
			},
			{
				name: 'timeout',
				prompt: 'Request timeout (ms)',
				default: '30000',
				validator: (value) => {
					if (!value) return undefined;
					const num = Number(value);
					if (Number.isNaN(num) || num <= 0) {
						return 'Timeout must be a positive number';
					}
					return undefined;
				},
			},
		],
		buildConfig: (answers) => {
			const config: ProviderConfig = {
				name: answers.providerName,
				baseUrl: answers.baseUrl,
				models: [answers.model],
			};
			if (answers.apiKey) {
				config.apiKey = answers.apiKey;
			}
			if (answers.timeout) {
				config.timeout = Number(answers.timeout);
			}
			return config;
		},
	},
];

export function getProviderTemplate(id: string): ProviderTemplate | undefined {
	return PROVIDER_TEMPLATES.find((template) => template.id === id);
}
