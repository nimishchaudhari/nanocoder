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
import type {UserPreferences, MCPInitResult} from './types/index.js';
import {
	setToolRegistryGetter,
	setToolManagerGetter,
} from './message-handler.js';
import {commandRegistry} from './commands.js';
import {shouldLog} from './config/logging.js';
import {appConfig, colors} from './config/index.js';
import {createLLMClient} from './client-factory.js';
import UserInput from './components/user-input.js';
import Status from './components/status.js';
import ChatQueue from './components/chat-queue.js';
import InfoMessage from './components/info-message.js';
import ErrorMessage from './components/error-message.js';
import ModelSelector from './components/model-selector.js';
import ProviderSelector from './components/provider-selector.js';
import {
	helpCommand,
	exitCommand,
	clearCommand,
	modelCommand,
	providerCommand,
	commandsCommand,
	debugCommand,
	mcpCommand,
} from './commands/index.js';
import SuccessMessage from './components/success-message.js';
import UserMessage from './components/user-message.js';
import AssistantMessage from './components/assistant-message.js';
import ThinkingIndicator from './components/thinking-indicator.js';
import Spinner from 'ink-spinner';

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
	const [mcpInitialized, setMcpInitialized] = useState<boolean>(false);
	
	// Thinking indicator state
	const [isThinking, setIsThinking] = useState<boolean>(false);
	const [thinkingStats, setThinkingStats] = useState({
		tokenCount: 0,
		elapsedSeconds: 0,
		contextSize: 0,
		totalTokensUsed: 0,
	});

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
					hideBox={true}
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
				const {client: newClient, actualProvider} = await createLLMClient(
					selectedProvider,
				);
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
						hideBox={true}
					/>,
				);
			} catch (error) {
				// Add error message if provider change fails
				addToChatQueue(
					<ErrorMessage
						key={`provider-error-${Date.now()}`}
						message={`Failed to change provider: ${error}`}
						hideBox={true}
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

	// Handle chat message processing
	const handleChatMessage = async (message: string) => {
		if (!client || !toolManager) return;

		// Add user message to chat
		addToChatQueue(
			<UserMessage 
				key={`user-${Date.now()}`} 
				message={message}
			/>
		);

		// Add user message to conversation history
		const userMessage: Message = { role: 'user', content: message };
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);

		// Start thinking indicator and streaming
		setIsThinking(true);
		
		// Initialize streaming stats
		const startTime = Date.now();
		let tokenCount = 0;
		let fullContent = '';
		
		// Setup timer for thinking indicator updates
		const timerInterval = setInterval(() => {
			const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
			const systemTokens = Math.ceil(300 / 4); // Approximate system prompt tokens
			const conversationTokens = updatedMessages.reduce((total, msg) => {
				return total + Math.ceil((msg.content?.length || 0) / 4);
			}, 0);
			const totalTokensUsed = systemTokens + conversationTokens + tokenCount;
			
			setThinkingStats({
				tokenCount,
				elapsedSeconds,
				contextSize: client.getContextSize(),
				totalTokensUsed,
			});
		}, 1000);
		
		try {
			// Create stream request
			const systemMessage: Message = {
				role: 'system',
				content: 'You are a helpful AI assistant.',
			};
			
			const stream = await client.chatStream(
				[systemMessage, ...updatedMessages],
				toolManager.getAllTools()
			);

			let toolCalls: any = null;
			let hasContent = false;
			
			// Process streaming response
			for await (const chunk of stream) {
				hasContent = true;

				if (chunk.message?.content) {
					fullContent += chunk.message.content;
					tokenCount = Math.ceil(fullContent.length / 4);
				}

				if (chunk.eval_count) {
					tokenCount = chunk.eval_count;
				}

				if (chunk.message?.tool_calls) {
					toolCalls = chunk.message.tool_calls;
				}

				// Update thinking stats in real-time
				if (!chunk.done) {
					const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
					const systemTokens = Math.ceil(300 / 4);
					const conversationTokens = updatedMessages.reduce((total, msg) => {
						return total + Math.ceil((msg.content?.length || 0) / 4);
					}, 0);
					const totalTokensUsed = systemTokens + conversationTokens + tokenCount;
					
					setThinkingStats({
						tokenCount,
						elapsedSeconds,
						contextSize: client.getContextSize(),
						totalTokensUsed,
					});
				}
			}

			clearInterval(timerInterval);

			if (!hasContent) {
				throw new Error('No response received from model');
			}

			// Display the assistant response
			if (fullContent) {
				addToChatQueue(
					<AssistantMessage 
						key={`assistant-${Date.now()}`}
						message={fullContent}
						model={currentModel}
					/>
				);
			}

			// Add assistant message to conversation history
			const assistantMsg: Message = { 
				role: 'assistant', 
				content: fullContent,
				tool_calls: toolCalls 
			};
			setMessages([...updatedMessages, assistantMsg]);

			// Handle tool calls if present
			if (toolCalls && toolCalls.length > 0) {
				// For now, just show placeholder for tool calls
				addToChatQueue(
					<InfoMessage
						key={`tools-placeholder-${Date.now()}`}
						message={`Tool calls detected: ${toolCalls.length} tool(s) - execution placeholder`}
						hideBox={true}
					/>
				);
			}
			
		} catch (error) {
			clearInterval(timerInterval);
			addToChatQueue(
				<ErrorMessage 
					key={`error-${Date.now()}`}
					message={`Chat error: ${error}`}
				/>
			);
		} finally {
			setIsThinking(false);
		}
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
				<SuccessMessage
					key="preferences-loaded"
					message="User preferences loaded..."
					hideBox={true}
				/>,
			);

			// Set up the tool registry getter for the message handler
			setToolRegistryGetter(() => newToolManager.getToolRegistry());

			// Set up the tool manager getter for commands that need it
			setToolManagerGetter(() => newToolManager);

			commandRegistry.register([
				helpCommand,
				exitCommand,
				clearCommand,
				modelCommand,
				providerCommand,
				commandsCommand,
				debugCommand,
				mcpCommand,
			]);

			// Now start with the properly initialized objects (excluding MCP)
			await start(newToolManager, newCustomCommandLoader, preferences);
			setStartChat(true);

			// Initialize MCP servers after UI is shown
			await initializeMCPServers(newToolManager);
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
				const result = await commandRegistry.execute(message.slice(1)); // Remove the leading '/'
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
			// Regular chat message - process with AI
			await handleChatMessage(message);
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
			// Add connecting message to chat queue
			addToChatQueue(
				<InfoMessage
					key={`mcp-connecting-${Date.now()}`}
					message={`Connecting to ${appConfig.mcpServers.length} MCP server${
						appConfig.mcpServers.length > 1 ? 's' : ''
					}...`}
					hideBox={true}
				/>,
			);

			// Define progress callback to show live updates
			const onProgress = (result: MCPInitResult) => {
				if (result.success) {
					addToChatQueue(
						<SuccessMessage
							key={`mcp-success-${result.serverName}-${Date.now()}`}
							message={`Connected to MCP server "${result.serverName}" with ${result.toolCount} tools`}
							hideBox={true}
						/>,
					);
				} else {
					addToChatQueue(
						<ErrorMessage
							key={`mcp-error-${result.serverName}-${Date.now()}`}
							message={`Failed to connect to MCP server "${result.serverName}": ${result.error}`}
							hideBox={true}
						/>,
					);
				}
			};

			try {
				await toolManager.initializeMCP(appConfig.mcpServers, onProgress);
			} catch (error) {
				addToChatQueue(
					<ErrorMessage
						key={`mcp-fatal-error-${Date.now()}`}
						message={`Failed to initialize MCP servers: ${error}`}
						hideBox={true}
					/>,
				);
			}
			// Mark MCP as initialized whether successful or not
			setMcpInitialized(true);
		} else {
			// No MCP servers configured, mark as initialized immediately
			setMcpInitialized(true);
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
					{isThinking && (
						<ThinkingIndicator 
							tokenCount={thinkingStats.tokenCount}
							elapsedSeconds={thinkingStats.elapsedSeconds}
							contextSize={thinkingStats.contextSize}
							totalTokensUsed={thinkingStats.totalTokensUsed}
						/>
					)}
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
					) : mcpInitialized ? (
						<UserInput
							customCommands={Array.from(customCommandCache.keys())}
							onSubmit={handleMessageSubmit}
						/>
					) : (
						<Text color={colors.secondary}>
							<Spinner type="dots2" /> Loading...
						</Text>
					)}
				</>
			)}
		</Box>
	);
}
