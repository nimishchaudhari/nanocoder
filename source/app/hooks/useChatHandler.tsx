import {LLMClient, Message} from '../../types/core.js';
import {ToolManager} from '../../tools/tool-manager.js';
import {readFileSync, existsSync} from 'fs';
import {promptPath} from '../../config/index.js';
import {
	parseToolCallsFromContent,
	cleanContentFromToolCalls,
} from '../../tool-calling/index.js';
import UserMessage from '../../components/user-message.js';
import AssistantMessage from '../../components/assistant-message.js';
import ErrorMessage from '../../components/error-message.js';
import {ThinkingStats} from './useAppState.js';
import React from 'react';

// Helper function to filter out invalid tool calls and deduplicate by ID and function
const filterValidToolCalls = (toolCalls: any[]): any[] => {
	const seenIds = new Set<string>();
	const seenFunctionCalls = new Set<string>();

	return toolCalls.filter(toolCall => {
		// Filter out completely empty tool calls
		if (!toolCall.id || !toolCall.function?.name) {
			return false;
		}

		// Filter out tool calls with empty names
		if (toolCall.function.name.trim() === '') {
			return false;
		}

		// Filter out tool calls for tools that don't exist

		// Filter out duplicate tool call IDs (GPT-5 issue)
		if (seenIds.has(toolCall.id)) {
			return false;
		}

		// Filter out functionally identical tool calls (same tool + args)
		const functionSignature = `${toolCall.function.name}:${JSON.stringify(
			toolCall.function.arguments,
		)}`;
		if (seenFunctionCalls.has(functionSignature)) {
			return false;
		}

		seenIds.add(toolCall.id);
		seenFunctionCalls.add(functionSignature);
		return true;
	});
};

interface UseChatHandlerProps {
	client: LLMClient | null;
	toolManager: ToolManager | null;
	messages: Message[];
	setMessages: (messages: Message[]) => void;
	currentModel: string;
	setIsThinking: (thinking: boolean) => void;
	setIsCancelling: (cancelling: boolean) => void;
	setThinkingStats: (
		stats: ThinkingStats | ((prev: ThinkingStats) => ThinkingStats),
	) => void;
	addToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	abortController: AbortController | null;
	setAbortController: (controller: AbortController | null) => void;
	onStartToolConfirmationFlow: (
		toolCalls: any[],
		updatedMessages: Message[],
		assistantMsg: Message,
		systemMessage: Message,
	) => void;
}

