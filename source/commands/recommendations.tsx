import React, {useState, useEffect} from 'react';
import {Box, Text, useInput, useFocus} from 'ink';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
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
	const [quickStart, setQuickStart] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showAllModels, setShowAllModels] = useState(false);
	const [closed, setClosed] = useState(false);

	// Capture focus to prevent user input from being active
	useFocus({autoFocus: true, id: 'recommendations-display'});

	// Keyboard handler to toggle showing all models and close
	// Consume all input to prevent it from appearing in the chat
	useInput((input, key) => {
		if (key.escape || key.return) {
			setClosed(true);
			if (onCancel) {
				onCancel();
			}
		} else if (input === 'm' || input === 'M') {
			setShowAllModels(prev => !prev);
		}
		// Consume all other input by doing nothing
	});

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
			<SystemSummary systemCaps={systemCaps} colors={colors} />

			{quickStart && (
				<QuickStartSection quickStart={quickStart} colors={colors} />
			)}

			<ModelsList models={models} colors={colors} showAll={showAllModels} />

			<Box marginTop={1} flexDirection="column">
				<Box marginBottom={1}>
					<Text color={colors.secondary} dimColor>
						💡 Add providers to agents.config.json to use these models.
					</Text>
				</Box>

				<Text color={colors.secondary} dimColor>
					Press Escape or Enter to close
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
			<Text color={colors.primary} bold underline>
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
				<Text color={colors.success} bold underline>
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
	showAll,
}: {
	models: ModelRecommendationEnhanced[];
	colors: any;
	showAll: boolean;
}) {
	if (models.length === 0) {
		return (
			<Text color={colors.warning}>
				No compatible models found for your system.
			</Text>
		);
	}

	const displayModels = showAll ? models : models.slice(0, 2);
	const hasMore = models.length > 2;

	return (
		<Box
			flexDirection="column"
			borderStyle={'round'}
			borderColor={colors.secondary}
			padding={1}
		>
			<Box marginBottom={1} flexDirection="column">
				<Text color={colors.success} bold>
					Other Models:
				</Text>
				{hasMore && (
					<Text color={colors.secondary} dimColor>
						Press 'm' to {showAll ? 'hide' : 'show all'} ({models.length} total)
					</Text>
				)}
			</Box>

			{displayModels.map(model => (
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
	// Access type from local/api flags
	const accessTypes = [];
	if (model.model.local) accessTypes.push('Local');
	if (model.model.api) accessTypes.push('API');
	const accessType = accessTypes.join(' + ') || 'Unknown';

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color={colors.primary} bold underline>
				{model.model.name}
			</Text>
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
				</Box>
				<Box flexDirection="column" marginBottom={1}>
					<Text color={colors.success}>
						<Text bold>Strengths:</Text>
					</Text>
					<Text color={colors.success}>{model.recommendation}</Text>
				</Box>
				{model.warnings.length > 0 && (
					<Box flexDirection="column">
						<Text color={colors.warning}>
							<Text bold>Limitations:</Text>
						</Text>
						{model.warnings.map((warning, i) => (
							<Text key={i} color={colors.warning}>
								• {warning}
							</Text>
						))}
					</Box>
				)}
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
