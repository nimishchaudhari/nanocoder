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
import type {UserPreferences} from './types/index.js';
import {setToolRegistryGetter} from './message-handler.js';
import {commandRegistry} from './commands.js';
import {shouldLog} from './config/logging.js';
import {appConfig} from './config/index.js';
import {createLLMClient} from './client-factory.js';
import UserInput from './components/user-input.js';
import Status from './components/status.js';
import ChatQueue from './components/chat-queue.js';
import InfoMessage from './components/info-message.js';
import ModelSelector from './components/model-selector.js';
import ProviderSelector from './components/provider-selector.js';
import {
	helpCommand,
	exitCommand,
	clearCommand,
	modelCommand,
	providerCommand,
	commandsCommand,
} from './commands/index.js';
import SuccessMessage from './components/success-message.js';

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

	// Model selection mode
	const [isModelSelectionMode, setIsModelSelectionMode] =
		useState<boolean>(false);

	// Provider selection mode
	const [isProviderSelectionMode, setIsProviderSelectionMode] =
		useState<boolean>(false);

	// Chat queue for components
	const [chatComponents, setChatComponents] = useState<React.ReactNode[]>([]);

	// Helper function to add components to the chat queue
	const addToChatQueue = (component: React.ReactNode) => {
		setChatComponents(prev => [...prev, component]);
	};

	// Helper function to enter model selection mode
	const enterModelSelectionMode = () => {
		setIsModelSelectionMode(true);
	};

	// Helper function to enter provider selection mode
	const enterProviderSelectionMode = () => {
		setIsProviderSelectionMode(true);
	};

	// Handle model selection
	const handleModelSelect = async (selectedModel: string) => {
		if (client && selectedModel !== currentModel) {
			client.setModel(selectedModel);
			setCurrentModel(selectedModel);

			// Update preferences
			updateLastUsed(currentProvider, selectedModel);

			// Add success message to chat queue
			addToChatQueue(
				<SuccessMessage
					key={`model-changed-${Date.now()}`}
					message={`Model changed to: ${selectedModel}`}
				/>,
			);
		}
		setIsModelSelectionMode(false);
	};

	// Handle model selection cancel
	const handleModelSelectionCancel = () => {
		setIsModelSelectionMode(false);
	};

	// Handle provider selection
	const handleProviderSelect = async (selectedProvider: ProviderType) => {
		if (selectedProvider !== currentProvider) {
			try {
				// Create new client for the selected provider
				const {client: newClient, actualProvider} = await createLLMClient(selectedProvider);
				setClient(newClient);
				setCurrentProvider(actualProvider);
				
				// Set the model from the new client
				const newModel = newClient.getCurrentModel();
				setCurrentModel(newModel);

				// Update preferences - use the actualProvider (which is what was successfully created)
				updateLastUsed(actualProvider, newModel);

				// Add success message to chat queue
				addToChatQueue(
					<SuccessMessage
						key={`provider-changed-${Date.now()}`}
						message={`Provider changed to: ${actualProvider}, model: ${newModel}`}
					/>,
				);
			} catch (error) {
				// Add error message if provider change fails
				addToChatQueue(
					<InfoMessage
						key={`provider-error-${Date.now()}`}
						message={`Failed to change provider: ${error}`}
					/>,
				);
			}
		}
		setIsProviderSelectionMode(false);
	};

	// Handle provider selection cancel
	const handleProviderSelectionCancel = () => {
		setIsProviderSelectionMode(false);
	};

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

			// Load preferences - we'll pass them directly to avoid state timing issues
			const preferences = loadPreferences();

			// Add info message to chat queue when preferences are loaded
			addToChatQueue(
				<InfoMessage
					key="preferences-loaded"
					message="User preferences loaded..."
				/>,
			);

			// Set up the tool registry getter for the message handler
			setToolRegistryGetter(() => newToolManager.getToolRegistry());

			commandRegistry.register([
				helpCommand,
				exitCommand,
				clearCommand,
				modelCommand,
				providerCommand,
				commandsCommand,
			]);

			// Now start with the properly initialized objects
			await start(newToolManager, newCustomCommandLoader, preferences);
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
				// Handle special commands that need app state access
				if (commandName === 'model') {
					enterModelSelectionMode();
					return;
				}

				if (commandName === 'provider') {
					enterProviderSelectionMode();
					return;
				}

				// Execute built-in command
				const result = await commandRegistry.execute(commandName);
				if (result) {
					// Check if result is JSX (React element)
					if (React.isValidElement(result)) {
						addToChatQueue(result);
					} else if (typeof result === 'string' && result.trim()) {
						console.log(result);
					}
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
	const initializeClient = async (preferredProvider?: ProviderType) => {
		const {client, actualProvider} = await createLLMClient(preferredProvider);
		setClient(client);
		setCurrentProvider(actualProvider);

		// Try to use the last used model for this provider
		const lastUsedModel = getLastUsedModel(actualProvider);

		let finalModel: string;
		if (lastUsedModel) {
			const availableModels = await client.getAvailableModels();
			if (availableModels.includes(lastUsedModel)) {
				client.setModel(lastUsedModel);
				finalModel = lastUsedModel;
			} else {
				finalModel = client.getCurrentModel();
			}
		} else {
			finalModel = client.getCurrentModel();
		}
		
		setCurrentModel(finalModel);

		// Save the preference - use actualProvider and the model that was actually set
		updateLastUsed(actualProvider, finalModel);
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
		preferences: UserPreferences,
	): Promise<void> {
		try {
			await initializeClient(preferences.lastProvider);
			await loadCustomCommands(newCustomCommandLoader);
			await initializeMCPServers(newToolManager);
		} catch (error) {
			console.error(`Failed to initialize provider:`, error);
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
					{isModelSelectionMode ? (
						<ModelSelector
							client={client}
							currentModel={currentModel}
							onModelSelect={handleModelSelect}
							onCancel={handleModelSelectionCancel}
						/>
					) : isProviderSelectionMode ? (
						<ProviderSelector
							currentProvider={currentProvider}
							onProviderSelect={handleProviderSelect}
							onCancel={handleProviderSelectionCancel}
						/>
					) : (
						<UserInput
							customCommands={Array.from(customCommandCache.keys())}
							onSubmit={handleMessageSubmit}
						/>
					)}
				</>
			)}
		</Box>
	);
}
