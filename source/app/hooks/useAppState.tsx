import {useState, useCallback} from 'react';
import {LLMClient, Message, ProviderType} from '../../types/core.js';
import {ToolManager} from '../../tools/tool-manager.js';
import {CustomCommandLoader} from '../../custom-commands/loader.js';
import {CustomCommandExecutor} from '../../custom-commands/executor.js';
import {loadPreferences} from '../../config/preferences.js';
import {defaultTheme} from '../../config/themes.js';
import type {ThemePreset} from '../../types/ui.js';
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
	// Initialize theme from preferences
	const preferences = loadPreferences();
	const initialTheme = preferences.selectedTheme || defaultTheme;
	
	const [client, setClient] = useState<LLMClient | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
	const [messageTokenCache, setMessageTokenCache] = useState<Map<string, number>>(new Map());
	const [currentModel, setCurrentModel] = useState<string>('');
	const [currentProvider, setCurrentProvider] = useState<ProviderType>('openai-compatible');
	const [currentTheme, setCurrentTheme] = useState<ThemePreset>(initialTheme);
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
	const [isThemeSelectionMode, setIsThemeSelectionMode] = useState<boolean>(false);
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

	// Helper function to add components to the chat queue with stable keys and memory optimization
	const addToChatQueue = useCallback((component: React.ReactNode) => {
		const newCounter = componentKeyCounter + 1;
		setComponentKeyCounter(newCounter);

		let componentWithKey = component;
		if (React.isValidElement(component) && !component.key) {
			componentWithKey = React.cloneElement(component, {
				key: `chat-component-${newCounter}`
			});
		}

		setChatComponents(prevComponents => {
			const newComponents = [...prevComponents, componentWithKey];
			// Keep reasonable limit in memory for performance
			return newComponents.length > 50 ? newComponents.slice(-50) : newComponents;
		});
	}, [componentKeyCounter]);

	// Helper function for token calculation with caching
	const getMessageTokens = useCallback((message: Message) => {
		const cacheKey = (message.content || '') + message.role;
		
		if (messageTokenCache.has(cacheKey)) {
			return messageTokenCache.get(cacheKey)!;
		}
		
		const tokens = Math.ceil((message.content?.length || 0) / 4);
		setMessageTokenCache(prev => new Map(prev).set(cacheKey, tokens));
		return tokens;
	}, [messageTokenCache]);

	// Optimized message updater that separates display from context
	const updateMessages = useCallback((newMessages: Message[]) => {
		setMessages(newMessages); // Full context always preserved for model
		
		// Limit display messages for UI performance only
		const displayLimit = 30;
		setDisplayMessages(
			newMessages.length > displayLimit 
				? newMessages.slice(-displayLimit)
				: newMessages
		);
	}, []);

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
		displayMessages,
		messageTokenCache,
		currentModel,
		currentProvider,
		currentTheme,
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
		isThemeSelectionMode,
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
		setDisplayMessages,
		setMessageTokenCache,
		setCurrentModel,
		setCurrentProvider,
		setCurrentTheme,
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
		setIsThemeSelectionMode,
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
		getMessageTokens,
		updateMessages,
		resetToolConfirmationState,
	};
}