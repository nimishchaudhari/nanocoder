import React, {useState, useEffect} from 'react';
import {Box, Text} from 'ink';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Command} from '../types/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {useTheme} from '../hooks/useTheme.js';
import {systemDetector} from '../system/detector.js';
import {providerRecommendationEngine} from '../recommendations/provider-engine.js';
import {SystemCapabilities, ModelRecommendation, ProviderRecommendation} from '../types/index.js';

function RecommendationsDisplay() {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const [systemCaps, setSystemCaps] = useState<SystemCapabilities | null>(null);
	const [recommendations, setRecommendations] = useState<ProviderRecommendation[]>([]);
	const [quickStart, setQuickStart] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function loadRecommendations() {
			try {
				const capabilities = await systemDetector.getSystemCapabilities();
				setSystemCaps(capabilities);

				const providerRecs = providerRecommendationEngine.getProviderRecommendations(capabilities);
				setRecommendations(providerRecs);

				const quickStartRec = providerRecommendationEngine.getQuickStartRecommendation(capabilities);
				setQuickStart(quickStartRec);

				setLoading(false);
			} catch (error_) {
				setError(error_ instanceof Error ? error_.message : 'Failed to analyze system');
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
		>
			<SystemSummary systemCaps={systemCaps} colors={colors} />

			{quickStart && (
				<QuickStartSection quickStart={quickStart} colors={colors} />
			)}

			<RecommendationsList recommendations={recommendations} colors={colors} />

			<Box marginTop={1}>
				<Text color={colors.secondary}>
					💡 Use /provider and /model commands to switch between recommendations
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
		? `${systemCaps.gpu.type} GPU${systemCaps.gpu.memory ? ` (${systemCaps.gpu.memory}GB)` : ''}`
		: 'No GPU';

	const networkText = systemCaps.network.connected
		? `Connected${systemCaps.network.speed ? ` (${systemCaps.network.speed})` : ''}`
		: 'Offline';

	const ollamaText = systemCaps.ollama.installed
		? `Installed${systemCaps.ollama.running ? ' & Running' : ' (not running)'}`
		: 'Not installed';

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color={colors.primary} bold>
				System: {systemCaps.memory.total}GB RAM, {systemCaps.cpu.cores} cores, {gpuText}
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
		<Box flexDirection="column" marginBottom={1}>
			<Text color={colors.success} bold>
				🚀 QUICK START RECOMMENDATION:
			</Text>
			<Text color={colors.white}>
				✅ {quickStart.model} ({quickStart.provider}) - {quickStart.reasoning}
			</Text>
			{quickStart.setupCommand && (
				<Text color={colors.secondary}>
					Setup: {quickStart.setupCommand}
				</Text>
			)}
		</Box>
	);
}

function RecommendationsList({
	recommendations,
	colors,
}: {
	recommendations: ProviderRecommendation[];
	colors: any;
}) {
	if (recommendations.length === 0) {
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
					📋 ALL OPTIONS:
				</Text>
			</Box>
			{recommendations.map((provider, index) => (
				<ProviderSection
					key={provider.provider}
					provider={provider}
					colors={colors}
					isLast={index === recommendations.length - 1}
				/>
			))}
		</Box>
	);
}

function ProviderSection({
	provider,
	colors,
	isLast,
}: {
	provider: ProviderRecommendation;
	colors: any;
	isLast: boolean;
}) {
	const priorityEmoji = {
		high: '🟢',
		medium: '🟡',
		low: '🔴',
	}[provider.priority];

	const compatibleModels = provider.models.filter(
		m => m.compatibility !== 'incompatible'
	);

	return (
		<Box flexDirection="column" marginBottom={isLast ? 0 : 1}>
			<Text color={colors.white} bold>
				{priorityEmoji} {provider.provider.toUpperCase()}:
			</Text>
			<Text color={colors.secondary}>
				  {provider.reasoning.join(' • ')}
			</Text>
			<Text color={colors.secondary}>
				  Setup: {provider.setupInstructions}
			</Text>

			{compatibleModels.slice(0, 3).map((modelRec, index) => (
				<ModelItem
					key={modelRec.model.name}
					modelRec={modelRec}
					colors={colors}
					isFirst={index === 0}
				/>
			))}
		</Box>
	);
}

function ModelItem({
	modelRec,
	colors,
	isFirst,
}: {
	modelRec: ModelRecommendation;
	colors: any;
	isFirst: boolean;
}) {
	const compatibilityEmoji = {
		perfect: '✅',
		good: '👍',
		marginal: '⚠️',
		incompatible: '❌',
	}[modelRec.compatibility];

	const costText = modelRec.model.cost.estimatedDaily
		? ` (${modelRec.model.cost.estimatedDaily})`
		: modelRec.model.cost.type === 'free'
		? ' (Free)'
		: '';

	const textColor = isFirst ? colors.success : colors.white;

	return (
		<Box flexDirection="column" marginLeft={4} marginTop={0}>
			<Text color={textColor}>
				{compatibilityEmoji} {modelRec.model.name}{costText} - {modelRec.recommendation}
			</Text>
			{modelRec.warnings.length > 0 && (
				<Text color={colors.warning}>
					    ⚠️  {modelRec.warnings.join(', ')}
				</Text>
			)}
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