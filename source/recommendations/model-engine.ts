import {
	SystemCapabilities,
	ModelEntry,
	ModelRecommendation,
} from '@/types/index';
import {modelDatabase} from '@/recommendations/model-database';

export class ModelMatchingEngine {
	private static instance: ModelMatchingEngine;

	static getInstance(): ModelMatchingEngine {
		if (!ModelMatchingEngine.instance) {
			ModelMatchingEngine.instance = new ModelMatchingEngine();
		}
		return ModelMatchingEngine.instance;
	}

	getCompatibleModels(
		systemCapabilities: SystemCapabilities,
	): ModelRecommendation[] {
		const allModels = modelDatabase.getAllModels();
		const recommendations: ModelRecommendation[] = [];

		for (const model of allModels) {
			const compatibility = this.assessModelCompatibility(
				model,
				systemCapabilities,
			);
			const warnings = this.generateWarnings(model, systemCapabilities);
			const recommendation = this.generateRecommendationText(
				model,
				compatibility,
			);

			recommendations.push({
				model,
				compatibility,
				warnings,
				recommendation,
			});
		}

		// Sort by compatibility and capability score
		return recommendations.sort((a, b) => {
			const compatibilityScore =
				this.getCompatibilityScore(a.compatibility) -
				this.getCompatibilityScore(b.compatibility);
			if (compatibilityScore !== 0) return compatibilityScore;

			// If compatibility is the same, sort by overall capability
			const aScore = this.calculateOverallCapabilityScore(a.model);
			const bScore = this.calculateOverallCapabilityScore(b.model);
			return bScore - aScore;
		});
	}

	getTopRecommendations(
		systemCapabilities: SystemCapabilities,
		count: number = 5,
	): ModelRecommendation[] {
		const compatible = this.getCompatibleModels(systemCapabilities);
		return compatible
			.filter(rec => rec.compatibility !== 'incompatible')
			.slice(0, count);
	}

	getBestLocalModel(
		systemCapabilities: SystemCapabilities,
	): ModelRecommendation | null {
		const localModels = this.getCompatibleModels(systemCapabilities).filter(
			rec => rec.model.local && rec.compatibility !== 'incompatible',
		);

		return localModels.length > 0 ? localModels[0] : null;
	}

	getBestApiModel(
		systemCapabilities: SystemCapabilities,
	): ModelRecommendation | null {
		const apiModels = this.getCompatibleModels(systemCapabilities).filter(
			rec => rec.model.api && rec.compatibility !== 'incompatible',
		);

		return apiModels.length > 0 ? apiModels[0] : null;
	}

	private assessModelCompatibility(
		model: ModelEntry,
		system: SystemCapabilities,
	): ModelRecommendation['compatibility'] {
		// Check if model can be accessed via API
		const canUseApi = model.api && system.network.connected;

		// Check if model can be run locally
		let canUseLocal = false;
		if (model.local) {
			const requiredMemory = model.minMemoryGB || 8; // Default 8GB if not specified
			canUseLocal = system.memory.total >= requiredMemory;
		}

		// Model is incompatible if neither method works
		if (!canUseApi && !canUseLocal) {
			return 'incompatible';
		}

		// Perfect if we can use API (no resource constraints)
		if (canUseApi) {
			return 'perfect';
		}

		// For local-only models, check GPU availability
		const gpuAvailable = system.gpu.available && system.gpu.type !== 'none';
		return gpuAvailable ? 'perfect' : 'good';
	}

	private generateWarnings(
		model: ModelEntry,
		system: SystemCapabilities,
	): string[] {
		const warnings: string[] = [];

		if (model.local) {
			const requiredMemory = model.minMemoryGB || 8;

			// Check if user can't run locally
			if (system.memory.total < requiredMemory) {
				if (model.api) {
					warnings.push(
						`Cannot run locally - requires ${requiredMemory}GB RAM (you have ${system.memory.total}GB). Run only via API.`,
					);
				} else {
					warnings.push(
						`Cannot run locally - requires ${requiredMemory}GB RAM (you have ${system.memory.total}GB)`,
					);
				}
			} else {
				// GPU warnings (only if they CAN run it locally)
				const gpuAvailable = system.gpu.available && system.gpu.type !== 'none';
				if (!gpuAvailable) {
					warnings.push(
						'GPU recommended for better performance - will be slow on CPU',
					);
				}

				// Memory warnings
				if (system.memory.total === requiredMemory) {
					warnings.push(
						`Running at minimum RAM (${requiredMemory}GB) - may be slow`,
					);
				}
			}
		}

		if (model.api) {
			// Network warnings
			if (!system.network.connected) {
				warnings.push('API access requires internet connection');
			} else if (system.network.speed === 'slow') {
				warnings.push('May have delays due to slow internet connection');
			}

			// Cost warnings
			if (model.costType === 'paid') {
				warnings.push('Usage costs apply - monitor your spending');
			}
		}

		// Capability warnings based on ratings (0-10 scale, 0 = not supported)
		if (model.quality.agentic === 0) {
			warnings.push('Does not support agentic coding workflows');
		} else if (model.quality.agentic <= 4) {
			warnings.push('Limited capabilities for complex agentic coding tasks');
		}

		if (model.quality.local === 0) {
			warnings.push('Cannot be run locally - proprietary/closed-source model');
		} else if (model.quality.local <= 3) {
			warnings.push(
				'Difficult to run locally - requires significant resources',
			);
		}

		return warnings;
	}

	private generateRecommendationText(
		model: ModelEntry,
		compatibility: ModelRecommendation['compatibility'],
	): string {
		if (compatibility === 'incompatible') {
			if (model.local) {
				const requiredMemory = model.minMemoryGB || 8;
				return `Cannot run locally - needs ${requiredMemory}GB RAM. ${
					model.api ? 'Try API access instead.' : ''
				}`;
			}
			return 'Requires internet connection for API access';
		}

		const strengths: string[] = [];

		// Analyze capabilities (0-10 scale)
		if (model.quality.agentic >= 8) {
			strengths.push('Excellent agentic coding abilities');
		} else if (model.quality.agentic >= 6) {
			strengths.push('Good agentic coding capabilities');
		}

		if (model.quality.local >= 8) {
			strengths.push('Easy to run locally');
		} else if (model.quality.local >= 6) {
			strengths.push('Reasonable to run locally');
		}

		if (model.quality.cost >= 8) {
			strengths.push('Excellent value - free or very cheap');
		} else if (model.quality.cost >= 6) {
			strengths.push('Good cost-effectiveness');
		}

		if (model.local && model.api) {
			strengths.push('Available locally and via API');
		} else if (model.local) {
			strengths.push('Private/local only');
		}

		// Build recommendation text as bullet points
		if (strengths.length > 0) {
			return strengths.map(s => `• ${s}`).join('\n');
		}

		return '• Standard model for general use';
	}

	private getCompatibilityScore(
		compatibility: ModelRecommendation['compatibility'],
	): number {
		switch (compatibility) {
			case 'perfect':
				return 4;
			case 'good':
				return 3;
			case 'marginal':
				return 2;
			case 'incompatible':
				return 1;
		}
	}

	private calculateOverallCapabilityScore(model: ModelEntry): number {
		// Weight heavily in favor of agentic capabilities (coding ability is most important)
		// Then local feasibility, and finally cost
		return (
			model.quality.agentic * 3.0 +
			model.quality.local * 0.8 +
			model.quality.cost * 0.5
		);
	}
}

export const modelMatchingEngine = ModelMatchingEngine.getInstance();
