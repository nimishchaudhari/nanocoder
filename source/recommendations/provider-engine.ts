import {SystemCapabilities, ProviderRecommendation, ModelRecommendation} from '../types/index.js';
import {modelMatchingEngine} from './model-engine.js';
import {modelDatabase} from './model-database.js';

export class ProviderRecommendationEngine {
	private static instance: ProviderRecommendationEngine;

	static getInstance(): ProviderRecommendationEngine {
		if (!ProviderRecommendationEngine.instance) {
			ProviderRecommendationEngine.instance = new ProviderRecommendationEngine();
		}
		return ProviderRecommendationEngine.instance;
	}

	getProviderRecommendations(systemCapabilities: SystemCapabilities): ProviderRecommendation[] {
		const recommendations: ProviderRecommendation[] = [];

		// Ollama recommendation
		const ollamaRec = this.generateOllamaRecommendation(systemCapabilities);
		if (ollamaRec) {
			recommendations.push(ollamaRec);
		}

		// OpenRouter recommendation
		const openRouterRec = this.generateOpenRouterRecommendation(systemCapabilities);
		if (openRouterRec) {
			recommendations.push(openRouterRec);
		}

		// OpenAI recommendation
		const openAiRec = this.generateOpenAIRecommendation(systemCapabilities);
		if (openAiRec) {
			recommendations.push(openAiRec);
		}

		// Sort by priority
		return recommendations.sort((a, b) => {
			const priorityOrder = {'high': 3, 'medium': 2, 'low': 1};
			return priorityOrder[b.priority] - priorityOrder[a.priority];
		});
	}

	getQuickStartRecommendation(systemCapabilities: SystemCapabilities): {
		provider: string;
		model: string;
		setupCommand?: string;
		reasoning: string;
	} | null {
		const providerRecs = this.getProviderRecommendations(systemCapabilities);

		if (providerRecs.length === 0) {
			return null;
		}

		const topProvider = providerRecs[0];
		const bestModel = topProvider.models[0];

		if (!bestModel) {
			return null;
		}

		let setupCommand: string | undefined;
		if (topProvider.provider === 'ollama' && !systemCapabilities.ollama.running) {
			setupCommand = `ollama pull ${bestModel.model.name}`;
		}

		return {
			provider: topProvider.provider,
			model: bestModel.model.name,
			setupCommand,
			reasoning: bestModel.recommendation,
		};
	}

	private generateOllamaRecommendation(systemCapabilities: SystemCapabilities): ProviderRecommendation | null {
		const localModels = modelDatabase.getModelsByProvider('ollama');
		const compatibleModels = localModels.map(model => {
			const recommendations = modelMatchingEngine.getCompatibleModels(systemCapabilities);
			return recommendations.find(rec => rec.model.name === model.name);
		}).filter(Boolean) as ModelRecommendation[];

		const usableModels = compatibleModels.filter(rec => rec.compatibility !== 'incompatible');

		const reasoning: string[] = [];
		let priority: 'high' | 'medium' | 'low' = 'medium';

		if (systemCapabilities.ollama.installed && systemCapabilities.ollama.running) {
			reasoning.push('Ollama is already installed and running');
			priority = 'high';
		} else if (systemCapabilities.ollama.installed) {
			reasoning.push('Ollama is installed (needs to be started)');
			priority = 'high';
		} else if (usableModels.length > 0) {
			reasoning.push('Your system can run local models');
			priority = 'medium';
		} else {
			reasoning.push('Limited by system resources for local models');
			priority = 'low';
		}

		// Add system-specific reasoning
		if (systemCapabilities.memory.total >= 16) {
			reasoning.push('Sufficient RAM for good local models');
		}

		if (systemCapabilities.gpu.available && systemCapabilities.gpu.type !== 'none') {
			reasoning.push(`GPU acceleration available (${systemCapabilities.gpu.type})`);
		}

		reasoning.push('Private and free inference');

		let setupInstructions = '';
		if (!systemCapabilities.ollama.installed) {
			setupInstructions = 'Install Ollama: curl -fsSL https://ollama.com/install.sh | sh';
		} else if (!systemCapabilities.ollama.running) {
			setupInstructions = 'Start Ollama service: ollama serve (or start Ollama app)';
		} else {
			setupInstructions = 'Ollama is ready! Pull models with: ollama pull <model-name>';
		}

		return {
			provider: 'ollama',
			priority,
			reasoning,
			setupInstructions,
			models: usableModels,
		};
	}

