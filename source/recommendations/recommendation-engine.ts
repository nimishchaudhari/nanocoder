import {SystemCapabilities, ModelRecommendation} from '@/types/index';
import {modelMatchingEngine} from '@/recommendations/model-engine';

export interface ModelRecommendationEnhanced extends ModelRecommendation {
	recommendedProvider: string; // Best provider to use for this model
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
	getRecommendations(
		systemCapabilities: SystemCapabilities,
	): RecommendationResult {
		// Get all compatible models
		const compatibleModels =
			modelMatchingEngine.getCompatibleModels(systemCapabilities);

		// Enhance each model with setup instructions
		const enhancedModels = compatibleModels.map(model =>
			this.enhanceModel(model, systemCapabilities),
		);

		// Filter out incompatible models
		const usableModels = enhancedModels.filter(
			m => m.compatibility !== 'incompatible',
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
		systemCapabilities: SystemCapabilities,
	): ModelRecommendationEnhanced {
		const model = modelRec.model;

		// Determine best access method based on system capabilities
		const canUseLocal =
			model.local &&
			systemCapabilities.memory.total >= (model.minMemoryGB || 8);
		const canUseApi = model.api && systemCapabilities.network.connected;

		let recommendedProvider = '';

		if (canUseLocal && !canUseApi) {
			recommendedProvider = 'local';
		} else if (!canUseLocal && canUseApi) {
			recommendedProvider = 'api';
		} else if (canUseLocal && canUseApi) {
			recommendedProvider = 'local (API also available)';
		} else {
			recommendedProvider = 'unavailable';
		}

		return {
			...modelRec,
			recommendedProvider,
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
		models: ModelRecommendationEnhanced[],
	): ModelRecommendationEnhanced[] {
		return models.sort((a, b) => {
			// Calculate quality scores - prioritize agentic capabilities heavily
			const aQuality =
				a.model.quality.agentic * 3.0 +
				a.model.quality.local * 0.8 +
				a.model.quality.cost * 0.5;
			const bQuality =
				b.model.quality.agentic * 3.0 +
				b.model.quality.local * 0.8 +
				b.model.quality.cost * 0.5;

			// Determine what the user can ACTUALLY use based on recommendedProvider
			const aCanUseLocal = a.recommendedProvider.includes('local');
			const bCanUseLocal = b.recommendedProvider.includes('local');
			const aApiOnly = a.recommendedProvider === 'api';
			const bApiOnly = b.recommendedProvider === 'api';

			// Define quality thresholds (out of 43 possible with new weighting: agentic*3 + local*0.8 + cost*0.5)
			const highQuality = 24; // 24+ = high quality (agentic 8+)
			const decentQuality = 15; // 15+ = decent (agentic 5+), below = poor
			const aHighQuality = aQuality >= highQuality;
			const bHighQuality = bQuality >= highQuality;
			const aDecentQuality = aQuality >= decentQuality;
			const bDecentQuality = bQuality >= decentQuality;

			// 1. High-quality API beats poor-quality local (don't recommend trash just because it's free)
			if (aApiOnly && bCanUseLocal && aHighQuality && !bDecentQuality)
				return -1;
			if (bApiOnly && aCanUseLocal && bHighQuality && !aDecentQuality) return 1;

			// 2. Decent+ local models beat API-only (free is better if quality is acceptable)
			if (aCanUseLocal && bApiOnly && aDecentQuality) return -1;
			if (bCanUseLocal && aApiOnly && bDecentQuality) return 1;

			// 3. Among models user can run locally, prefer high quality
			if (aCanUseLocal && bCanUseLocal) {
				if (aHighQuality && !bHighQuality) return -1;
				if (bHighQuality && !aHighQuality) return 1;
				// Same quality tier - prefer higher score
				return bQuality - aQuality;
			}

			// 4. Among API-only models, prefer free over paid
			if (aApiOnly && bApiOnly) {
				const aCost = a.model.costType === 'free' ? 0 : 1;
				const bCost = b.model.costType === 'free' ? 0 : 1;
				if (aCost !== bCost) return aCost - bCost;
				// Same cost - prefer higher quality
				return bQuality - aQuality;
			}

			// 5. Compare by compatibility as final tiebreaker
			const compatibilityOrder = {
				perfect: 4,
				good: 3,
				marginal: 2,
				incompatible: 1,
			};
			return (
				compatibilityOrder[b.compatibility] -
				compatibilityOrder[a.compatibility]
			);
		});
	}

	/**
	 * Get a simple quick start recommendation
	 */
	getQuickStartRecommendation(systemCapabilities: SystemCapabilities): {
		model: string;
		provider: string;
		reasoning: string;
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
		};
	}
}

export const recommendationEngine = RecommendationEngine.getInstance();
