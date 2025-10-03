import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Command, SystemCapabilities} from '../types/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {useTheme} from '../hooks/useTheme.js';
import {systemDetector} from '../system/detector.js';
import {
	recommendationEngine,
	ModelRecommendationEnhanced,
} from '../recommendations/recommendation-engine.js';

function RecommendationsDisplay() {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const [systemCaps, setSystemCaps] = useState<SystemCapabilities | null>(null);
	const [models, setModels] = useState<ModelRecommendationEnhanced[]>([]);
	const [quickStart, setQuickStart] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadRecommendations() {
			try {
				const capabilities = await systemDetector.getSystemCapabilities();
				setSystemCaps(capabilities);

				const result = recommendationEngine.getRecommendations(capabilities);
				setModels(result.allModels);

				const quickStartRec =
					recommendationEngine.getQuickStartRecommendation(capabilities);
				setQuickStart(quickStartRec);

				setLoading(false);
			} catch (error_) {
				setError(
					error_ instanceof Error ? error_.message : 'Failed to analyze system',
				);
				setLoading(false);
			}
		}

		void loadRecommendations();
	}, []);

	if (loading) {
		return (
			<TitledBox
				borderStyle="round"
				titles={['/recommendations']}
				titleStyles={titleStyles.pill}
				width={boxWidth}
				borderColor={colors.primary}
				paddingX={2}
				paddingY={1}
			>
				<Text color={colors.white}>Analyzing your system...</Text>
			</TitledBox>
		);
	}

	if (error) {
		return (
			<TitledBox
				borderStyle="round"
				titles={['/recommendations']}
				titleStyles={titleStyles.pill}
				width={boxWidth}
				borderColor={colors.error}
				paddingX={2}
				paddingY={1}
			>
				<Text color={colors.error}>Error: {error}</Text>
			</TitledBox>
		);
	}

	if (!systemCaps) {
		return (
			<TitledBox
				borderStyle="round"
				titles={['/recommendations']}
				titleStyles={titleStyles.pill}
				width={boxWidth}
				borderColor={colors.error}
				paddingX={2}
				paddingY={1}
			>
				<Text color={colors.error}>Unable to detect system capabilities</Text>
			</TitledBox>
		);
	}

	return (
		<TitledBox
			borderStyle="round"
			titles={['/recommendations']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
			flexDirection="column"
		>
			<SystemSummary systemCaps={systemCaps} colors={colors} />

			{quickStart && (
				<QuickStartSection quickStart={quickStart} colors={colors} />
			)}

			<ModelsList models={models} colors={colors} />

			<Box marginTop={1}>
				<Text color={colors.secondary} dimColor>
					💡 Add providers to agents.config.json to use these models.
				</Text>
			</Box>
		</TitledBox>
	);
}

function SystemSummary({
	systemCaps,
	colors,
}: {
	systemCaps: SystemCapabilities;
	colors: any;
}) {
	const gpuText = systemCaps.gpu.available
		? `${systemCaps.gpu.type} GPU${
				systemCaps.gpu.memory ? ` (${systemCaps.gpu.memory}GB)` : ''
		  }`
		: 'No GPU';

	const networkText = systemCaps.network.connected
		? `Connected${
				systemCaps.network.speed ? ` (${systemCaps.network.speed})` : ''
		  }`
		: 'Offline';

	const ollamaText = systemCaps.ollama.installed
		? `Installed${systemCaps.ollama.running ? ' & Running' : ' (not running)'}`
		: 'Not installed';

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color={colors.primary} bold>
				System: {systemCaps.memory.total}GB RAM, {systemCaps.cpu.cores} cores,{' '}
				{gpuText}
			</Text>
			<Text color={colors.white}>
				Network: {networkText} • Ollama: {ollamaText}
			</Text>
		</Box>
	);
}

function QuickStartSection({
	quickStart,
	colors,
}: {
	quickStart: any;
	colors: any;
}) {
	return (
		<Box flexDirection="column" marginBottom={2}>
			<Box marginBottom={1}>
				<Text color={colors.success} bold>
					🚀 QUICK START:
				</Text>
			</Box>

			<Text color={colors.white}>
				✅ <Text bold>{quickStart.model}</Text> via {quickStart.provider}
			</Text>
			<Text color={colors.secondary}>{quickStart.reasoning}</Text>
			<Text color={colors.warning}>Setup: {quickStart.setupInstructions}</Text>
		</Box>
	);
}

function ModelsList({
	models,
	colors,
}: {
	models: ModelRecommendationEnhanced[];
	colors: any;
}) {
	if (models.length === 0) {
		return (
			<Text color={colors.warning}>
				No compatible models found for your system.
			</Text>
		);
	}

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text color={colors.primary} bold>
					MODEL CARDS:
				</Text>
			</Box>

			{models.slice(0, 10).map(model => (
				<ModelItem key={model.model.name} model={model} colors={colors} />
			))}
		</Box>
	);
}

function ModelItem({
	model,
	colors,
}: {
	model: ModelRecommendationEnhanced;
	colors: any;
}) {
	const costText =
		model.model.cost.type === 'free'
			? 'Free'
			: model.model.cost.estimatedDaily || model.model.cost.details;

	// Determine access types
	const accessTypes: string[] = [];
	if (model.model.providerCategory === 'local-server') {
		accessTypes.push('Local');
	}
	if (
		model.model.providerCategory === 'hosted-api' ||
		model.model.providers.length > 1
	) {
		accessTypes.push('API');
	}

	// Format providers list
	const providersList = model.model.providers
		.map(p => p.charAt(0).toUpperCase() + p.slice(1))
		.join(', ');

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color={colors.primary} bold>
				• {model.model.name}
			</Text>
			<Box marginLeft={2} flexDirection="column">
				<Box flexDirection="column" marginBottom={1}>
					<Text color={colors.white}>
						<Text bold>Available via: </Text>
						{providersList}
					</Text>
					<Text color={colors.white}>
						<Text bold>Cost: </Text>
						{costText}
					</Text>
					<Text color={colors.white}>
						<Text bold>Access: </Text>
						{accessTypes.join(', ')}
					</Text>
				</Box>
				<Box flexDirection="column" marginBottom={1}>
					<Text color={colors.success}>
						<Text bold>Recommendations:</Text>
					</Text>
					<Text color={colors.success}>{model.recommendation}</Text>
				</Box>
				<Box flexDirection="column">
					<Text color={colors.warning}>
						<Text bold>Warnings:</Text>
					</Text>
					{model.warnings.length > 0 && (
						<Text color={colors.warning}>{model.warnings.join(', ')}</Text>
					)}
				</Box>
			</Box>
		</Box>
	);
}

export const recommendationsCommand: Command = {
	name: 'recommendations',
	description: 'Get AI model recommendations based on your system',
	handler: async (_args: string[], _messages, _metadata) => {
		return React.createElement(RecommendationsDisplay, {
			key: `recommendations-${Date.now()}`,
		});
	},
};
