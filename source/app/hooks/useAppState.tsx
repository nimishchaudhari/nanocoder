import {useState, useCallback} from 'react';
import {LLMClient, Message, ProviderType} from '../../types/core.js';
import {ToolManager} from '../../tools/tool-manager.js';
import {CustomCommandLoader} from '../../custom-commands/loader.js';
import {CustomCommandExecutor} from '../../custom-commands/executor.js';
import React from 'react';

export interface ThinkingStats {
	tokenCount: number;
	contextSize: number;
	totalTokensUsed: number;
	tokensPerSecond?: number;
}

export interface ConversationContext {
	updatedMessages: Message[];
	assistantMsg: Message;
	systemMessage: Message;
}

export function useAppState() {
	const [client, setClient] = useState<LLMClient | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [currentModel, setCurrentModel] = useState<string>('');
	const [currentProvider, setCurrentProvider] = useState<ProviderType>('ollama');
	const [toolManager, setToolManager] = useState<ToolManager | null>(null);
	const [customCommandLoader, setCustomCommandLoader] = useState<CustomCommandLoader | null>(null);
	const [customCommandExecutor, setCustomCommandExecutor] = useState<CustomCommandExecutor | null>(null);
	const [customCommandCache, setCustomCommandCache] = useState<Map<string, any>>(new Map());
	const [startChat, setStartChat] = useState<boolean>(false);
	const [mcpInitialized, setMcpInitialized] = useState<boolean>(false);

	// Thinking indicator state
	const [isThinking, setIsThinking] = useState<boolean>(false);
	const [isCancelling, setIsCancelling] = useState<boolean>(false);
	const [thinkingStats, setThinkingStats] = useState<ThinkingStats>({
		tokenCount: 0,
		contextSize: 0,
		totalTokensUsed: 0,
	});

	// Cancellation state
	const [abortController, setAbortController] = useState<AbortController | null>(null);

	// Mode states
	const [isModelSelectionMode, setIsModelSelectionMode] = useState<boolean>(false);
	const [isProviderSelectionMode, setIsProviderSelectionMode] = useState<boolean>(false);
	const [isToolConfirmationMode, setIsToolConfirmationMode] = useState<boolean>(false);
	const [isToolExecuting, setIsToolExecuting] = useState<boolean>(false);
	const [isBashExecuting, setIsBashExecuting] = useState<boolean>(false);
	const [currentBashCommand, setCurrentBashCommand] = useState<string>('');

	// Tool confirmation state
	const [pendingToolCalls, setPendingToolCalls] = useState<any[]>([]);
	const [currentToolIndex, setCurrentToolIndex] = useState<number>(0);
	const [completedToolResults, setCompletedToolResults] = useState<any[]>([]);
	const [currentConversationContext, setCurrentConversationContext] = useState<ConversationContext | null>(null);

	// Chat queue for components
	const [chatComponents, setChatComponents] = useState<React.ReactNode[]>([]);
	const [componentKeyCounter, setComponentKeyCounter] = useState(0);

	// Helper function to add components to the chat queue with stable keys
	const addToChatQueue = useCallback((component: React.ReactNode) => {
		const newCounter = componentKeyCounter + 1;
		setComponentKeyCounter(newCounter);

		let componentWithKey = component;
		if (React.isValidElement(component) && !component.key) {
			componentWithKey = React.cloneElement(component, {
				key: `chat-component-${newCounter}`
			});
		}

		setChatComponents(prevComponents => [...prevComponents, componentWithKey]);
	}, [componentKeyCounter]);

	// Reset tool confirmation state
	const resetToolConfirmationState = () => {
		setIsToolConfirmationMode(false);
		setIsToolExecuting(false);
		setPendingToolCalls([]);
		setCurrentToolIndex(0);
		setCompletedToolResults([]);
		setCurrentConversationContext(null);
	};

	return {
		// State
		client,
		messages,
		currentModel,
		currentProvider,
		toolManager,
		customCommandLoader,
		customCommandExecutor,
		customCommandCache,
		startChat,
		mcpInitialized,
		isThinking,
		isCancelling,
		thinkingStats,
		abortController,
		isModelSelectionMode,
		isProviderSelectionMode,
		isToolConfirmationMode,
		isToolExecuting,
		isBashExecuting,
		currentBashCommand,
		pendingToolCalls,
		currentToolIndex,
		completedToolResults,
		currentConversationContext,
		chatComponents,
		componentKeyCounter,

		// Setters
		setClient,
		setMessages,
		setCurrentModel,
		setCurrentProvider,
		setToolManager,
		setCustomCommandLoader,
		setCustomCommandExecutor,
		setCustomCommandCache,
		setStartChat,
		setMcpInitialized,
		setIsThinking,
		setIsCancelling,
		setThinkingStats,
		setAbortController,
		setIsModelSelectionMode,
		setIsProviderSelectionMode,
		setIsToolConfirmationMode,
		setIsToolExecuting,
		setIsBashExecuting,
		setCurrentBashCommand,
		setPendingToolCalls,
		setCurrentToolIndex,
		setCompletedToolResults,
		setCurrentConversationContext,
		setChatComponents,
		setComponentKeyCounter,

		// Utilities
		addToChatQueue,
		resetToolConfirmationState,
	};
}