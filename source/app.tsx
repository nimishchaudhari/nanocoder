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
	getToolManager,
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
import ToolMessage from './components/tool-message.js';
import ToolConfirmation from './components/tool-confirmation.js';
import Spinner from 'ink-spinner';
import {
	parseToolCallsFromContent,
	cleanContentFromToolCalls,
} from './tool-calling/index.js';
import {processToolUse} from './message-handler.js';

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

	// Tool confirmation mode
	const [isToolConfirmationMode, setIsToolConfirmationMode] =
		useState<boolean>(false);
	const [pendingToolCalls, setPendingToolCalls] = useState<any[]>([]);
	const [currentToolIndex, setCurrentToolIndex] = useState<number>(0);
	const [completedToolResults, setCompletedToolResults] = useState<any[]>([]);
	const [currentConversationContext, setCurrentConversationContext] = useState<{
		updatedMessages: Message[];
		assistantMsg: Message;
		systemMessage: Message;
	} | null>(null);

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

				// Clear message history when switching providers
				setMessages([]);
				await newClient.clearContext();

				// Update preferences - use the actualProvider (which is what was successfully created)
				updateLastUsed(actualProvider, newModel);

				// Add success message to chat queue
				addToChatQueue(
					<SuccessMessage
						key={`provider-changed-${Date.now()}`}
						message={`Provider changed to: ${actualProvider}, model: ${newModel}. Chat history cleared.`}
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

	// Handle tool confirmation
	const handleToolConfirmation = async (confirmed: boolean) => {
		if (!confirmed) {
			// User cancelled - show message and reset state
			addToChatQueue(
				<InfoMessage
					key={`tool-cancelled-${Date.now()}`}
					message="Tool execution cancelled by user"
					hideBox={true}
				/>,
			);
			resetToolConfirmationState();
			return;
		}

		// Execute the current tool
		const currentTool = pendingToolCalls[currentToolIndex];
		try {
			const result = await processToolUse(currentTool);
			
			const newResults = [...completedToolResults, result];
			setCompletedToolResults(newResults);

			// Display the tool result
			await displayToolResult(currentTool, result);

			// Move to next tool or complete the process
			if (currentToolIndex + 1 < pendingToolCalls.length) {
				setCurrentToolIndex(currentToolIndex + 1);
			} else {
				// All tools executed, continue conversation loop with the updated results
				await continueConversationWithToolResults(newResults);
			}
		} catch (error) {
			addToChatQueue(
				<ErrorMessage
					key={`tool-exec-error-${Date.now()}`}
					message={`Tool execution error: ${error}`}
				/>,
			);
			resetToolConfirmationState();
		}
	};

	// Handle tool confirmation cancel
	const handleToolConfirmationCancel = () => {
		addToChatQueue(
			<InfoMessage
				key={`tool-cancelled-${Date.now()}`}
				message="Tool execution cancelled by user"
				hideBox={true}
			/>,
		);
		resetToolConfirmationState();
	};

	// Reset tool confirmation state
	const resetToolConfirmationState = () => {
		setIsToolConfirmationMode(false);
		setPendingToolCalls([]);
		setCurrentToolIndex(0);
		setCompletedToolResults([]);
		setCurrentConversationContext(null);
	};

	// Display tool result with proper formatting
	const displayToolResult = async (toolCall: any, result: any) => {
		const toolManager = getToolManager();
		if (toolManager) {
			const formatter = toolManager.getToolFormatter(result.name);
			if (formatter) {
				try {
					const formattedResult = await formatter(toolCall.function.arguments);

					if (React.isValidElement(formattedResult)) {
						addToChatQueue(
							React.cloneElement(formattedResult, {
								key: `tool-result-${result.tool_call_id}-${Date.now()}`,
							}),
						);
					} else {
						addToChatQueue(
							<ToolMessage
								key={`tool-result-${result.tool_call_id}-${Date.now()}`}
								title={`⚒ ${result.name}`}
								message={String(formattedResult)}
								hideBox={true}
							/>,
						);
					}
				} catch (formatterError) {
					// If formatter fails, show raw result
					addToChatQueue(
						<ToolMessage
							key={`tool-result-${result.tool_call_id}-${Date.now()}`}
							title={`⚒ ${result.name}`}
							message={result.content}
							hideBox={true}
						/>,
					);
				}
			} else {
				// No formatter, show raw result
				addToChatQueue(
					<ToolMessage
						key={`tool-result-${result.tool_call_id}-${Date.now()}`}
						title={`⚒ ${result.name}`}
						message={result.content}
						hideBox={true}
					/>,
				);
			}
		}
	};

	// Continue conversation with tool results - maintains the proper loop
	const continueConversationWithToolResults = async (toolResults?: any[]) => {
		if (!currentConversationContext || !client) {
			resetToolConfirmationState();
			return;
		}

		// Use passed results or fallback to state (for backwards compatibility)
		const resultsToUse = toolResults || completedToolResults;

		const {updatedMessages, assistantMsg, systemMessage} =
			currentConversationContext;

		// Add tool results to conversation history
		const toolMessages: Message[] = resultsToUse.map(result => ({
			role: 'tool' as const,
			content: result.content,
			tool_call_id: result.tool_call_id,
			name: result.name,
		}));

		// Update conversation history with tool results
		const updatedMessagesWithTools = [
			...updatedMessages,
			assistantMsg,
			...toolMessages,
		];
		setMessages(updatedMessagesWithTools);

		// Reset tool confirmation state since we're continuing the conversation
		resetToolConfirmationState();

		// Continue the main conversation loop with tool results as context
		await processAssistantResponse(systemMessage, updatedMessagesWithTools);
	};

	// Process assistant response with token tracking (for initial user messages)
	const processAssistantResponseWithTokenTracking = async (
		systemMessage: Message, 
		messages: Message[], 
		timerInterval: NodeJS.Timeout,
		startTime: number
	) => {
		if (!client) return;

		const stream = await client.chatStream(
			[systemMessage, ...messages],
			toolManager?.getAllTools() || [],
		);

		let toolCalls: any = null;
		let fullContent = '';
		let tokenCount = 0;
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
				const conversationTokens = messages.reduce((total, msg) => {
					return total + Math.ceil((msg.content?.length || 0) / 4);
				}, 0);
				const totalTokensUsed =
					systemTokens + conversationTokens + tokenCount;

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

		// Parse any tool calls from the content itself
		const parsedToolCalls = parseToolCallsFromContent(fullContent);
		const cleanedContent = cleanContentFromToolCalls(fullContent, parsedToolCalls);

		// Display the assistant response (cleaned of any tool calls)
		if (cleanedContent.trim()) {
			addToChatQueue(
				<AssistantMessage
					key={`assistant-${Date.now()}`}
					message={cleanedContent}
					model={currentModel}
				/>,
			);
		}

		// Merge structured tool calls with content-parsed tool calls
		const allToolCalls = [...(toolCalls || []), ...parsedToolCalls];

		// Add assistant message to conversation history
		const assistantMsg: Message = {
			role: 'assistant',
			content: cleanedContent,
			tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined,
		};
		setMessages([...messages, assistantMsg]);

		// Handle tool calls if present - this continues the loop
		if (allToolCalls && allToolCalls.length > 0) {
			// Start tool confirmation flow
			startToolConfirmationFlow(allToolCalls, messages, assistantMsg, systemMessage);
		}
	};

	// Process assistant response - handles the conversation loop with potential tool calls (for follow-ups)
	const processAssistantResponse = async (systemMessage: Message, messages: Message[]) => {
		if (!client) return;

		try {
			setIsThinking(true);

			const stream = await client.chatStream(
				[systemMessage, ...messages],
				toolManager?.getAllTools() || [],
			);

			let toolCalls: any = null;
			let fullContent = '';
			let hasContent = false;

			// Process streaming response
			for await (const chunk of stream) {
				hasContent = true;
				
				if (chunk.message?.content) {
					fullContent += chunk.message.content;
				}

				if (chunk.message?.tool_calls) {
					toolCalls = chunk.message.tool_calls;
				}
			}

			if (!hasContent) {
				throw new Error('No response received from model');
			}

			// Parse any tool calls from the content itself
			const parsedToolCalls = parseToolCallsFromContent(fullContent);
			const cleanedContent = cleanContentFromToolCalls(fullContent, parsedToolCalls);

			// Display the assistant response (cleaned of any tool calls)
			if (cleanedContent.trim()) {
				addToChatQueue(
					<AssistantMessage
						key={`assistant-${Date.now()}`}
						message={cleanedContent}
						model={currentModel}
					/>,
				);
			}

			// Merge structured tool calls with content-parsed tool calls
			const allToolCalls = [...(toolCalls || []), ...parsedToolCalls];

			// Add assistant message to conversation history
			const assistantMsg: Message = {
				role: 'assistant',
				content: cleanedContent,
				tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined,
			};
			setMessages([...messages, assistantMsg]);

			// Handle tool calls if present - this continues the loop
			if (allToolCalls && allToolCalls.length > 0) {
				// Start tool confirmation flow
				startToolConfirmationFlow(allToolCalls, messages, assistantMsg, systemMessage);
			}
			// If no tool calls, the conversation naturally ends here
		} catch (error) {
			addToChatQueue(
				<ErrorMessage
					key={`error-${Date.now()}`}
					message={`Conversation error: ${error}`}
				/>,
			);
		} finally {
			setIsThinking(false);
		}
	};

	// Start tool confirmation flow
	const startToolConfirmationFlow = (
		toolCalls: any[],
		updatedMessages: Message[],
		assistantMsg: Message,
		systemMessage: Message,
	) => {
		setPendingToolCalls(toolCalls);
		setCurrentToolIndex(0);
		setCompletedToolResults([]);
		setCurrentConversationContext({
			updatedMessages,
			assistantMsg,
			systemMessage,
		});
		setIsToolConfirmationMode(true);
	};

	// Handle chat message processing
	const handleChatMessage = async (message: string) => {
		if (!client || !toolManager) return;

		// Add user message to chat
		addToChatQueue(
			<UserMessage key={`user-${Date.now()}`} message={message} />,
		);

		// Add user message to conversation history
		const userMessage: Message = {role: 'user', content: message};
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);

		// Start thinking indicator and streaming
		setIsThinking(true);

		// Reset per-message stats but keep context size
		const currentContextSize = client.getContextSize();
		setThinkingStats({
			tokenCount: 0,
			elapsedSeconds: 0,
			contextSize: currentContextSize,
			totalTokensUsed: currentContextSize, // Start with current context as baseline
		});

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

			// Use the new conversation loop
			await processAssistantResponseWithTokenTracking(systemMessage, updatedMessages, timerInterval, startTime);
		} catch (error) {
			clearInterval(timerInterval);
			addToChatQueue(
				<ErrorMessage
					key={`error-${Date.now()}`}
					message={`Chat error: ${error}`}
				/>,
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
				if (commandName === 'clear') {
					// Clear message history and client context
					setMessages([]);
					if (client) {
						await client.clearContext();
					}
					// Still show the clear command result
				} else if (commandName === 'model') {
					enterModelSelectionMode();
					return;
				} else if (commandName === 'provider') {
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
					) : isToolConfirmationMode && pendingToolCalls[currentToolIndex] ? (
						<ToolConfirmation
							toolCall={pendingToolCalls[currentToolIndex]}
							onConfirm={handleToolConfirmation}
							onCancel={handleToolConfirmationCancel}
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
