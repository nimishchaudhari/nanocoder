import React from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import type {ProviderConfig} from '../../types/config';
import type {McpServerConfig} from '../templates/mcp-templates';

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
	const options = [
		{label: '[1] Save configuration', value: 'save'},
		{label: '[2] Add more providers', value: 'add-providers'},
		{label: '[3] Add more MCP servers', value: 'add-mcp'},
		{label: '[4] Cancel (discard changes)', value: 'cancel'},
	];

	const handleSelect = (item: {value: string}) => {
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
		<Box flexDirection="column" paddingX={2} paddingY={1}>
			<Box marginBottom={1}>
				<Text bold>Configuration Summary</Text>
			</Box>

			<Box marginBottom={1}>
				<Text>{'─'.repeat(60)}</Text>
			</Box>

			<Box marginBottom={1}>
				<Text bold>Location: </Text>
				<Text color="cyan">{configPath}</Text>
			</Box>

			<Box marginBottom={1} flexDirection="column">
				<Text bold>Providers ({providers.length}):</Text>
				{providers.length === 0 ? (
					<Text color="yellow"> No providers configured</Text>
				) : (
					providers.map((provider, index) => (
						<Box key={index} flexDirection="column" marginLeft={2}>
							<Text>
								• <Text color="green">{provider.name}</Text>
								{provider.baseUrl && (
									<Text dimColor> ({provider.baseUrl})</Text>
								)}
							</Text>
							<Text dimColor>
								- Models: {provider.models?.join(', ') || 'none'}
							</Text>
						</Box>
					))
				)}
			</Box>

			<Box marginBottom={1} flexDirection="column">
				<Text bold>MCP Servers ({serverNames.length}):</Text>
				{serverNames.length === 0 ? (
					<Text color="yellow"> No MCP servers configured</Text>
				) : (
					serverNames.map(name => {
						const server = mcpServers[name];
						return (
							<Box key={name} flexDirection="column" marginLeft={2}>
								<Text>
									• <Text color="green">{server.name}</Text>
								</Text>
								<Text dimColor>
									- Command: {server.command} {server.args.join(' ')}
								</Text>
								{server.env && Object.keys(server.env).length > 0 && (
									<Text dimColor>
										- Env vars: {Object.keys(server.env).join(', ')}
									</Text>
								)}
							</Box>
						);
					})
				)}
			</Box>

			<Box marginBottom={1}>
				<Text>{'─'.repeat(60)}</Text>
			</Box>

			{providers.length === 0 && (
				<Box marginBottom={1}>
					<Text color="yellow">
						⚠️ Warning: No providers configured. Nanocoder requires at least one
						provider to function.
					</Text>
				</Box>
			)}

			<SelectInput items={options} onSelect={handleSelect as any} />

			<Box marginTop={1}>
				<Text dimColor>
					Press Ctrl+E to open in editor for manual configuration
				</Text>
			</Box>
		</Box>
	);
}
