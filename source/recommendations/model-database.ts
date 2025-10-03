import {ModelEntry} from '../types/index.js';

export const MODEL_DATABASE: ModelEntry[] = [];

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
		return MODEL_DATABASE.filter(
			model =>
				model.providers.includes(provider) ||
				model.primaryProvider === provider,
		);
	}

	getModelsByProviderCategory(
		category: 'local-server' | 'hosted-api',
	): ModelEntry[] {
		return MODEL_DATABASE.filter(model => model.providerCategory === category);
	}

	getModelsByType(type: 'local' | 'api'): ModelEntry[] {
		return MODEL_DATABASE.filter(model => model.type === type);
	}

	getModelByName(name: string, provider?: string): ModelEntry | undefined {
		return MODEL_DATABASE.find(
			model =>
				model.name === name &&
				(provider
					? model.providers.includes(provider) ||
					  model.primaryProvider === provider
					: true),
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

	getModelsByCapabilityThreshold(
		capability: keyof ModelEntry['capabilities'],
		minRating: 1 | 2 | 3 | 4 | 5,
	): ModelEntry[] {
		return MODEL_DATABASE.filter(
			model => model.capabilities[capability] >= minRating,
		);
	}
}

export const modelDatabase = ModelDatabase.getInstance();