	private generateOpenRouterRecommendation(systemCapabilities: SystemCapabilities): ProviderRecommendation | null {
		if (!systemCapabilities.network.connected) {
			return null;
		}

		const apiModels = modelDatabase.getModelsByProvider('openrouter');
		const compatibleModels = apiModels.map(model => {
			const recommendations = modelMatchingEngine.getCompatibleModels(systemCapabilities);
			return recommendations.find(rec => rec.model.name === model.name);
		}).filter(Boolean) as ModelRecommendation[];

		const reasoning: string[] = [];
		let priority: 'high' | 'medium' | 'low' = 'high';

		reasoning.push('Access to multiple state-of-the-art models');
		reasoning.push('Competitive pricing and frequent model updates');
		reasoning.push('No local resource requirements');

		if (systemCapabilities.network.speed === 'fast') {
			reasoning.push('Fast internet connection for optimal experience');
		} else if (systemCapabilities.network.speed === 'slow') {
			reasoning.push('Slow internet may affect response times');
			priority = 'medium';
		}

		// Analyze cost effectiveness
		const lowCostModels = compatibleModels.filter(rec =>
			rec.model.cost.estimatedDaily && rec.model.cost.estimatedDaily.includes('$0.')
		);

		if (lowCostModels.length > 0) {
			reasoning.push('Affordable options available');
		}

		return {
			provider: 'openrouter',
			priority,
			reasoning,
			setupInstructions: 'Get API key from openrouter.ai, then set: /provider openrouter',
			models: compatibleModels,
		};
	}

	private generateOpenAIRecommendation(systemCapabilities: SystemCapabilities): ProviderRecommendation | null {
		if (!systemCapabilities.network.connected) {
			return null;
		}

		const apiModels = modelDatabase.getModelsByProvider('openai');
		const compatibleModels = apiModels.map(model => {
			const recommendations = modelMatchingEngine.getCompatibleModels(systemCapabilities);
			return recommendations.find(rec => rec.model.name === model.name);
		}).filter(Boolean) as ModelRecommendation[];

		const reasoning: string[] = [];
		const priority: 'high' | 'medium' | 'low' = 'medium';

		reasoning.push('Direct access to GPT models from OpenAI');
		reasoning.push('Reliable service with high uptime');
		reasoning.push('Premium pricing for premium models');

		if (systemCapabilities.network.speed === 'slow') {
			reasoning.push('Slow internet may affect response times');
		}

		// Note about cost
		const hasExpensiveModels = compatibleModels.some(rec =>
			rec.model.cost.estimatedDaily && !rec.model.cost.estimatedDaily.includes('$0.')
		);

		if (hasExpensiveModels) {
			reasoning.push('Higher costs than alternatives');
		}

		return {
			provider: 'openai',
			priority,
			reasoning,
			setupInstructions: 'Get API key from openai.com, then configure: /provider openai-compatible',
			models: compatibleModels,
		};
	}

	getBestOverallRecommendation(systemCapabilities: SystemCapabilities): {
		provider: string;
		model: string;
		reasoning: string;
		setupInstructions: string;
		costEstimate?: string;
	} | null {
		const providers = this.getProviderRecommendations(systemCapabilities);

		if (providers.length === 0) {
			return null;
		}

		// Find the best model across all providers
		let bestRec: ModelRecommendation | null = null;
		let bestProvider: ProviderRecommendation | null = null;

		for (const provider of providers) {
			const topModel = provider.models[0];
			if (topModel && (!bestRec || this.compareRecommendations(topModel, bestRec) > 0)) {
				bestRec = topModel;
				bestProvider = provider;
			}
		}

		if (!bestRec || !bestProvider) {
			return null;
		}

		return {
			provider: bestProvider.provider,
			model: bestRec.model.name,
			reasoning: bestRec.recommendation,
			setupInstructions: bestProvider.setupInstructions,
			costEstimate: bestRec.model.cost.estimatedDaily,
		};
	}

	private compareRecommendations(a: ModelRecommendation, b: ModelRecommendation): number {
		// Compare by compatibility first
		const compatibilityScore = this.getCompatibilityScore(a.compatibility) - this.getCompatibilityScore(b.compatibility);
		if (compatibilityScore !== 0) return compatibilityScore;

		// Then by agentic capabilities (most important for this use case)
		const agenticScore = a.model.capabilities.agenticTasks - b.model.capabilities.agenticTasks;
		if (agenticScore !== 0) return agenticScore;

		// Then by overall capability
		const aScore = this.calculateOverallScore(a.model);
		const bScore = this.calculateOverallScore(b.model);
		return aScore - bScore;
	}

	private getCompatibilityScore(compatibility: ModelRecommendation['compatibility']): number {
		switch (compatibility) {
			case 'perfect': return 4;
			case 'good': return 3;
			case 'marginal': return 2;
			case 'incompatible': return 1;
		}
	}

	private calculateOverallScore(model: any): number {
		return model.capabilities.codingQuality +
			   model.capabilities.agenticTasks * 2 + // Weight agentic higher
			   model.capabilities.toolUsage * 1.5 +
			   model.capabilities.contextHandling +
			   model.capabilities.longFormCoding;
	}
}

export const providerRecommendationEngine = ProviderRecommendationEngine.getInstance();