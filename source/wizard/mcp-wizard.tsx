import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {Box, Text, useFocus, useInput} from 'ink';
import Spinner from 'ink-spinner';
import {useEffect, useState} from 'react';
import {TitledBoxWithPreferences} from '@/components/ui/titled-box';
import {colors} from '@/config/index';
import {getConfigPath} from '@/config/paths';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';
import {logError} from '@/utils/message-queue';
import {type ConfigLocation, LocationStep} from './steps/location-step';
import {McpStep} from './steps/mcp-step';
import type {McpServerConfig} from './templates/mcp-templates';
import {buildMcpConfigObject} from './validation';

interface McpWizardProps {
	projectDir: string;
	onComplete: (configPath: string) => void;
	onCancel?: () => void;
}

type WizardStep =
	| 'location'
	| 'mcp'
	| 'summary'
	| 'editing'
	| 'saving'
	| 'complete';

export function McpWizard({projectDir, onComplete, onCancel}: McpWizardProps) {
	const [step, setStep] = useState<WizardStep>('location');
	const [mcpConfigPath, setMcpConfigPath] = useState('');
	const [mcpServers, setMcpServers] = useState<Record<string, McpServerConfig>>(
		{},
	);
	const [error, setError] = useState<string | null>(null);
	const {boxWidth, isNarrow} = useResponsiveTerminal();

	// Capture focus to ensure keyboard handling works properly
	useFocus({autoFocus: true, id: 'mcp-wizard'});

	// Load existing config if editing
	useEffect(() => {
		if (!mcpConfigPath) {
			return;
		}

		// Use a microtask to defer state updates
		void Promise.resolve().then(() => {
			try {
				let loadedMcpServers: Record<string, McpServerConfig> = {};

				// Try to load MCP servers from .mcp.json
				if (existsSync(mcpConfigPath)) {
					try {
						const mcpContent = readFileSync(mcpConfigPath, 'utf-8');
						const mcpConfig = JSON.parse(mcpContent) as {
							mcpServers?: Record<string, McpServerConfig>;
						};
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

				setMcpServers(loadedMcpServers);
			} catch (err) {
				logError('Failed to load existing configuration', true, {
					context: {mcpConfigPath},
					error: err instanceof Error ? err.message : String(err),
				});
			}
		});
	}, [mcpConfigPath]);

	const handleLocationComplete = (location: ConfigLocation) => {
		// Determine the base directory based on location
		const baseDir = location === 'project' ? process.cwd() : getConfigPath();
		setMcpConfigPath(join(baseDir, '.mcp.json'));
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

	const handleAddMcpServers = () => {
		setStep('mcp');
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
	};

	// Handle global keyboard shortcuts
	useInput((_input, key) => {
		// In complete step, wait for Enter to finish
		if (step === 'complete' && key.return) {
			onComplete(mcpConfigPath);
			return;
		}

		// Escape - cancel/exit wizard completely
		if (key.escape) {
			if (onCancel) {
				onCancel();
			}
			return;
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
						configFileName=".mcp.json"
					/>
				);
			}
			case 'mcp': {
				return (
					<McpStep
						existingServers={mcpServers}
						onComplete={handleMcpComplete}
						onBack={() => setStep('location')}
					/>
				);
			}
			case 'summary': {
				return (
					<Box flexDirection="column">
						<Box marginBottom={1}>
							<Text bold color={colors.primary}>
								Configuration Summary
							</Text>
						</Box>

						{/* Config location */}
						<Box marginBottom={1} flexDirection="column">
							<Text color={colors.secondary}>Config file:</Text>
							<Text color={colors.success}>{mcpConfigPath}</Text>
						</Box>

						{/* MCP Servers */}
						{Object.keys(mcpServers).length > 0 ? (
							<Box marginBottom={1} flexDirection="column">
								<Text color={colors.secondary}>
									MCP Servers ({Object.keys(mcpServers).length}):
								</Text>
								{Object.entries(mcpServers).map(([key, server]) => (
									<Text key={key} color={colors.success}>
										• {server.name} ({server.transport})
									</Text>
								))}
							</Box>
						) : (
							<Box marginBottom={1}>
								<Text color={colors.warning}>No MCP servers configured</Text>
							</Box>
						)}

						{/* Actions */}
						<Box marginTop={1}>
							<Text color={colors.primary}>Actions:</Text>
						</Box>
						<Box flexDirection="column">
							<Text color={colors.secondary}>• Enter: Save configuration</Text>
							<Text color={colors.secondary}>• a: Add more MCP servers</Text>
							<Text color={colors.secondary}>• Esc: Cancel</Text>
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
							<Text dimColor> {mcpConfigPath}</Text>
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
			title="MCP Server Configuration"
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

			{step === 'location' || step === 'mcp' ? (
				isNarrow ? (
					<Box marginTop={1} flexDirection="column">
						<Text color={colors.secondary}>Esc: Exit wizard</Text>
						<Text color={colors.secondary}>Shift+Tab: Go back</Text>
					</Box>
				) : (
					<Box marginTop={1}>
						<Text color={colors.secondary}>
							Esc: Exit wizard | Shift+Tab: Go back
						</Text>
					</Box>
				)
			) : null}

			{/* Handle summary step actions */}
			{step === 'summary' && (
				<SummaryStepActions
					onSave={handleSave}
					onAddMcpServers={handleAddMcpServers}
					onCancel={handleCancel}
				/>
			)}
		</TitledBoxWithPreferences>
	);
}

interface SummaryStepActionsProps {
	onSave: () => void;
	onAddMcpServers: () => void;
	onCancel: () => void;
}

function SummaryStepActions({
	onSave,
	onAddMcpServers,
	onCancel,
}: SummaryStepActionsProps) {
	useInput((input, key) => {
		if (key.return) {
			onSave();
		} else if (input === 'a') {
			onAddMcpServers();
		} else if (key.escape) {
			onCancel();
		}
	});

	return null;
}
