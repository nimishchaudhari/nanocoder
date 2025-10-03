import {
	SystemCapabilities,
	ModelEntry,
	ModelRecommendation,
} from '../types/index.js';
import {modelDatabase} from './model-database.js';

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
			const warnings = this.generateWarnings(
				model,
				systemCapabilities,
				compatibility,
			);
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
			rec => rec.model.accessMethods.includes('local-server') && rec.compatibility !== 'incompatible',
		);

		return localModels.length > 0 ? localModels[0] : null;
	}

	getBestApiModel(
		systemCapabilities: SystemCapabilities,
	): ModelRecommendation | null {
		const apiModels = this.getCompatibleModels(systemCapabilities).filter(
			rec => rec.model.accessMethods.includes('hosted-api') && rec.compatibility !== 'incompatible',
		);

		return apiModels.length > 0 ? apiModels[0] : null;
	}

	getModelsByUseCase(
		systemCapabilities: SystemCapabilities,
		useCase: keyof ModelEntry['useCases'],
	): ModelRecommendation[] {
		return this.getCompatibleModels(systemCapabilities).filter(
			rec =>
				rec.model.useCases[useCase] && rec.compatibility !== 'incompatible',
		);
	}

	private assessModelCompatibility(
		model: ModelEntry,
		system: SystemCapabilities,
	): ModelRecommendation['compatibility'] {
		// API models are always compatible if we have internet
		if (model.accessMethods.includes('hosted-api')) {
			return system.network.connected ? 'perfect' : 'incompatible';
		}

		// Local models need system resources
		const memoryCompatible =
			system.memory.total >= model.requirements.minMemory;
		const cpuCompatible = system.cpu.cores >= model.requirements.minCpuCores;

		if (!memoryCompatible || !cpuCompatible) {
			return 'incompatible';
		}

		// Check if system meets recommended requirements
		const memoryRecommended =
			system.memory.total >= model.requirements.recommendedMemory;
		const gpuAvailable = system.gpu.available && system.gpu.type !== 'none';
		const gpuCompatible = !model.requirements.gpuRequired || gpuAvailable;

		if (!gpuCompatible) {
			return 'marginal';
		}

		if (memoryRecommended && gpuAvailable) {
			return 'perfect';
		}

		return 'good';
	}

	private generateWarnings(
		model: ModelEntry,
		system: SystemCapabilities,
		compatibility: ModelRecommendation['compatibility'],
	): string[] {
		const warnings: string[] = [];

		if (model.accessMethods.includes('local-server')) {
			// Memory warnings
			if (system.memory.total < model.requirements.recommendedMemory) {
				warnings.push(
					`May run slowly with ${system.memory.total}GB RAM (${model.requirements.recommendedMemory}GB recommended)`,
				);
			}

			// GPU warnings
			if (model.requirements.gpuRequired && !system.gpu.available) {
				warnings.push('Requires GPU acceleration but none detected');
			} else if (system.gpu.available && system.gpu.type === 'none') {
				warnings.push('Will use CPU-only inference (slower)');
			}

			// Platform-specific warnings
			if (system.platform === 'win32' && model.downloadSize > 10) {
				warnings.push('Large model may have slower startup on Windows');
			}
		}

		if (model.accessMethods.includes('hosted-api')) {
			// Network warnings
			if (!system.network.connected) {
				warnings.push('Requires internet connection');
			} else if (system.network.speed === 'slow') {
				warnings.push('May have delays due to slow internet connection');
			}

			// Cost warnings
			if (model.cost.type === 'pay-per-use') {
				warnings.push('Usage costs apply - monitor your spending');
			}
		}

		// Capability warnings based on ratings
		if (model.capabilities.agenticTasks <= 2) {
			warnings.push('Limited capabilities for complex multi-step workflows');
		}

		if (model.capabilities.toolUsage <= 2) {
			warnings.push(
				'Basic tool usage - may struggle with complex integrations',
			);
		}

		// Use case warnings
		if (!model.useCases.longWorkflows) {
			warnings.push('Not ideal for extended coding sessions');
		}

		return warnings;
	}

	private generateRecommendationText(
		model: ModelEntry,
		compatibility: ModelRecommendation['compatibility'],
	): string {
		if (compatibility === 'incompatible') {
			return `Cannot run on your system - needs ${model.requirements.minMemory}GB RAM and ${model.requirements.minCpuCores} CPU cores`;
		}

		const strengths: string[] = [];
		const weaknesses: string[] = [];

		// Analyze capabilities
		if (model.capabilities.codingQuality >= 4) {
			strengths.push('excellent code quality');
		}

		if (model.capabilities.agenticTasks >= 4) {
			strengths.push('strong agentic workflows');
		}

		if (model.capabilities.toolUsage >= 4) {
			strengths.push('advanced tool usage');
		}

		if (model.cost.type === 'free') {
			strengths.push('completely free');
		}

		if (model.accessMethods.includes('local-server')) {
			strengths.push('private/local');
		}

		// Identify weaknesses
		if (model.capabilities.agenticTasks <= 2) {
			weaknesses.push('limited agentic tasks');
		}

		if (model.capabilities.longFormCoding <= 2) {
			weaknesses.push('struggles with long coding');
		}

		if (model.accessMethods.includes('hosted-api') && model.cost.type !== 'free') {
			weaknesses.push('usage costs');
		}

		// Build recommendation text
		let text = '';

		if (strengths.length > 0) {
			text += `Good for ${strengths.join(', ')}`;
		}

		return text || 'Standard model for general use';
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
		const capabilities = model.capabilities;
		// Weight agentic tasks and tool usage higher for this use case
		return (
			capabilities.codingQuality * 1.2 +
			capabilities.agenticTasks * 1.5 +
			capabilities.contextHandling * 1.0 +
			capabilities.longFormCoding * 1.1 +
			capabilities.toolUsage * 1.3
		);
	}
}

export const modelMatchingEngine = ModelMatchingEngine.getInstance();
