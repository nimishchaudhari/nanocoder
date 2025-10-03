import {SystemCapabilities, ModelEntry, ModelRecommendation} from '../types/index.js';
import {modelDatabase} from './model-database.js';
import {modelMatchingEngine} from './model-engine.js';

export interface ModelRecommendationEnhanced extends ModelRecommendation {
	recommendedProvider: string; // Best provider to use for this model
	setupInstructions: string; // How to set up this model
}

export interface RecommendationResult {
	quickStart: ModelRecommendationEnhanced | null;
	allModels: ModelRecommendationEnhanced[];
}

export class RecommendationEngine {
	private static instance: RecommendationEngine;

	static getInstance(): RecommendationEngine {
		if (!RecommendationEngine.instance) {
			RecommendationEngine.instance = new RecommendationEngine();
		}
		return RecommendationEngine.instance;
	}

	/**
	 * Get all recommendations based on system capabilities
	 */
	getRecommendations(systemCapabilities: SystemCapabilities): RecommendationResult {
		// Get all compatible models
		const compatibleModels = modelMatchingEngine.getCompatibleModels(systemCapabilities);

		// Enhance each model with setup instructions
		const enhancedModels = compatibleModels.map(model =>
			this.enhanceModel(model, systemCapabilities)
		);

		// Filter out incompatible models
		const usableModels = enhancedModels.filter(
			m => m.compatibility !== 'incompatible'
		);

		// Sort models by priority:
		// 1. Free (local) + high quality
		// 2. Low cost + high quality
		// 3. By agentic capabilities
		// 4. By compatibility
		const sortedModels = this.sortModelsByPriority(usableModels);

		// Pick the best quick start option (prioritize local models if available)
		const quickStart = sortedModels[0] || null;

		return {
			quickStart,
			allModels: sortedModels,
		};
	}

	/**
	 * Enhance a model with setup instructions
	 */
	private enhanceModel(
		modelRec: ModelRecommendation,
		systemCapabilities: SystemCapabilities
	): ModelRecommendationEnhanced {
		const model = modelRec.model;
		const recommendedProvider = model.primaryProvider;

		// Generate setup instructions based on model type and provider
		let setupInstructions = '';

		if (model.providerCategory === 'local-server') {
			// Local model setup
			if (recommendedProvider === 'ollama') {
				if (systemCapabilities.ollama.installed) {
					setupInstructions = `ollama pull ${model.name}`;
				} else {
					setupInstructions = 'Install Ollama, then: ollama pull ' + model.name;
				}
			} else {
				setupInstructions = `Install ${recommendedProvider} and pull ${model.name}`;
			}
		} else {
			// Hosted API setup
			setupInstructions = `Get API key from ${recommendedProvider} and add to agents.config.json`;
		}

		return {
			...modelRec,
			recommendedProvider,
			setupInstructions,
		};
	}

	/**
	 * Sort models by priority for recommendations:
	 * 1. High-quality local models (free + powerful)
	 * 2. High-quality API models (powerful but paid)
	 * 3. Lower-quality local models
	 * 4. Lower-quality API models
	 */
	private sortModelsByPriority(
		models: ModelRecommendationEnhanced[]
	): ModelRecommendationEnhanced[] {
		return models.sort((a, b) => {
			// Calculate quality scores (agentic capabilities + coding quality + tool usage)
			const aQuality = a.model.capabilities.agenticTasks +
							 a.model.capabilities.codingQuality +
							 a.model.capabilities.toolUsage;
			const bQuality = b.model.capabilities.agenticTasks +
							 b.model.capabilities.codingQuality +
							 b.model.capabilities.toolUsage;

			const aLocal = a.model.providerCategory === 'local-server';
			const bLocal = b.model.providerCategory === 'local-server';

			// Define "high quality" threshold (10+ out of 15 possible)
			const highQuality = 10;
			const aHighQuality = aQuality >= highQuality;
			const bHighQuality = bQuality >= highQuality;

			// 1. High-quality local models first
			if (aLocal && aHighQuality && !(bLocal && bHighQuality)) return -1;
			if (bLocal && bHighQuality && !(aLocal && aHighQuality)) return 1;

			// 2. High-quality API models second
			if (!aLocal && aHighQuality && !((!bLocal) && bHighQuality)) return -1;
			if (!bLocal && bHighQuality && !((!aLocal) && aHighQuality)) return 1;

			// 3. Within same category (local vs API), sort by quality
			if (aLocal === bLocal) {
				const qualityDiff = bQuality - aQuality;
				if (qualityDiff !== 0) return qualityDiff;

				// For API models with same quality, prefer cheaper
				if (!aLocal) {
					const aCost = this.estimateCost(a.model.cost.estimatedDaily);
					const bCost = this.estimateCost(b.model.cost.estimatedDaily);
					return aCost - bCost;
				}
			}

			// 4. Local before API (if both are low quality)
			if (aLocal && !bLocal) return -1;
			if (!aLocal && bLocal) return 1;

			// 5. Compare by compatibility as final tiebreaker
			const compatibilityOrder = {perfect: 4, good: 3, marginal: 2, incompatible: 1};
			return compatibilityOrder[b.compatibility] - compatibilityOrder[a.compatibility];
		});
	}

	/**
	 * Extract numeric cost estimate from cost string
	 */
	private estimateCost(costString?: string): number {
		if (!costString) return Infinity;
		const match = costString.match(/\$([0-9.]+)/);
		return match ? parseFloat(match[1]) : Infinity;
	}

	/**
	 * Get a simple quick start recommendation
	 */
	getQuickStartRecommendation(
		systemCapabilities: SystemCapabilities
	): {
		model: string;
		provider: string;
		reasoning: string;
		setupInstructions: string;
	} | null {
		const result = this.getRecommendations(systemCapabilities);

		if (!result.quickStart) {
			return null;
		}

		const model = result.quickStart;

		return {
			model: model.model.name,
			provider: model.recommendedProvider,
			reasoning: model.recommendation,
			setupInstructions: model.setupInstructions,
		};
	}
}

export const recommendationEngine = RecommendationEngine.getInstance();
