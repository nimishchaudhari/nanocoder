import {Box, Text} from 'ink';
import React from 'react';
import {TitledBoxWithPreferences} from '@/components/ui/titled-box';
import {getMcpServerSources, getSourceLabel} from '@/config/mcp-config-loader';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {useTheme} from '@/hooks/useTheme';
import {getToolManager} from '@/message-handler';
import {ToolManager} from '@/tools/tool-manager';
import type {Command} from '@/types/index';

// Helper function to get transport icons
function getTransportIcon(transportType: string): string {
	switch (transportType.toLowerCase()) {
		case 'stdio':
			return '💻';
		case 'websocket':
			return '🔄';
		case 'http':
			return '🌐';
		default:
			return '❓';
	}
}

interface MCPProps {
	toolManager: ToolManager | null;
}

export function MCP({toolManager}: MCPProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const connectedServers = toolManager?.getConnectedServers() || [];

	return (
		<TitledBoxWithPreferences
			title="/mcp"
			reversePowerline={true}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			{connectedServers.length === 0 ? (
				<>
					<Box marginBottom={1}>
						<Text color={colors.text} bold>
							No MCP servers connected
						</Text>
					</Box>

					<Text color={colors.text}>
						To connect MCP servers, add them to your{' '}
						<Text color={colors.primary}>agents.config.json</Text> file:
					</Text>

					<Box marginTop={1} marginBottom={1}>
						<Text color={colors.secondary}>
							{`{
  "nanocoder": {
    "mcpServers": [
      {
        "name": "example-server",
        "transport": "stdio",
        "command": "node",
        "args": ["path/to/server.js"],
        "env": {
          "API_KEY": "your-key"
        }
      },
      {
        "name": "remote-server",
        "transport": "http",
        "url": "https://example.com/mcp",
        "timeout": 30000
      }
    ]
  }
}`}
						</Text>
					</Box>

					<Text color={colors.secondary}>
						Use <Text color={colors.primary}>/setup-config</Text> to configure
						servers interactively.
					</Text>
				</>
			) : (
				<>
					<Box marginBottom={1}>
						<Text color={colors.primary}>
							Connected MCP Servers ({connectedServers.length}):
						</Text>
					</Box>

					{connectedServers.map((serverName, index) => {
						const serverTools = toolManager?.getServerTools(serverName) || [];
						const serverInfo = toolManager?.getServerInfo(serverName);
						const transportIcon = getTransportIcon(
							serverInfo?.transport || 'stdio',
						);

						// Get the source information for this server
						const mcpServerSources = getMcpServerSources();
						const serverSource = mcpServerSources.find(
							item => item.server.name === serverName,
						);
						const sourceLabel = serverSource
							? getSourceLabel(serverSource.source)
							: '';

						return (
							<Box key={index} marginBottom={1}>
								<Box flexDirection="column">
									<Text color={colors.text}>
										• {transportIcon}{' '}
										<Text color={colors.primary}>{serverName}</Text>
										{sourceLabel && (
											<Text color={colors.secondary}> {sourceLabel}</Text>
										)}
										:{' '}
										<Text color={colors.secondary}>
											({serverInfo?.transport?.toUpperCase() || 'STDIO'})
										</Text>{' '}
										• {serverTools.length} tool
										{serverTools.length !== 1 ? 's' : ''}
									</Text>

									{serverInfo?.url && (
										<Text color={colors.secondary}>URL: {serverInfo.url}</Text>
									)}

									{serverInfo?.description && (
										<Text color={colors.secondary}>
											{serverInfo.description}
										</Text>
									)}

									{serverInfo?.tags && serverInfo.tags.length > 0 && (
										<Text color={colors.secondary}>
											Tags: {serverInfo.tags.map(tag => `#${tag}`).join(' ')}
										</Text>
									)}

									{serverTools.length > 0 && (
										<Text color={colors.secondary}>
											Tools:{' '}
											{serverTools
												.map((t: {name: string}) => t.name)
												.join(', ')}
										</Text>
									)}
								</Box>
							</Box>
						);
					})}
				</>
			)}
		</TitledBoxWithPreferences>
	);
}

export const mcpCommand: Command = {
	name: 'mcp',
	description: 'Show connected MCP servers and their tools',
	handler: (_args: string[], _messages, _metadata) => {
		const toolManager = getToolManager();

		return Promise.resolve(
			React.createElement(MCP, {
				key: `mcp-${Date.now()}`,
				toolManager: toolManager,
			}),
		);
	},
};
