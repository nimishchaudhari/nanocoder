import {useEffect} from 'react';
import {LLMClient, Message} from '../../types/core.js';
import {ToolManager} from '../../tools/tool-manager.js';
import {readFileSync, existsSync} from 'fs';
import {promptPath} from '../../config/index.js';
import {parseToolCallsFromContent, cleanContentFromToolCalls} from '../../tool-calling/index.js';
import UserMessage from '../../components/user-message.js';
import AssistantMessage from '../../components/assistant-message.js';
import ErrorMessage from '../../components/error-message.js';
import {ThinkingStats} from './useAppState.js';
import React from 'react';

interface UseChatHandlerProps {
	client: LLMClient | null;
	toolManager: ToolManager | null;
	messages: Message[];
	setMessages: (messages: Message[]) => void;
	currentModel: string;
	setIsThinking: (thinking: boolean) => void;
	setThinkingStats: (stats: ThinkingStats | ((prev: ThinkingStats) => ThinkingStats)) => void;
	addToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
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
	setThinkingStats,
	addToChatQueue,
	componentKeyCounter,
	onStartToolConfirmationFlow,
}: UseChatHandlerProps) {

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
					key={`assistant-${componentKeyCounter}`}
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
			onStartToolConfirmationFlow(allToolCalls, messages, assistantMsg, systemMessage);
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
			let tokenCount = 0;
			const startTime = Date.now();

			// Process streaming response with progress updates
			for await (const chunk of stream) {
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
					const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
					const systemTokens = Math.ceil(300 / 4);
					const conversationTokens = messages.reduce((total, msg) => {
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
						key={`assistant-${componentKeyCounter}`}
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
				onStartToolConfirmationFlow(allToolCalls, messages, assistantMsg, systemMessage);
			}
			// If no tool calls, the conversation naturally ends here
		} catch (error) {
			addToChatQueue(
				<ErrorMessage
					key={`error-${componentKeyCounter}`}
					message={`Conversation error: ${error}`}
				/>,
			);
		} finally {
			setIsThinking(false);
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

		// Start thinking indicator and streaming
		setIsThinking(true);

		// Reset per-message stats
		setThinkingStats({
			tokenCount: 0,
			elapsedSeconds: 0,
			contextSize: client.getContextSize(),
			totalTokensUsed: 0, // Start fresh, will be calculated properly in the interval
		});

		const startTime = Date.now();
		let tokenCount = 0;

		// Setup timer for thinking indicator updates (optimized to reduce jitter)
		const timerInterval = setInterval(() => {
			const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
			const systemTokens = Math.ceil(300 / 4); // Approximate system prompt tokens
			const conversationTokens = updatedMessages.reduce((total, msg) => {
				return total + Math.ceil((msg.content?.length || 0) / 4);
			}, 0);
			const totalTokensUsed = systemTokens + conversationTokens + tokenCount;

			setThinkingStats(prevStats => {
				// Only update if values have meaningfully changed to reduce re-renders
				const newPercentage = client.getContextSize() > 0 ? 
					Math.round((totalTokensUsed / client.getContextSize()) * 100) : 0;
				const oldPercentage = prevStats.contextSize > 0 ? 
					Math.round((prevStats.totalTokensUsed / prevStats.contextSize) * 100) : 0;
				
				if (prevStats.tokenCount === tokenCount && 
				    prevStats.elapsedSeconds === elapsedSeconds &&
				    Math.abs(newPercentage - oldPercentage) < 1) {
					return prevStats; // No meaningful change, skip update
				}
				
				return {
					tokenCount,
					elapsedSeconds,
					contextSize: client.getContextSize(),
					totalTokensUsed,
				};
			});
		}, 2000); // Update every 2 seconds to further reduce jitter

		try {
			// Load system prompt from prompt.md file
			let systemPrompt = 'You are a helpful AI assistant.'; // fallback
			if (existsSync(promptPath)) {
				try {
					systemPrompt = readFileSync(promptPath, 'utf-8');
				} catch (error) {
					console.warn(`Failed to load system prompt from ${promptPath}: ${error}`);
				}
			}

			// Create stream request
			const systemMessage: Message = {
				role: 'system',
				content: systemPrompt,
			};

			// Use the new conversation loop
			await processAssistantResponseWithTokenTracking(systemMessage, updatedMessages, timerInterval, startTime);
		} catch (error) {
			clearInterval(timerInterval);
			addToChatQueue(
				<ErrorMessage
					key={`error-${componentKeyCounter}`}
					message={`Chat error: ${error}`}
				/>,
			);
		} finally {
			setIsThinking(false);
		}
	};

	return {
		handleChatMessage,
		processAssistantResponse,
	};
}