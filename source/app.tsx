import {Box, Text} from 'ink';
import WelcomeMessage from './components/welcome-message.js';
import React from 'react';
import {colors} from './config/index.js';
import UserInput from './components/user-input.js';
import Status from './components/status.js';
import ChatQueue from './components/chat-queue.js';
import ModelSelector from './components/model-selector.js';
import ProviderSelector from './components/provider-selector.js';
import ThinkingIndicator from './components/thinking-indicator.js';
import CancellingIndicator from './components/cancelling-indicator.js';
import ToolConfirmation from './components/tool-confirmation.js';
import {setGlobalMessageQueue} from './utils/message-queue.js';
import Spinner from 'ink-spinner';

// Import extracted hooks and utilities
import {useAppState} from './app/hooks/useAppState.js';
import {useChatHandler} from './app/hooks/useChatHandler.js';
import {useToolHandler} from './app/hooks/useToolHandler.js';
import {useModeHandlers} from './app/hooks/useModeHandlers.js';
import {useAppInitialization} from './app/hooks/useAppInitialization.js';
import {handleMessageSubmission, createClearMessagesHandler} from './app/utils/appUtils.js';

export default function App() {
	// Use extracted hooks
	const appState = useAppState();
	
	// Initialize global message queue on component mount
	React.useEffect(() => {
		setGlobalMessageQueue(appState.addToChatQueue);
	}, []);

	// Setup chat handler
	const chatHandler = useChatHandler({
		client: appState.client,
		toolManager: appState.toolManager,
		messages: appState.messages,
		setMessages: appState.setMessages,
		currentModel: appState.currentModel,
		setIsThinking: appState.setIsThinking,
		setIsCancelling: appState.setIsCancelling,
		setThinkingStats: appState.setThinkingStats,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		abortController: appState.abortController,
		setAbortController: appState.setAbortController,
		onStartToolConfirmationFlow: (toolCalls, updatedMessages, assistantMsg, systemMessage) => {
			appState.setPendingToolCalls(toolCalls);
			appState.setCurrentToolIndex(0);
			appState.setCompletedToolResults([]);
			appState.setCurrentConversationContext({
				updatedMessages,
				assistantMsg,
				systemMessage,
			});
			appState.setIsToolConfirmationMode(true);
		},
	});

	// Setup tool handler
	const toolHandler = useToolHandler({
		pendingToolCalls: appState.pendingToolCalls,
		currentToolIndex: appState.currentToolIndex,
		completedToolResults: appState.completedToolResults,
		currentConversationContext: appState.currentConversationContext,
		setPendingToolCalls: appState.setPendingToolCalls,
		setCurrentToolIndex: appState.setCurrentToolIndex,
		setCompletedToolResults: appState.setCompletedToolResults,
		setCurrentConversationContext: appState.setCurrentConversationContext,
		setIsToolConfirmationMode: appState.setIsToolConfirmationMode,
		setMessages: appState.setMessages,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		resetToolConfirmationState: appState.resetToolConfirmationState,
		onProcessAssistantResponse: chatHandler.processAssistantResponse,
	});

	// Setup mode handlers
	const modeHandlers = useModeHandlers({
		client: appState.client,
		currentModel: appState.currentModel,
		currentProvider: appState.currentProvider,
		setClient: appState.setClient,
		setCurrentModel: appState.setCurrentModel,
		setCurrentProvider: appState.setCurrentProvider,
		setMessages: appState.setMessages,
		setIsModelSelectionMode: appState.setIsModelSelectionMode,
		setIsProviderSelectionMode: appState.setIsProviderSelectionMode,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
	});

	// Setup initialization
	useAppInitialization({
		setClient: appState.setClient,
		setCurrentModel: appState.setCurrentModel,
		setCurrentProvider: appState.setCurrentProvider,
		setToolManager: appState.setToolManager,
		setCustomCommandLoader: appState.setCustomCommandLoader,
		setCustomCommandExecutor: appState.setCustomCommandExecutor,
		setCustomCommandCache: appState.setCustomCommandCache,
		setStartChat: appState.setStartChat,
		setMcpInitialized: appState.setMcpInitialized,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		customCommandCache: appState.customCommandCache,
	});

	// Create clear messages handler
	const clearMessages = createClearMessagesHandler(appState.setMessages, appState.client);
	
	// Handle cancellation
	const handleCancel = () => {
		if (appState.abortController) {
			appState.setIsCancelling(true);
			appState.abortController.abort();
		}
	};

	// Handle message submission
	const handleMessageSubmit = async (message: string) => {
		await handleMessageSubmission(message, {
			customCommandCache: appState.customCommandCache,
			customCommandLoader: appState.customCommandLoader,
			customCommandExecutor: appState.customCommandExecutor,
			onClearMessages: clearMessages,
			onEnterModelSelectionMode: modeHandlers.enterModelSelectionMode,
			onEnterProviderSelectionMode: modeHandlers.enterProviderSelectionMode,
			onHandleChatMessage: chatHandler.handleChatMessage,
			onAddToChatQueue: appState.addToChatQueue,
			componentKeyCounter: appState.componentKeyCounter,
		});
	};

	return (
		<Box flexDirection="column" padding={1} width="100%">
			<WelcomeMessage />

			{appState.startChat && (
				<>
					<ChatQueue
						staticComponents={[
							<Status
								key="status"
								provider={appState.currentProvider}
								model={appState.currentModel}
							/>,
						]}
						queuedComponents={appState.chatComponents}
					/>
					{appState.isCancelling ? (
						<CancellingIndicator />
					) : appState.isThinking ? (
						<ThinkingIndicator
							tokenCount={appState.thinkingStats.tokenCount}
							elapsedSeconds={appState.thinkingStats.elapsedSeconds}
							contextSize={appState.thinkingStats.contextSize}
							totalTokensUsed={appState.thinkingStats.totalTokensUsed}
						/>
					) : null}
					{appState.isModelSelectionMode ? (
						<ModelSelector
							client={appState.client}
							currentModel={appState.currentModel}
							onModelSelect={modeHandlers.handleModelSelect}
							onCancel={modeHandlers.handleModelSelectionCancel}
						/>
					) : appState.isProviderSelectionMode ? (
						<ProviderSelector
							currentProvider={appState.currentProvider}
							onProviderSelect={modeHandlers.handleProviderSelect}
							onCancel={modeHandlers.handleProviderSelectionCancel}
						/>
					) : appState.isToolConfirmationMode && appState.pendingToolCalls[appState.currentToolIndex] ? (
						<ToolConfirmation
							toolCall={appState.pendingToolCalls[appState.currentToolIndex]}
							onConfirm={toolHandler.handleToolConfirmation}
							onCancel={toolHandler.handleToolConfirmationCancel}
						/>
					) : appState.mcpInitialized && appState.client ? (
						<UserInput
							customCommands={Array.from(appState.customCommandCache.keys())}
							onSubmit={handleMessageSubmit}
							disabled={appState.isThinking}
							onCancel={handleCancel}
						/>
					) : appState.mcpInitialized && !appState.client ? (
						<Text color={colors.secondary}>
							⚠️ No LLM provider available. Chat is disabled. Please fix your provider configuration and restart.
						</Text>
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
