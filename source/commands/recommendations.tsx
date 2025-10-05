import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useFocus} from 'ink';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Tabs, Tab} from 'ink-tab';
import {Command, SystemCapabilities} from '../types/index.js';
import {useTerminalWidth} from '../hooks/useTerminalWidth.js';
import {useTheme} from '../hooks/useTheme.js';
import {systemDetector} from '../system/detector.js';
import {
	recommendationEngine,
	ModelRecommendationEnhanced,
} from '../recommendations/recommendation-engine.js';

interface RecommendationsDisplayProps {
	onCancel?: () => void;
}

function RecommendationsDisplay({onCancel}: RecommendationsDisplayProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const [systemCaps, setSystemCaps] = useState<SystemCapabilities | null>(null);
	const [models, setModels] = useState<ModelRecommendationEnhanced[]>([]);
	const [topLocalModel, setTopLocalModel] =
		useState<ModelRecommendationEnhanced | null>(null);
	const [topApiModel, setTopApiModel] =
		useState<ModelRecommendationEnhanced | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentModelIndex, setCurrentModelIndex] = useState(0);
	const [activeTab, setActiveTab] = useState<'local' | 'api'>('local');
	const [closed, setClosed] = useState(false);

	// Capture focus to prevent user input from being active
	useFocus({autoFocus: true, id: 'recommendations-display'});

	// Get current tab's models
	const localModels = models.filter(m => m.model.local);
	const apiModels = models.filter(m => m.model.api);
	const currentTabModels = activeTab === 'local' ? localModels : apiModels;

	// Keyboard handler for navigation
	useInput((_input, key) => {
		if (key.escape || key.return) {
			setClosed(true);
			if (onCancel) {
				onCancel();
			}
		} else if (key.upArrow) {
			setCurrentModelIndex(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setCurrentModelIndex(prev =>
				Math.min(currentTabModels.length - 1, prev + 1),
			);
		} else if (key.leftArrow) {
			setActiveTab('local');
		} else if (key.rightArrow) {
			setActiveTab('api');
		}
		// Consume all other input by doing nothing
	});

	// Reset index when switching tabs
	useEffect(() => {
		setCurrentModelIndex(0);
	}, [activeTab]);

	useEffect(() => {
		async function loadRecommendations() {
			try {
				const capabilities = await systemDetector.getSystemCapabilities();
				setSystemCaps(capabilities);

				const result = recommendationEngine.getRecommendations(capabilities);
				setModels(result.allModels);

				// Get top local model (one user can actually run)
				const canRunLocally = (model: ModelRecommendationEnhanced) => {
					return (
						!model.model.minMemoryGB ||
						capabilities.memory.total >= model.model.minMemoryGB
					);
				};

				const getQualityScore = (model: ModelRecommendationEnhanced) => {
					return (
						model.model.quality.coding +
						model.model.quality.agentic +
						model.model.quality.tools
					);
				};

				const localModels = result.allModels
					.filter(m => m.model.local && canRunLocally(m))
					.sort((a, b) => getQualityScore(b) - getQualityScore(a));

				const apiModels = result.allModels
					.filter(m => m.model.api)
					.sort((a, b) => getQualityScore(b) - getQualityScore(a));

				setTopLocalModel(localModels[0] || null);
				setTopApiModel(apiModels[0] || null);

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

	// Return null when closed to hide the component
	if (closed) {
		return null;
	}

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
			<Box flexDirection="row">
				<SystemSummary systemCaps={systemCaps} colors={colors} />

				{(topLocalModel || topApiModel) && (
					<QuickStartSection
						topLocalModel={topLocalModel}
						topApiModel={topApiModel}
						colors={colors}
					/>
				)}
			</Box>

			<ModelsTabView
				models={models}
				colors={colors}
				currentModelIndex={currentModelIndex}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				systemCaps={systemCaps}
			/>

			<Box marginTop={1} flexDirection="column">
				<Box marginBottom={1}>
					<Text color={colors.secondary} dimColor>
						💡 Add providers to agents.config.json to use these models.
					</Text>
				</Box>

				<Text color={colors.secondary} dimColor>
					↑/↓: Navigate models | ←/→: Switch tabs | Press Escape to Close
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
			borderStyle={'round'}
			borderColor={colors.secondary}
			padding={1}
			width={'50%'}
		>
			<Box marginBottom={1}>
				<Text color={colors.primary} bold underline>
					Your System:
				</Text>
			</Box>

			<Text>
				{systemCaps.memory.total}GB RAM, {systemCaps.cpu.cores} cores, {gpuText}
			</Text>
			<Text color={colors.white}>Network: {networkText}</Text>
		</Box>
	);
}

function QuickStartSection({
	topLocalModel,
	topApiModel,
	colors,
}: {
	topLocalModel: ModelRecommendationEnhanced | null;
	topApiModel: ModelRecommendationEnhanced | null;
	colors: any;
}) {
	return (
		<Box
			flexDirection="column"
			borderStyle={'round'}
			borderColor={colors.secondary}
			padding={1}
			width={'50%'}
		>
			<Box marginBottom={1}>
				<Text color={colors.success} bold underline>
					Quick Start:
				</Text>
			</Box>

			{topLocalModel && (
				<Box marginBottom={1}>
					<Text color={colors.success}>
						<Text bold>👉 Local: </Text>
						{topLocalModel.model.name}
					</Text>
				</Box>
			)}

			{topApiModel && (
				<Box marginBottom={1}>
					<Text color={colors.primary}>
						<Text bold>👉 API: </Text>
						{topApiModel.model.name}
					</Text>
				</Box>
			)}

			{!topLocalModel && !topApiModel && (
				<Text color={colors.warning}>No models available</Text>
			)}
		</Box>
	);
}

function ModelsTabView({
	models,
	colors,
	currentModelIndex,
	activeTab,
	onTabChange,
	systemCaps,
}: {
	models: ModelRecommendationEnhanced[];
	colors: any;
	currentModelIndex: number;
	activeTab: 'local' | 'api';
	onTabChange: (tab: 'local' | 'api') => void;
	systemCaps: SystemCapabilities;
}) {
	// Calculate quality scores for sorting
	const getQualityScore = (model: ModelRecommendationEnhanced) => {
		return (
			model.model.quality.coding +
			model.model.quality.agentic +
			model.model.quality.tools
		);
	};

	// Check if model can run locally on this system
	const canRunLocally = (model: ModelRecommendationEnhanced) => {
		return (
			!model.model.minMemoryGB ||
			systemCaps.memory.total >= model.model.minMemoryGB
		);
	};

	// Separate models into local and API, then sort by quality
	// For local models, prioritize runnable models over non-runnable
	const localModels = models
		.filter(m => m.model.local)
		.sort((a, b) => {
			const aCanRun = canRunLocally(a);
			const bCanRun = canRunLocally(b);

			// Runnable models first
			if (aCanRun && !bCanRun) return -1;
			if (!aCanRun && bCanRun) return 1;

			// Then by quality
			return getQualityScore(b) - getQualityScore(a);
		});

	const apiModels = models
		.filter(m => m.model.api)
		.sort((a, b) => getQualityScore(b) - getQualityScore(a));

	// Get current models based on active tab
	const currentModels = activeTab === 'local' ? localModels : apiModels;
	const currentModel = currentModels[currentModelIndex];

	if (!currentModel) {
		return (
			<Box
				flexDirection="column"
				borderStyle={'round'}
				borderColor={colors.secondary}
				padding={1}
			>
				<Box marginBottom={1}>
					<Text color={colors.primary} bold underline>
						Model Database:
					</Text>
				</Box>
				<Tabs
					onChange={name => onTabChange(name as 'local' | 'api')}
					defaultValue={activeTab}
					colors={{
						activeTab: {
							color: colors.success,
						},
					}}
				>
					<Tab name="local">Local Models</Tab>
					<Tab name="api">API Models</Tab>
				</Tabs>
				<Box marginTop={1}>
					<Text color={colors.warning}>
						No models available in this category
					</Text>
				</Box>
			</Box>
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
				<Text color={colors.primary} bold underline>
					Model Database:
				</Text>
			</Box>
			<Tabs
				onChange={name => onTabChange(name as 'local' | 'api')}
				defaultValue={activeTab}
				colors={{
					activeTab: {
						color: colors.success,
					},
				}}
			>
				<Tab name="local">Local Models</Tab>
				<Tab name="api">API Models</Tab>
			</Tabs>

			<Box flexDirection="column" marginTop={1}>
				<Box marginBottom={1}>
					<Text color={colors.secondary} dimColor>
						Model {currentModelIndex + 1} of {currentModels.length}
					</Text>
				</Box>
				<ModelItem
					model={currentModel}
					colors={colors}
					showScore={true}
					qualityScore={getQualityScore(currentModel)}
					isLocalTab={activeTab === 'local'}
					systemCaps={systemCaps}
				/>
			</Box>
		</Box>
	);
}

function ModelItem({
	model,
	colors,
	showScore,
	qualityScore,
	isLocalTab,
	systemCaps,
}: {
	model: ModelRecommendationEnhanced;
	colors: any;
	showScore?: boolean;
	qualityScore?: number;
	isLocalTab?: boolean;
	systemCaps?: SystemCapabilities;
}) {
	// Access type from local/api flags
	const accessTypes = [];
	if (model.model.local) accessTypes.push('Local');
	if (model.model.api) accessTypes.push('API');
	const accessType = accessTypes.join(' + ') || 'Unknown';

	// Check if model can run locally
	const canRunLocally =
		!model.model.minMemoryGB ||
		(systemCaps && systemCaps.memory.total >= model.model.minMemoryGB);

	// Get score color and label based on quality
	// For local tab, penalize if user can't actually run it
	const getScoreInfo = (score: number) => {
		let adjustedScore = score;

		// If viewing in local tab but can't run locally, severely penalize
		if (isLocalTab && !canRunLocally) {
			adjustedScore = Math.floor(score * 0.3); // Reduce to 30% of original score
		}

		if (adjustedScore >= 24) return {color: colors.success, label: 'Excellent'};
		if (adjustedScore >= 18) return {color: colors.primary, label: 'Good'};
		if (adjustedScore >= 12) return {color: colors.warning, label: 'Decent'};
		return {color: colors.error, label: 'Poor'};
	};

	const scoreInfo =
		qualityScore !== undefined ? getScoreInfo(qualityScore) : null;

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color={colors.primary} bold underline>
					{model.model.name}
				</Text>
			</Box>
			<Box marginLeft={2} flexDirection="column">
				<Box flexDirection="column" marginBottom={1}>
					<Text color={colors.white}>
						<Text bold>Author: </Text>
						{model.model.author}
					</Text>
					<Text color={colors.white}>
						<Text bold>Size: </Text>
						{model.model.size}
					</Text>
					<Text color={colors.white}>
						<Text bold>Access: </Text>
						{accessType}
					</Text>
					<Text color={colors.white}>
						<Text bold>Cost: </Text>
						{model.model.costDetails}
					</Text>
					{showScore && scoreInfo && (
						<Text color={colors.white}>
							<Text bold>Quality For You: </Text>
							<Text color={scoreInfo.color} bold>
								{scoreInfo.label}
							</Text>
							<Text dimColor> ({qualityScore}/30)</Text>
						</Text>
					)}
				</Box>
				<Box flexDirection="column">
					<Text color={colors.success} bold>
						Strengths:
					</Text>
					{model.recommendation.split('\n').map((line, i) => (
						<Text key={i} color={colors.success}>
							{line}
						</Text>
					))}
				</Box>
			</Box>
		</Box>
	);
}

// Export the display component for use in app.tsx
export {RecommendationsDisplay};

export const recommendationsCommand: Command = {
	name: 'recommendations',
	description: 'Get AI model recommendations based on your system',
	handler: async (_args: string[], _messages, _metadata) => {
		// This command is handled specially in app.tsx
		// This handler exists only for registration purposes
		return React.createElement(React.Fragment);
	},
};
