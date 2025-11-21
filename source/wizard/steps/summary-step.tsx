import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import type {ProviderConfig} from '../../types/config';
import type {McpServerConfig} from '../templates/mcp-templates';
import {colors} from '@/config/index';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';

interface SummaryStepProps {
	configPath: string;
	providers: ProviderConfig[];
	mcpServers: Record<string, McpServerConfig>;
	onSave: () => void;
	onAddProviders: () => void;
	onAddMcpServers: () => void;
	onCancel: () => void;
	onBack?: () => void;
}

export function SummaryStep({
	configPath,
	providers,
	mcpServers,
	onSave,
	onAddProviders,
	onAddMcpServers,
	onCancel,
	onBack,
}: SummaryStepProps) {
	const {isNarrow, truncatePath} = useResponsiveTerminal();

	const options = [
		{label: 'Save configuration', value: 'save'},
		{label: 'Add more providers', value: 'add-providers'},
		{label: 'Add more MCP servers', value: 'add-mcp'},
		{label: 'Cancel (discard changes)', value: 'cancel'},
	];

	const handleSelect = (item: {value: string; label: string}) => {
		switch (item.value) {
			case 'save': {
				onSave();
				break;
			}
			case 'add-providers': {
				onAddProviders();
				break;
			}
			case 'add-mcp': {
				onAddMcpServers();
				break;
			}
			case 'cancel': {
				onCancel();
				break;
			}
		}
	};

	// Handle Shift+Tab to go back
	useInput((_input, key) => {
		if (key.shift && key.tab) {
			if (onBack) {
				onBack();
			}
		}
	});

	const serverNames = Object.keys(mcpServers);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold color={colors.primary}>
					Configuration Summary
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color={colors.secondary}>{'─'.repeat(isNarrow ? 30 : 60)}</Text>
			</Box>

			<Box marginBottom={1} flexDirection="column">
				<Text bold color={colors.primary}>
					Location:
				</Text>
				<Text color={colors.success}>
					{isNarrow ? truncatePath(configPath, 40) : configPath}
				</Text>
			</Box>

			<Box marginBottom={1} flexDirection="column">
				<Text bold color={colors.primary}>
					Providers ({providers.length}):
				</Text>
				{providers.length === 0 ? (
					<Text color={colors.warning}> None</Text>
				) : (
					providers.map((provider, index) => (
						<Box key={index} flexDirection="column" marginLeft={2}>
							<Text>
								• <Text color={colors.success}>{provider.name}</Text>
							</Text>
							{!isNarrow && provider.baseUrl && (
								<Text dimColor> URL: {provider.baseUrl}</Text>
							)}
							{!isNarrow && (
								<Text dimColor>
									Models: {provider.models?.join(', ') || 'none'}
								</Text>
							)}
						</Box>
					))
				)}
			</Box>

			<Box marginBottom={1} flexDirection="column">
				<Text bold color={colors.primary}>
					MCP Servers ({serverNames.length}):
				</Text>
				{serverNames.length === 0 ? (
					<Text color={colors.warning}> None</Text>
				) : (
					serverNames.map(name => {
						const server = mcpServers[name];
						return (
							<Box key={name} flexDirection="column" marginLeft={2}>
								<Text>
									• <Text color={colors.success}>{server.name}</Text>
								</Text>
								{!isNarrow && (
									<>
										<Text dimColor>
											Cmd: {server.command} {server.args?.join(' ') || ''}
										</Text>
										{server.env && Object.keys(server.env).length > 0 && (
											<Text dimColor>
												Env: {Object.keys(server.env).join(', ')}
											</Text>
										)}
									</>
								)}
							</Box>
						);
					})
				)}
			</Box>

			<Box marginBottom={1}>
				<Text color={colors.secondary}>{'─'.repeat(isNarrow ? 30 : 60)}</Text>
			</Box>

			{providers.length === 0 && (
				<Box marginBottom={1}>
					<Text color={colors.warning}>
						⚠️{' '}
						{isNarrow ? 'No providers!' : 'Warning: No providers configured.'}
					</Text>
				</Box>
			)}

			<SelectInput items={options} onSelect={handleSelect} />
		</Box>
	);
}