export function useChatHandler({
	client,
	toolManager,
	messages,
	setMessages,
	currentModel,
	setIsThinking,
	setIsCancelling,
	setThinkingStats,
	addToChatQueue,
	componentKeyCounter,
	abortController,
	setAbortController,
	onStartToolConfirmationFlow,
}: UseChatHandlerProps) {
	// Throttle thinking stats updates to reduce re-renders
	const throttledSetThinkingStats = React.useCallback(
		(() => {
			let lastUpdate = 0;
			const throttleMs = 250; // Update at most 4 times per second

			return (
				stats: ThinkingStats | ((prev: ThinkingStats) => ThinkingStats),
			) => {
				const now = Date.now();
				if (now - lastUpdate >= throttleMs) {
					lastUpdate = now;
					setThinkingStats(stats);
				}
			};
		})(),
		[setThinkingStats],
	);

	// Helper to make async iterator cancellable with frequent abort checking
	const makeCancellableStream = async function* (
		stream: AsyncIterable<any>,
		abortSignal?: AbortSignal,
	): AsyncIterable<any> {
		const iterator = stream[Symbol.asyncIterator]();
		try {
			while (true) {
				if (abortSignal?.aborted) {
					throw new Error('Operation was cancelled');
				}

				// Use Promise.race to make iterator.next() cancellable with frequent checking
				const nextPromise = iterator.next();
				const timeoutPromise = new Promise(resolve => {
					const checkInterval = setInterval(() => {
						if (abortSignal?.aborted) {
							clearInterval(checkInterval);
							resolve({done: false, cancelled: true});
						}
					}, 100); // Check every 100ms

					// Clear interval when next() completes
					nextPromise.finally(() => clearInterval(checkInterval));
				});

				const result = (await Promise.race([
					nextPromise,
					timeoutPromise,
				])) as any;

				if (result.cancelled || abortSignal?.aborted) {
					throw new Error('Operation was cancelled');
				}

				if (result.done) break;

				yield result.value;
			}
		} finally {
			if (iterator.return) {
				await iterator.return();
			}
		}
	};

	// Process assistant response with token tracking (for initial user messages)
	const processAssistantResponseWithTokenTracking = async (
		systemMessage: Message,
		messages: Message[],
		controller: AbortController,
	) => {
		if (!client) return;

		const stream = client.chatStream(
			[systemMessage, ...messages],
			toolManager?.getAllTools() || [],
		);

		let toolCalls: any = null;
		let fullContent = '';
		let tokenCount = 0;
		let hasContent = false;

		// Process streaming response with cancellation support
		const cancellableStream = makeCancellableStream(stream, controller.signal);
		for await (const chunk of cancellableStream) {
			hasContent = true;

			if (chunk.message?.content) {
				fullContent += chunk.message.content;
				tokenCount = Math.ceil(fullContent.length / 4);
			}

			// If server provides eval_count, use it as it's more accurate
			// But ensure we don't reset to a lower count if content tokens are higher
			if (chunk.eval_count) {
				tokenCount = Math.max(tokenCount, chunk.eval_count);
			}

			if (chunk.message?.tool_calls) {
				toolCalls = chunk.message.tool_calls;
			}

			// Update thinking stats in real-time
			if (!chunk.done) {
				const systemTokens = Math.ceil(300 / 4);
				const conversationTokens = messages.reduce((total, msg) => {
					return total + Math.ceil((msg.content?.length || 0) / 4);
				}, 0);
				const totalTokensUsed = systemTokens + conversationTokens + tokenCount;

				throttledSetThinkingStats({
					tokenCount,
					contextSize: client.getContextSize(),
					totalTokensUsed,
					tokensPerSecond: chunk.tokens_per_second,
				});
			}
		}

		if (!hasContent) {
			throw new Error('No response received from model');
		}

		// Parse any tool calls from the content itself
		const parsedToolCalls = parseToolCallsFromContent(fullContent);
		const cleanedContent = cleanContentFromToolCalls(
			fullContent,
			parsedToolCalls,
		);

		// Display the assistant response (cleaned of any tool calls)
		if (cleanedContent.trim()) {
			addToChatQueue(
				<AssistantMessage
					key={`assistant-${componentKeyCounter}`}
					message={cleanedContent}
					model={currentModel}
				/>,
			);
		}

		// Merge structured tool calls with content-parsed tool calls
		const allToolCalls = [...(toolCalls || []), ...parsedToolCalls];

		// Filter out invalid tool calls
		const validToolCalls = allToolCalls;

		// Add assistant message to conversation history
		const assistantMsg: Message = {
			role: 'assistant',
			content: cleanedContent,
			tool_calls: validToolCalls.length > 0 ? validToolCalls : undefined,
		};
		setMessages([...messages, assistantMsg]);

		// Handle tool calls if present - this continues the loop
		if (validToolCalls && validToolCalls.length > 0) {
			// Start tool confirmation flow
			onStartToolConfirmationFlow(
				validToolCalls,
				messages,
				assistantMsg,
				systemMessage,
			);
		}
	};

	// Process assistant response - handles the conversation loop with potential tool calls (for follow-ups)
	const processAssistantResponse = async (
		systemMessage: Message,
		messages: Message[],
	) => {
		if (!client) return;

		// Ensure we have an abort controller for this request
		let controller = abortController;
		if (!controller) {
			controller = new AbortController();
			setAbortController(controller);
		}

		try {
			setIsThinking(true);

			const stream = client.chatStream(
				[systemMessage, ...messages],
				toolManager?.getAllTools() || [],
			);

			let toolCalls: any = null;
			let fullContent = '';
			let hasContent = false;
			let tokenCount = 0;

			// Process streaming response with progress updates and cancellation support
			const cancellableStream = makeCancellableStream(
				stream,
				controller.signal,
			);
			for await (const chunk of cancellableStream) {
				hasContent = true;

				if (chunk.message?.content) {
					fullContent += chunk.message.content;
					tokenCount = Math.ceil(fullContent.length / 4);
				}

				// If server provides eval_count, use it as it's more accurate
				// But ensure we don't reset to a lower count if content tokens are higher
				if (chunk.eval_count) {
					tokenCount = Math.max(tokenCount, chunk.eval_count);
				}

				if (chunk.message?.tool_calls) {
					toolCalls = chunk.message.tool_calls;
				}

				// Update thinking stats in real-time (similar to initial response)
				if (!chunk.done) {
					const systemTokens = Math.ceil(300 / 4);
					const conversationTokens = messages.reduce((total, msg) => {
						return total + Math.ceil((msg.content?.length || 0) / 4);
					}, 0);
					const totalTokensUsed =
						systemTokens + conversationTokens + tokenCount;

					throttledSetThinkingStats({
						tokenCount,
						contextSize: client.getContextSize(),
						totalTokensUsed,
						tokensPerSecond: chunk.tokens_per_second,
					});
				}
			}

			if (!hasContent) {
				throw new Error('No response received from model');
			}

			// Parse any tool calls from the content itself
			const parsedToolCalls = parseToolCallsFromContent(fullContent);
			const cleanedContent = cleanContentFromToolCalls(
				fullContent,
				parsedToolCalls,
			);

			// Display the assistant response (cleaned of any tool calls)
			if (cleanedContent.trim()) {
				addToChatQueue(
					<AssistantMessage
						key={`assistant-${componentKeyCounter}`}
						message={cleanedContent}
						model={currentModel}
					/>,
				);
			}

			// Merge structured tool calls with content-parsed tool calls
			const allToolCalls = [...(toolCalls || []), ...parsedToolCalls];

			// Filter out invalid tool calls
			const validToolCalls = filterValidToolCalls(allToolCalls);

			// Add assistant message to conversation history
			const assistantMsg: Message = {
				role: 'assistant',
				content: cleanedContent,
				tool_calls: validToolCalls.length > 0 ? validToolCalls : undefined,
			};
			setMessages([...messages, assistantMsg]);

			// Handle tool calls if present - this continues the loop
			if (validToolCalls && validToolCalls.length > 0) {
				// Start tool confirmation flow
				onStartToolConfirmationFlow(
					validToolCalls,
					messages,
					assistantMsg,
					systemMessage,
				);
			}
			// If no tool calls, the conversation naturally ends here
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Operation was cancelled'
			) {
				addToChatQueue(
					<ErrorMessage
						key={`cancelled-${componentKeyCounter}`}
						message="Operation was cancelled by user"
						hideBox={true}
					/>,
				);
			} else {
				addToChatQueue(
					<ErrorMessage
						key={`error-${componentKeyCounter}`}
						message={`Conversation error: ${error}`}
					/>,
				);
			}
		} finally {
			setIsThinking(false);
			setIsCancelling(false);
			setAbortController(null);
		}
	};

	// Handle chat message processing
	const handleChatMessage = async (message: string) => {
		if (!client || !toolManager) return;

		// Add user message to chat
		addToChatQueue(
			<UserMessage key={`user-${componentKeyCounter}`} message={message} />,
		);

		// Add user message to conversation history
		const userMessage: Message = {role: 'user', content: message};
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);

		// Create abort controller for cancellation
		const controller = new AbortController();
		setAbortController(controller);

		// Start thinking indicator and streaming
		setIsThinking(true);

		// Reset per-message stats
		setThinkingStats({
			tokenCount: 0,
			contextSize: client.getContextSize(),
			totalTokensUsed: 0, // Start fresh, will be calculated properly in the interval
		});

		try {
			// Load system prompt from prompt.md file
			let systemPrompt = 'You are a helpful AI assistant.'; // fallback
			if (existsSync(promptPath)) {
				try {
					systemPrompt = readFileSync(promptPath, 'utf-8');
				} catch (error) {
					console.warn(
						`Failed to load system prompt from ${promptPath}: ${error}`,
					);
				}
			}

			// Create stream request
			const systemMessage: Message = {
				role: 'system',
				content: systemPrompt,
			};

			// Use the new conversation loop
			await processAssistantResponseWithTokenTracking(
				systemMessage,
				updatedMessages,
				controller,
			);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Operation was cancelled'
			) {
				addToChatQueue(
					<ErrorMessage
						key={`cancelled-${componentKeyCounter}`}
						message="Operation was cancelled by user"
						hideBox={true}
					/>,
				);
			} else {
				addToChatQueue(
					<ErrorMessage
						key={`error-${componentKeyCounter}`}
						message={`Chat error: ${error}`}
					/>,
				);
			}
		} finally {
			setIsThinking(false);
			setIsCancelling(false);
			setAbortController(null);
		}
	};

	return {
		handleChatMessage,
		processAssistantResponse,
	};
}
