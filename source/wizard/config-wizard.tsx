import {useState, useEffect} from 'react';
import {Box, Text, useInput, useFocus} from 'ink';
import Spinner from 'ink-spinner';
import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import type {ProviderConfig} from '../types/config';
import type {McpServerConfig} from './templates/mcp-templates';
import {LocationStep, type ConfigLocation} from './steps/location-step';
import {ProviderStep} from './steps/provider-step';
import {McpStep} from './steps/mcp-step.js';
import {SummaryStep} from './steps/summary-step';
import {
	validateConfig,
	testAllProviders,
	buildConfigObject,
	type ProviderTestResult,
} from './validation.js';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {colors} from '@/config/index.js';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';

interface ConfigWizardProps {
	projectDir: string;
	onComplete: (configPath: string) => void;
	onCancel?: () => void;
}

type WizardStep =
	| 'location'
	| 'providers'
	| 'mcp'
	| 'summary'
	| 'saving'
	| 'validating'
	| 'complete';

export function ConfigWizard({
	projectDir,
	onComplete,
	onCancel,
}: ConfigWizardProps) {
	const [step, setStep] = useState<WizardStep>('location');
	const [configLocation, setConfigLocation] =
		useState<ConfigLocation>('project');
	const [configPath, setConfigPath] = useState('');
	const [providers, setProviders] = useState<ProviderConfig[]>([]);
	const [mcpServers, setMcpServers] = useState<Record<string, McpServerConfig>>(
		{},
	);
	const [validationResults, setValidationResults] = useState<
		ProviderTestResult[]
	>([]);
	const [error, setError] = useState<string | null>(null);
	const {boxWidth, isNarrow, isNormal} = useResponsiveTerminal();

	// Capture focus to ensure keyboard handling works properly
	useFocus({autoFocus: true, id: 'config-wizard'});

	// Load existing config if editing
	useEffect(() => {
		if (configPath && existsSync(configPath)) {
			try {
				const configContent = readFileSync(configPath, 'utf-8');
				const config = JSON.parse(configContent);

				if (config.nanocoder?.providers) {
					setProviders(config.nanocoder.providers);
				}

				if (config.nanocoder?.mcpServers) {
					setMcpServers(config.nanocoder.mcpServers);
				}
			} catch (err) {
				console.error('Failed to load existing config:', err);
			}
		}
	}, [configPath]);

	const handleLocationComplete = (location: ConfigLocation, path: string) => {
		setConfigLocation(location);
		setConfigPath(path);
		setStep('providers');
	};

	const handleProvidersComplete = (newProviders: ProviderConfig[]) => {
		setProviders(newProviders);
		setStep('mcp');
	};

	const handleMcpComplete = (
		newMcpServers: Record<string, McpServerConfig>,
	) => {
		setMcpServers(newMcpServers);
		setStep('summary');
	};

	const handleSave = async () => {
		setStep('saving');
		setError(null);

		try {
			// Validate configuration
			const validation = validateConfig(providers, mcpServers);
			if (!validation.valid) {
				setError(
					`Configuration validation failed: ${validation.errors.join(', ')}`,
				);
				setStep('summary');
				return;
			}

			// Build config object
			const config = buildConfigObject(providers, mcpServers);

			// Ensure directory exists
			const dir = dirname(configPath);
			if (!existsSync(dir)) {
				mkdirSync(dir, {recursive: true});
			}

			// Write config file
			writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

			// Test provider connections
			setStep('validating');
			const testResults = await testAllProviders(providers);
			setValidationResults(testResults);

			setStep('complete');

			// Wait a moment to show results, then complete
			setTimeout(() => {
				onComplete(configPath);
			}, 2000);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to save configuration',
			);
			setStep('summary');
		}
	};

	const handleAddProviders = () => {
		setStep('providers');
	};

	const handleAddMcpServers = () => {
		setStep('mcp');
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
	};

	// Handle global keyboard shortcuts
	useInput((input, key) => {
		// Escape - cancel/exit wizard completely
		if (key.escape) {
			if (onCancel) {
				onCancel();
			}
			return;
		}

		// Ctrl+E to open editor (future enhancement)
		if (key.ctrl && input === 'e' && step === 'summary') {
			// Future: open editor
			// For now, just show a message
			setError('Manual editor integration coming soon!');
		}
	});

	const renderStep = () => {
		switch (step) {
			case 'location': {
				return (
					<LocationStep
						projectDir={projectDir}
						onComplete={handleLocationComplete}
						onBack={onCancel}
					/>
				);
			}
			case 'providers': {
				return (
					<ProviderStep
						existingProviders={providers}
						onComplete={handleProvidersComplete}
						onBack={() => setStep('location')}
					/>
				);
			}
			case 'mcp': {
				return (
					<McpStep
						existingServers={mcpServers}
						onComplete={handleMcpComplete}
						onBack={() => setStep('providers')}
					/>
				);
			}
			case 'summary': {
				return (
					<SummaryStep
						configPath={configPath}
						providers={providers}
						mcpServers={mcpServers}
						onSave={handleSave}
						onAddProviders={handleAddProviders}
						onAddMcpServers={handleAddMcpServers}
						onCancel={handleCancel}
						onBack={() => setStep('mcp')}
					/>
				);
			}
			case 'saving': {
				return (
					<Box flexDirection="column" paddingX={2} paddingY={1}>
						<Box>
							<Text color="green">
								<Spinner type="dots" /> Saving configuration to {configPath}...
							</Text>
						</Box>
					</Box>
				);
			}
			case 'validating': {
				return (
					<Box flexDirection="column" paddingX={2} paddingY={1}>
						<Box marginBottom={1}>
							<Text color="green">✓ Configuration saved to {configPath}</Text>
						</Box>
						<Box>
							<Text>
								<Spinner type="dots" /> Validating configuration...
							</Text>
						</Box>
						<Box>
							<Text>
								<Spinner type="dots" /> Testing provider connections...
							</Text>
						</Box>
					</Box>
				);
			}
			case 'complete': {
				return (
					<Box flexDirection="column" paddingX={2} paddingY={1}>
						<Box marginBottom={1}>
							<Text color="green">✓ Configuration saved to {configPath}</Text>
						</Box>
						<Box marginBottom={1}>
							<Text color="green">✓ Validating configuration...</Text>
						</Box>
						<Box marginBottom={1} flexDirection="column">
							<Text color="green">✓ Testing provider connections...</Text>
							{validationResults.map(result => (
								<Box key={result.providerName} marginLeft={2}>
									<Text>
										• {result.providerName}:{' '}
										{result.connected ? (
											<Text color="green">Connected ✓</Text>
										) : (
											<Text color="yellow">Not reachable (may still work)</Text>
										)}
									</Text>
								</Box>
							))}
						</Box>
						<Box marginBottom={1}>
							<Text color="green" bold>
								✓ Configuration complete!
							</Text>
						</Box>
						<Box>
							<Text>
								Nanocoder is ready to use. Type your first message to start
								chatting.
							</Text>
						</Box>
					</Box>
				);
			}
			default: {
				return null;
			}
		}
	};

	return (
		<TitledBox
			key={colors.primary}
			borderStyle="round"
			titles={[`Configuration Wizard`]}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			{error && (
				<Box marginBottom={1}>
					<Text color="red">Error: {error}</Text>
				</Box>
			)}

			{renderStep()}

			{(step === 'location' ||
				step === 'providers' ||
				step === 'mcp' ||
				step === 'summary') && (
				<Box marginTop={1}>
					<Text color={colors.secondary}>
						Esc: Exit wizard | Shift+Tab: Go back
						{step === 'summary' && ' | Ctrl+E: Edit manually'}
					</Text>
				</Box>
			)}
		</TitledBox>
	);
}
