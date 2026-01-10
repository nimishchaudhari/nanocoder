import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {Box, Text, useFocus, useInput} from 'ink';
import Spinner from 'ink-spinner';
import {useEffect, useState} from 'react';
import {TitledBoxWithPreferences} from '@/components/ui/titled-box';
import {colors} from '@/config/index';
import {getConfigPath} from '@/config/paths';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';
import {logError, logWarning} from '@/utils/message-queue';
import type {ProviderConfig} from '../types/config';
import {type ConfigLocation, LocationStep} from './steps/location-step';
import {McpStep} from './steps/mcp-step';
import {ProviderStep} from './steps/provider-step';
import {SummaryStep} from './steps/summary-step';
import type {McpServerConfig} from './templates/mcp-templates';
import {buildMcpConfigObject, buildProviderConfigObject} from './validation';

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
	| 'editing'
	| 'saving'
	| 'complete';

export function ConfigWizard({
	projectDir,
	onComplete,
	onCancel,
}: ConfigWizardProps) {
	const [step, setStep] = useState<WizardStep>('location');
	const [providerConfigPath, setProviderConfigPath] = useState('');
	const [mcpConfigPath, setMcpConfigPath] = useState('');
	const [providers, setProviders] = useState<ProviderConfig[]>([]);
	const [mcpServers, setMcpServers] = useState<Record<string, McpServerConfig>>(
		{},
	);
	const [error, setError] = useState<string | null>(null);
	const {boxWidth, isNarrow} = useResponsiveTerminal();

	// Capture focus to ensure keyboard handling works properly
	useFocus({autoFocus: true, id: 'config-wizard'});

	// Load existing config if editing
	useEffect(() => {
		if (!providerConfigPath || !mcpConfigPath) {
			return;
		}

		// Use a microtask to defer state updates
		void Promise.resolve().then(() => {
			try {
				let loadedProviders: ProviderConfig[] = [];
				let loadedMcpServers: Record<string, McpServerConfig> = {};

				// Try to load providers from agents.config.json
				if (existsSync(providerConfigPath)) {
					try {
						const providerContent = readFileSync(providerConfigPath, 'utf-8');
						const providerConfig = JSON.parse(providerContent) as {
							nanocoder?: {
								providers?: ProviderConfig[];
								mcpServers?:
									| McpServerConfig[]
									| Record<string, McpServerConfig>;
							};
						};
						loadedProviders = providerConfig.nanocoder?.providers || [];

						// Check if old-style MCP servers exist in provider config
						if (providerConfig.nanocoder?.mcpServers) {
							const mcpServersData = providerConfig.nanocoder.mcpServers;
							if (Array.isArray(mcpServersData)) {
								// Old array format - convert to object format
								for (const server of mcpServersData) {
									loadedMcpServers[server.name] = server;
								}
								logWarning(
									`MCP servers found in ${providerConfigPath}. ` +
										'They will be migrated to .mcp.json when you save.',
								);
							} else {
								// Already object format
								loadedMcpServers = mcpServersData;
							}
						}
					} catch (err) {
						logError('Failed to load provider configuration', true, {
							context: {providerConfigPath},
							error: err instanceof Error ? err.message : String(err),
						});
					}
				}

				// Try to load MCP servers from .mcp.json (new location)
				if (existsSync(mcpConfigPath)) {
					try {
						const mcpContent = readFileSync(mcpConfigPath, 'utf-8');
						const mcpConfig = JSON.parse(mcpContent) as {
							mcpServers?: Record<string, McpServerConfig>;
						};
						// New format takes precedence over migrated data
						if (mcpConfig.mcpServers) {
							loadedMcpServers = mcpConfig.mcpServers;
						}
					} catch (err) {
						logError('Failed to load MCP configuration', true, {
							context: {mcpConfigPath},
							error: err instanceof Error ? err.message : String(err),
						});
					}
				}

				setProviders(loadedProviders);
				setMcpServers(loadedMcpServers);
			} catch (err) {
				logError('Failed to load existing configuration', true, {
					context: {providerConfigPath, mcpConfigPath},
					error: err instanceof Error ? err.message : String(err),
				});
			}
		});
	}, [providerConfigPath, mcpConfigPath]);

	const handleLocationComplete = (location: ConfigLocation) => {
		// Determine the base directory based on location
		const baseDir = location === 'project' ? process.cwd() : getConfigPath();

		setProviderConfigPath(join(baseDir, 'agents.config.json'));
		setMcpConfigPath(join(baseDir, '.mcp.json'));
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

	const handleSave = () => {
		setStep('saving');
		setError(null);

		try {
			// Build and save provider config
			if (providers.length > 0) {
				const providerConfig = buildProviderConfigObject(providers);
				const providerDir = dirname(providerConfigPath);
				if (!existsSync(providerDir)) {
					mkdirSync(providerDir, {recursive: true});
				}
				writeFileSync(
					providerConfigPath,
					JSON.stringify(providerConfig, null, 2),
					'utf-8',
				);
			}

			// Build and save MCP config
			if (Object.keys(mcpServers).length > 0) {
				const mcpConfig = buildMcpConfigObject(mcpServers);
				const mcpDir = dirname(mcpConfigPath);
				if (!existsSync(mcpDir)) {
					mkdirSync(mcpDir, {recursive: true});
				}
				writeFileSync(
					mcpConfigPath,
					JSON.stringify(mcpConfig, null, 2),
					'utf-8',
				);
			}

			setStep('complete');
			// Don't auto-complete - wait for user to press Enter
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

	const openInEditor = () => {
		try {
			// Save current progress to both files
			if (providers.length > 0) {
				const providerConfig = buildProviderConfigObject(providers);
				const providerDir = dirname(providerConfigPath);
				if (!existsSync(providerDir)) {
					mkdirSync(providerDir, {recursive: true});
				}
				writeFileSync(
					providerConfigPath,
					JSON.stringify(providerConfig, null, 2),
					'utf-8',
				);
			}

			if (Object.keys(mcpServers).length > 0) {
				const mcpConfig = buildMcpConfigObject(mcpServers);
				const mcpDir = dirname(mcpConfigPath);
				if (!existsSync(mcpDir)) {
					mkdirSync(mcpDir, {recursive: true});
				}
				writeFileSync(
					mcpConfigPath,
					JSON.stringify(mcpConfig, null, 2),
					'utf-8',
				);
			}

			// Detect editor (respect $EDITOR or $VISUAL environment variables)
			// Fall back to nano on Unix/Mac (much friendlier than vi!)
			// On Windows, use notepad
			const editor =
				process.env.EDITOR ||
				process.env.VISUAL ||
				(process.platform === 'win32' ? 'notepad' : 'nano');

			// Show cursor and restore terminal for editor
			process.stdout.write('\x1B[?25h'); // Show cursor
			process.stdin.setRawMode?.(false); // Disable raw mode

			// Open provider config in editor (primary config file)
			const result = spawnSync(editor, [providerConfigPath], {
				stdio: 'inherit', // Give editor full control of terminal
			});

			// Restore terminal state after editor closes
			process.stdin.setRawMode?.(true); // Re-enable raw mode
			process.stdout.write('\x1B[?25l'); // Hide cursor (Ink will manage it)

			if (result.status === 0) {
				// Reload both configs to get updated values
				let loadedProviders: ProviderConfig[] = [];
				let loadedMcpServers: Record<string, McpServerConfig> = {};

				// Reload provider config
				if (existsSync(providerConfigPath)) {
					try {
						const editedContent = readFileSync(providerConfigPath, 'utf-8');
						const editedConfig = JSON.parse(editedContent) as {
							nanocoder?: {
								providers?: ProviderConfig[];
								mcpServers?:
									| McpServerConfig[]
									| Record<string, McpServerConfig>;
							};
						};
						loadedProviders = editedConfig.nanocoder?.providers || [];

						// Check if MCP servers were edited in provider config
						if (editedConfig.nanocoder?.mcpServers) {
							const mcpServersData = editedConfig.nanocoder.mcpServers;
							if (Array.isArray(mcpServersData)) {
								for (const server of mcpServersData) {
									loadedMcpServers[server.name] = server;
								}
							} else {
								loadedMcpServers = mcpServersData;
							}
						}
					} catch (parseErr) {
						setError(
							parseErr instanceof Error
								? `Invalid JSON: ${parseErr.message}`
								: 'Failed to parse edited configuration',
						);
						setStep('summary');
						return;
					}
				}

				// Also reload MCP config if it exists (takes precedence)
				if (existsSync(mcpConfigPath)) {
					try {
						const mcpContent = readFileSync(mcpConfigPath, 'utf-8');
						const mcpConfig = JSON.parse(mcpContent) as {
							mcpServers?: Record<string, McpServerConfig>;
						};
						if (mcpConfig.mcpServers) {
							loadedMcpServers = mcpConfig.mcpServers;
						}
					} catch {
						// Ignore MCP config parse errors, use loaded values
					}
				}

				setProviders(loadedProviders);
				setMcpServers(loadedMcpServers);

				// Return to summary to review changes
				setStep('summary');
				setError(null);
			} else {
				setError('Editor exited with an error. Changes may not be saved.');
				setStep('summary');
			}
		} catch (err) {
			// Restore terminal state on error
			process.stdin.setRawMode?.(true);
			process.stdout.write('\x1B[?25l');

			setError(
				err instanceof Error
					? `Failed to open editor: ${err.message}`
					: 'Failed to open editor',
			);
			setStep('summary');
		}
	};

	// Handle global keyboard shortcuts
	useInput((input, key) => {
		// In complete step, wait for Enter to finish
		if (step === 'complete' && key.return) {
			onComplete(providerConfigPath);
			return;
		}

		// Escape - cancel/exit wizard completely
		if (key.escape) {
			if (onCancel) {
				onCancel();
			}
			return;
		}

		// Ctrl+E to open editor (available after location is chosen)
		if (
			key.ctrl &&
			input === 'e' &&
			providerConfigPath &&
			(step === 'providers' || step === 'mcp' || step === 'summary')
		) {
			openInEditor();
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
						providerConfigPath={providerConfigPath}
						mcpConfigPath={mcpConfigPath}
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
			case 'editing': {
				return (
					<Box flexDirection="column">
						<Box marginBottom={1}>
							<Text color={colors.primary}>Opening editor...</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor>Configuration files:</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor> Providers: {providerConfigPath}</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor> MCP: {mcpConfigPath}</Text>
						</Box>
						<Box>
							<Text color={colors.secondary}>
								Save and close your editor to return to the wizard.
							</Text>
						</Box>
					</Box>
				);
			}
			case 'saving': {
				return (
					<Box flexDirection="column">
						<Box>
							<Text color={colors.success}>
								<Spinner type="dots" /> Saving configuration...
							</Text>
						</Box>
					</Box>
				);
			}
			case 'complete': {
				return (
					<Box flexDirection="column">
						<Box marginBottom={1}>
							<Text color={colors.success} bold>
								✓ Configuration saved!
							</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor>Saved to:</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor> Providers: {providerConfigPath}</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor> MCP: {mcpConfigPath}</Text>
						</Box>
						<Box>
							<Text color={colors.secondary}>Press Enter to continue</Text>
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
		<TitledBoxWithPreferences
			title="Configuration Wizard"
			reversePowerline={true}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			{error && (
				<Box marginBottom={1}>
					<Text color={colors.error}>Error: {error}</Text>
				</Box>
			)}

			{renderStep()}

			{(step === 'location' ||
				step === 'providers' ||
				step === 'mcp' ||
				step === 'summary') &&
				(isNarrow ? (
					<Box marginTop={1} flexDirection="column">
						<Text color={colors.secondary}>Esc: Exit wizard</Text>
						<Text color={colors.secondary}>Shift+Tab: Go back</Text>
						{providerConfigPath && (
							<Text color={colors.secondary}>Ctrl+E: Edit manually</Text>
						)}
					</Box>
				) : (
					<Box marginTop={1}>
						<Text color={colors.secondary}>
							Esc: Exit wizard | Shift+Tab: Go back
							{providerConfigPath && ' | Ctrl+E: Edit manually'}
						</Text>
					</Box>
				))}
		</TitledBoxWithPreferences>
	);
}
