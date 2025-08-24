import {Message} from '../../types/core.js';
import {processToolUse, getToolManager} from '../../message-handler.js';
import {ConversationContext} from './useAppState.js';
import InfoMessage from '../../components/info-message.js';
import ErrorMessage from '../../components/error-message.js';
import ToolMessage from '../../components/tool-message.js';
import React from 'react';

interface UseToolHandlerProps {
	pendingToolCalls: any[];
	currentToolIndex: number;
	completedToolResults: any[];
	currentConversationContext: ConversationContext | null;
	setPendingToolCalls: (calls: any[]) => void;
	setCurrentToolIndex: (index: number) => void;
	setCompletedToolResults: (results: any[]) => void;
	setCurrentConversationContext: (context: ConversationContext | null) => void;
	setIsToolConfirmationMode: (mode: boolean) => void;
	setIsToolExecuting: (executing: boolean) => void;
	setMessages: (messages: Message[]) => void;
	addToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	resetToolConfirmationState: () => void;
	onProcessAssistantResponse: (systemMessage: Message, messages: Message[]) => Promise<void>;
}

export function useToolHandler({
	pendingToolCalls,
	currentToolIndex,
	completedToolResults,
	currentConversationContext,
	setPendingToolCalls,
	setCurrentToolIndex,
	setCompletedToolResults,
	setCurrentConversationContext,
	setIsToolConfirmationMode,
	setIsToolExecuting,
	setMessages,
	addToChatQueue,
	componentKeyCounter,
	resetToolConfirmationState,
	onProcessAssistantResponse,
}: UseToolHandlerProps) {

	// Display tool result with proper formatting
	const displayToolResult = async (toolCall: any, result: any) => {
		const toolManager = getToolManager();
		if (toolManager) {
			const formatter = toolManager.getToolFormatter(result.name);
			if (formatter) {
				try {
					const formattedResult = await formatter(toolCall.function.arguments, result.content);

					if (React.isValidElement(formattedResult)) {
						addToChatQueue(
							React.cloneElement(formattedResult, {
								key: `tool-result-${result.tool_call_id}-${componentKeyCounter}`,
							}),
						);
					} else {
						addToChatQueue(
							<ToolMessage
								key={`tool-result-${result.tool_call_id}-${componentKeyCounter}`}
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
							key={`tool-result-${result.tool_call_id}-${componentKeyCounter}`}
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
						key={`tool-result-${result.tool_call_id}-${componentKeyCounter}`}
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
		if (!currentConversationContext) {
			resetToolConfirmationState();
			return;
		}

		// Use passed results or fallback to state (for backwards compatibility)
		const resultsToUse = toolResults || completedToolResults;

		const {updatedMessages, assistantMsg, systemMessage} = currentConversationContext;

		// Add tool results to conversation history
		const toolMessages: Message[] = resultsToUse.map(result => ({
			role: 'tool' as const,
			content: result.content,
			tool_call_id: result.tool_call_id,
			name: result.name,
		}));

		// Update conversation history with tool results
		// Note: assistantMsg is already included in updatedMessages, just add tool results
		const updatedMessagesWithTools = [
			...updatedMessages,
			assistantMsg,
			...toolMessages,
		];
		setMessages(updatedMessagesWithTools);

		// Reset tool confirmation state since we're continuing the conversation
		resetToolConfirmationState();

		// Continue the main conversation loop with tool results as context
		await onProcessAssistantResponse(systemMessage, updatedMessagesWithTools);
	};

	// Handle tool confirmation
	const handleToolConfirmation = async (confirmed: boolean) => {
		if (!confirmed) {
			// User cancelled - show message and reset state
			addToChatQueue(
				<InfoMessage
					key={`tool-cancelled-${componentKeyCounter}`}
					message="Tool execution cancelled by user"
					hideBox={true}
				/>,
			);
			resetToolConfirmationState();
			return;
		}

		// Move to tool execution state - this allows UI to update immediately
		setIsToolConfirmationMode(false);
		setIsToolExecuting(true);

		// Execute tools asynchronously
		setImmediate(() => {
			executeCurrentTool();
		});
	};

	// Execute the current tool asynchronously
	const executeCurrentTool = async () => {
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
				// Continue with next tool
				setImmediate(() => {
					executeCurrentTool();
				});
			} else {
				// All tools executed, continue conversation loop with the updated results
				setIsToolExecuting(false);
				await continueConversationWithToolResults(newResults);
			}
		} catch (error) {
			setIsToolExecuting(false);
			addToChatQueue(
				<ErrorMessage
					key={`tool-exec-error-${componentKeyCounter}`}
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
				key={`tool-cancelled-${componentKeyCounter}`}
				message="Tool execution cancelled by user"
				hideBox={true}
			/>,
		);
		resetToolConfirmationState();
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

	return {
		handleToolConfirmation,
		handleToolConfirmationCancel,
		startToolConfirmationFlow,
		displayToolResult,
		continueConversationWithToolResults,
		executeCurrentTool,
	};
}