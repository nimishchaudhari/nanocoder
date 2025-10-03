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

	return (
		<Box
			flexDirection="column"
			marginBottom={1}
			borderStyle={'round'}
			borderColor={colors.secondary}
			padding={1}
		>
			<Text color={colors.primary} bold>
				Your System:
			</Text>
			<Text>
				{systemCaps.memory.total}GB RAM, {systemCaps.cpu.cores} cores, {gpuText}
			</Text>
			<Text color={colors.white}>Network: {networkText}</Text>
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
		<Box
			flexDirection="column"
			marginBottom={2}
			borderStyle={'round'}
			borderColor={colors.secondary}
			padding={1}
		>
			<Box marginBottom={1}>
				<Text color={colors.success} bold>
					Quick Start:
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color={colors.success}>
					<Text bold>👉 {quickStart.model}</Text> via {quickStart.provider}
				</Text>
			</Box>
			<Text color={colors.secondary}>{quickStart.reasoning}</Text>
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
		<Box
			flexDirection="column"
			borderStyle={'round'}
			borderColor={colors.secondary}
			padding={1}
		>
			<Box marginBottom={1}>
				<Text color={colors.success} bold>
					Other Models:
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

	// Determine access types from accessMethods
	const accessTypes = model.model.accessMethods.map(method =>
		method === 'local-server' ? 'Local' : 'API',
	);

	// Group providers by category
	const localProviders = model.model.providers
		.filter(p => p.category === 'local-server')
		.map(p => p.name.charAt(0).toUpperCase() + p.name.slice(1));

	const apiProviders = model.model.providers
		.filter(p => p.category === 'hosted-api')
		.map(p => p.name.charAt(0).toUpperCase() + p.name.slice(1));

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color={colors.primary} bold>
				• {model.model.name}
			</Text>
			<Box marginLeft={2} flexDirection="column">
				<Box flexDirection="column" marginBottom={1}>
					{localProviders.length > 0 && (
						<Text color={colors.white}>
							<Text bold>Local: </Text>
							{localProviders.join(', ')}
						</Text>
					)}
					{apiProviders.length > 0 && (
						<Text color={colors.white}>
							<Text bold>API: </Text>
							{apiProviders.join(', ')}
						</Text>
					)}
					<Text color={colors.white}>
						<Text bold>Cost: </Text>
						{costText}
					</Text>
					<Text color={colors.white}>
						<Text bold>Access: </Text>
						{accessTypes.join(' + ')}
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
