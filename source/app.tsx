import {Box, Text} from 'ink';
import WelcomeMessage from './components/welcome-message.js';
import {useEffect, useState} from 'react';
import React from 'react';
import {LLMClient, Message, ProviderType} from './types/core.js';
import {ToolManager} from './tools/tool-manager.js';
import {CustomCommandLoader} from './custom-commands/loader.js';
import {CustomCommandExecutor} from './custom-commands/executor.js';
import {
	getLastUsedModel,
	loadPreferences,
	updateLastUsed,
} from './config/preferences.js';
import {setToolRegistryGetter} from './message-handler.js';
import {commandRegistry} from './commands.js';
import {shouldLog} from './config/logging.js';
import {appConfig} from './config/index.js';
import {createLLMClient} from './client-factory.js';
import UserInput from './components/user-input.js';
import Status from './components/status.js';
import ChatQueue from './components/chat-queue.js';
import {helpCommand, exitCommand} from './commands/index.js';

export default function App() {
	const [client, setClient] = useState<LLMClient | null>(null);

	const [messages, setMessages] = useState<Message[]>([]);

	const [currentModel, setCurrentModel] = useState<string>('');

	const [currentProvider, setCurrentProvider] =
		useState<ProviderType>('ollama');

	const [toolManager, setToolManager] = useState<ToolManager | null>(null);

	const [customCommandLoader, setCustomCommandLoader] =
		useState<CustomCommandLoader | null>(null);

	const [customCommandExecutor, setCustomCommandExecutor] =
		useState<CustomCommandExecutor | null>(null);

	const [customCommandCache, setCustomCommandCache] = useState<
		Map<string, any>
	>(new Map());

	const [startChat, setStartChat] = useState<boolean>(false);

	// Chat queue for components
	const [chatComponents, setChatComponents] = useState<React.ReactNode[]>([]);

	useEffect(() => {
		const initializeApp = async () => {
			setClient(null);
			setCurrentModel('');

			const newToolManager = new ToolManager();
			const newCustomCommandLoader = new CustomCommandLoader();
			const newCustomCommandExecutor = new CustomCommandExecutor();

			setToolManager(newToolManager);
			setCustomCommandLoader(newCustomCommandLoader);
			setCustomCommandExecutor(newCustomCommandExecutor);

			// Load preferences to set initial provider
			const preferences = loadPreferences();
			if (preferences.lastProvider) {
				setCurrentProvider(preferences.lastProvider);
			}

			// Set up the tool registry getter for the message handler
			setToolRegistryGetter(() => newToolManager.getToolRegistry());

			commandRegistry.register([helpCommand, exitCommand]);

			// Now start with the properly initialized objects
			await start(newToolManager, newCustomCommandLoader);
			setStartChat(true);
		};

		initializeApp();
	}, []);

	// Handle message submission
	const handleMessageSubmit = async (message: string) => {
		if (message.startsWith('/')) {
			const commandName = message.slice(1).split(' ')[0];

			// Check for custom command first
			const customCommand =
				customCommandCache.get(commandName) ||
				customCommandLoader?.getCommand(commandName);

			if (customCommand) {
				// Execute custom command with any arguments
				const args = message
					.slice(commandName.length + 1)
					.trim()
					.split(/\s+/)
					.filter(arg => arg);
				await customCommandExecutor?.execute(customCommand, args);
			} else {
				// Execute built-in command
				const result = await commandRegistry.execute(commandName);
				if (result && result.trim()) {
					console.log(result);
				}
			}
		} else {
			// Regular message - for now just log it
			console.log('=== COMPLETE MESSAGE ===');
			console.log('Length:', message.length);
			console.log('JSON:', JSON.stringify(message));
			console.log('=========================');
		}
	};

	// Initialize LLM client and model
	const initializeClient = async () => {
		const {client, actualProvider} = await createLLMClient(currentProvider);
		setClient(client);
		setCurrentProvider(actualProvider);

		// Try to use the last used model for this provider
		const lastUsedModel = getLastUsedModel(currentProvider);

		if (lastUsedModel) {
			const availableModels = await client.getAvailableModels();
			if (availableModels.includes(lastUsedModel)) {
				client.setModel(lastUsedModel);
				setCurrentModel(lastUsedModel);
			} else {
				setCurrentModel(client.getCurrentModel());
			}
		} else {
			setCurrentModel(client.getCurrentModel());
		}

		// Save the preference
		updateLastUsed(currentProvider, currentModel);
	};

	// Load and cache custom commands
	const loadCustomCommands = async (loader: CustomCommandLoader) => {
		await loader.loadCommands();
		const customCommands = loader.getAllCommands() || [];

		// Populate command cache for better performance
		customCommandCache.clear();
		for (const command of customCommands) {
			customCommandCache.set(command.name, command);
			// Also cache aliases for quick lookup
			if (command.metadata?.aliases) {
				for (const alias of command.metadata.aliases) {
					customCommandCache.set(alias, command);
				}
			}
		}

		if (customCommands.length > 0 && shouldLog('info')) {
			console.log(
				`Loaded ${customCommands.length} custom commands from .nanocoder/commands`,
			);
		}
	};

	// Initialize MCP servers if configured
	const initializeMCPServers = async (toolManager: ToolManager) => {
		if (appConfig.mcpServers && appConfig.mcpServers.length > 0) {
			if (shouldLog('info')) {
				console.log('Connecting to MCP servers...');
			}
			await toolManager.initializeMCP(appConfig.mcpServers);
		}
	};

	async function start(
		newToolManager: ToolManager,
		newCustomCommandLoader: CustomCommandLoader,
	): Promise<void> {
		try {
			await initializeClient();
			await loadCustomCommands(newCustomCommandLoader);
			await initializeMCPServers(newToolManager);
		} catch (error) {
			console.error(`Failed to initialize ${currentProvider} provider:`, error);
			process.exit(1);
		}
	}

	return (
		<Box flexDirection="column" padding={1} width="100%">
			<WelcomeMessage />

			{startChat && (
				<>
					<ChatQueue
						staticComponents={[
							<Status
								key="status"
								provider={currentProvider}
								model={currentModel}
							/>,
						]}
						queuedComponents={chatComponents}
					/>
					<UserInput
						customCommands={Array.from(customCommandCache.keys())}
						onSubmit={handleMessageSubmit}
					/>
				</>
			)}
		</Box>
	);
}
