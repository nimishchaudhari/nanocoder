import {BaseChatModel} from '@langchain/core/language_models/chat_models';
import {ChatOpenAI} from '@langchain/openai';
import {
	AIMessage,
	HumanMessage,
	SystemMessage,
	ToolMessage,
	BaseMessage,
} from '@langchain/core/messages';
import {StructuredTool} from '@langchain/core/tools';
import type {
	Message,
	Tool,
	LLMClient,
	LangChainProviderConfig,
} from './types/index.js';
import {logError} from './utils/message-queue.js';

/**
 * Converts our Tool format to LangChain StructuredTool format
 */
function convertToLangChainTool(tool: Tool): StructuredTool {
	return new (class extends StructuredTool {
		name = tool.function.name;
		description = tool.function.description;
		schema = tool.function.parameters;

		async _call(_input: any): Promise<string> {
			// This won't actually be called since we handle tool execution externally
			// But LangChain requires it for the tool definition
			return 'Tool execution handled externally';
		}
	})();
}

/**
 * Converts our Message format to LangChain BaseMessage format
 */
function convertToLangChainMessage(message: Message): BaseMessage {
	switch (message.role) {
		case 'user':
			return new HumanMessage(message.content || '');
		case 'system':
			return new SystemMessage(message.content || '');
		case 'assistant':
			if (message.tool_calls && message.tool_calls.length > 0) {
				return new AIMessage({
					content: message.content || '',
					tool_calls: message.tool_calls.map(tc => ({
						id: tc.id,
						name: tc.function.name,
						args: tc.function.arguments,
					})),
				});
			}
			return new AIMessage(message.content || '');
		case 'tool':
			return new ToolMessage({
				content: message.content || '',
				tool_call_id: message.tool_call_id || '',
				name: message.name || '',
			});
		default:
			throw new Error(`Unsupported message role: ${message.role}`);
	}
}

/**
 * Converts LangChain AIMessage back to our Message format
 */
function convertFromLangChainMessage(message: AIMessage): Message {
	const result: Message = {
		role: 'assistant',
		content: message.content as string,
	};

	if (message.tool_calls && message.tool_calls.length > 0) {
		result.tool_calls = message.tool_calls.map(tc => ({
			id: tc.id || '',
			function: {
				name: tc.name,
				arguments: tc.args,
			},
		}));
	}

	return result;
}

export class LangChainClient implements LLMClient {
	private chatModel: BaseChatModel;
	private currentModel: string;
	private availableModels: string[];
	private providerConfig: LangChainProviderConfig;
	private modelInfoCache: Map<string, any> = new Map(); // Cache OpenRouter model info
	private toolCallHistory: Array<{
		toolName: string;
		args: any;
		timestamp: number;
	}> = []; // Track recent tool calls to prevent loops

	private currentTaskContext: string | null = null; // Track current user task for continuation

	constructor(providerConfig: LangChainProviderConfig) {
		this.providerConfig = providerConfig;
		this.availableModels = providerConfig.models;
		this.currentModel = providerConfig.models[0] || '';
		this.chatModel = this.createChatModel();
	}

	static async create(
		providerConfig: LangChainProviderConfig,
	): Promise<LangChainClient> {
		const client = new LangChainClient(providerConfig);

		// Fetch OpenRouter model info if this is OpenRouter
		if (providerConfig.name === 'openrouter') {
			await client.fetchOpenRouterModelInfo();
		}

		return client;
	}

	private createChatModel(): BaseChatModel {
		const {config} = this.providerConfig;

		return new ChatOpenAI({
			modelName: this.currentModel,
			openAIApiKey: config.apiKey || 'dummy-key',
			configuration: {
				baseURL: config.baseURL,
			},
			...config,
		});
	}

	setModel(model: string): void {
		this.currentModel = model;
		// Recreate the chat model with the new model
		this.chatModel = this.createChatModel();
	}

	getCurrentModel(): string {
		return this.currentModel;
	}

	getContextSize(): number {
		// For OpenRouter, get from cached model info
		if (this.providerConfig.name === 'openrouter') {
			const modelData = this.modelInfoCache.get(this.currentModel);
			if (modelData && modelData.context_length) {
				return modelData.context_length;
			}
			// Return 0 if model info not loaded yet (will hide context display)
			return 0;
		}

		// For OpenAI-compatible (local models), we can't reliably know the context
		// Hide context display by returning 0
		if (this.providerConfig.name === 'openai-compatible') {
			return 0;
		}

		// Try to get from LangChain model if available
		if (this.chatModel && (this.chatModel as any).maxTokens) {
			return (this.chatModel as any).maxTokens;
		}

		// Hide context if we can't determine it reliably
		return 0;
	}

	async getAvailableModels(): Promise<string[]> {
		return this.availableModels;
	}

	async chat(messages: Message[], tools: Tool[]): Promise<any> {
		try {
			// Extract current task from user messages for context preservation
			this.extractTaskContext(messages);

			const langchainMessages = messages.map(convertToLangChainMessage);
			const langchainTools = tools.map(convertToLangChainTool);

			let result: AIMessage;
			if (langchainTools.length > 0) {
				try {
					// Try native tool calling first
					const modelWithTools = this.chatModel.bindTools!(langchainTools);
					result = (await modelWithTools.invoke(
						langchainMessages,
					)) as AIMessage;

					// Apply loop detection to native tool calls
					if (result.tool_calls && result.tool_calls.length > 0) {
						const filteredToolCalls = result.tool_calls.filter(tc => {
							const isDuplicate = this.isDuplicateRecentToolCall(
								tc.name,
								tc.args,
							);
							if (isDuplicate) {
								return false;
							}
							// Add non-duplicate calls to history
							this.addToToolCallHistory(tc.name, tc.args);
							return true;
						});

						// If we have filtered tool calls, update the result
						if (filteredToolCalls.length > 0) {
							result = new AIMessage({
								content: result.content,
								tool_calls: filteredToolCalls,
							});
						} else {
							// All tool calls were duplicates, return response explaining this
							result = new AIMessage({
								content:
									"I notice I was about to repeat the same tool call(s). The requested action has already been performed recently. Please let me know if you need something different or if you'd like me to check the previous results.",
							});
						}
					}
				} catch (error) {
					// Fallback to prompt-based tool calling for non-tool-calling models
					result = await this.invokeWithPromptBasedTools(
						langchainMessages,
						tools,
					);
				}
			} else {
				result = (await this.chatModel.invoke(langchainMessages)) as AIMessage;
			}

			// Convert back to our expected format
			const convertedMessage = convertFromLangChainMessage(result);

			return {
				choices: [
					{
						message: convertedMessage,
					},
				],
			};
		} catch (error) {
			logError(`LangChain chat error: ${error}`);
			return null;
		}
	}

	async *chatStream(messages: Message[], tools: Tool[]): AsyncIterable<any> {
		try {
			// Use the non-streaming chat method which handles tool calls properly
			const result = await this.chat(messages, tools);

			if (!result) {
				yield {done: true};
				return;
			}

			const message = result.choices[0].message;

			// If there are tool calls, yield them with preserved content
			if (message.tool_calls && message.tool_calls.length > 0) {
				yield {
					message: {
						content: message.content || '', // Preserve assistant's reasoning
						tool_calls: message.tool_calls,
					},
					done: false, // Don't mark as done - conversation continues after tool execution
				};
			} else if (message.content) {
				// If there's content, simulate streaming by yielding it in chunks
				const content = message.content as string;
				const chunkSize = 50; // Characters per chunk

				for (let i = 0; i < content.length; i += chunkSize) {
					const chunk = content.slice(i, i + chunkSize);
					yield {
						message: {
							content: chunk,
						},
						done: false,
					};

					// Small delay to simulate streaming
					await new Promise(resolve => setTimeout(resolve, 10));
				}

				yield {done: true};
			} else {
				yield {done: true};
			}
		} catch (error) {
			logError(`LangChain stream error: ${error}`);
			return;
		}
	}

	async clearContext(): Promise<void> {
		// LangChain models are typically stateless, no context to clear
		// If the underlying provider needs context clearing, it would be handled here
		// Clear tool call history when context is cleared
		this.toolCallHistory = [];
	}

	/**
	 * Check if a tool call is a recent duplicate to prevent looping
	 */
	private isDuplicateRecentToolCall(toolName: string, args: any): boolean {
		const now = Date.now();
		const recentWindow = 30000; // 30 seconds
		const argsString = JSON.stringify(args);

		// Clean up old entries
		this.toolCallHistory = this.toolCallHistory.filter(
			entry => now - entry.timestamp < recentWindow,
		);

		// Check for duplicates in recent history
		const isDuplicate = this.toolCallHistory.some(
			entry =>
				entry.toolName === toolName &&
				JSON.stringify(entry.args) === argsString,
		);

		return isDuplicate;
	}

	/**
	 * Add a tool call to history for duplicate detection
	 */
	private addToToolCallHistory(toolName: string, args: any): void {
		this.toolCallHistory.push({
			toolName,
			args,
			timestamp: Date.now(),
		});

		// Keep only recent entries to prevent memory bloat
		const maxEntries = 20;
		if (this.toolCallHistory.length > maxEntries) {
			this.toolCallHistory = this.toolCallHistory.slice(-maxEntries);
		}
	}

	private async invokeWithPromptBasedTools(
		messages: BaseMessage[],
		tools: Tool[],
	): Promise<AIMessage> {
		const messagesWithTools = this.addToolsToMessages(messages, tools);
		const result = (await this.chatModel.invoke(
			messagesWithTools,
		)) as AIMessage;

		// Parse tool calls from the response content
		const toolCalls = this.parseToolCallsFromContent(result.content as string);

		if (toolCalls.length > 0) {
			// Filter out duplicate recent tool calls to prevent loops
			const filteredToolCalls = toolCalls.filter(tc => {
				const isDuplicate = this.isDuplicateRecentToolCall(
					tc.function.name,
					tc.function.arguments,
				);
				if (isDuplicate) {
					logError(
						`Prevented duplicate tool call: ${tc.function.name} (loop prevention)`,
					);
					return false;
				}
				// Add non-duplicate calls to history
				this.addToToolCallHistory(tc.function.name, tc.function.arguments);
				return true;
			});

			// If we have filtered tool calls, return them with preserved reasoning
			if (filteredToolCalls.length > 0) {
				// Extract the reasoning part before tool calls for context preservation
				const reasoningContent = this.extractReasoningFromContent(
					result.content as string,
				);

				return new AIMessage({
					content: reasoningContent, // Preserve model's reasoning for context
					tool_calls: filteredToolCalls.map(tc => ({
						id: tc.id,
						name: tc.function.name,
						args: tc.function.arguments,
					})),
				});
			} else {
				// All tool calls were duplicates, return response explaining this
				return new AIMessage({
					content:
						"I notice I was about to repeat the same tool call(s). The requested action has already been performed recently. Please let me know if you need something different or if you'd like me to check the previous results.",
				});
			}
		}

		return result;
	}

	private addToolsToMessages(
		messages: BaseMessage[],
		tools: Tool[],
	): BaseMessage[] {
		if (tools.length === 0) return messages;

		// Create tool definitions prompt
		const toolDefinitions = tools
			.map(tool => {
				const params = Object.entries(tool.function.parameters.properties)
					.map(
						([name, schema]: [string, any]) =>
							`${name}: ${schema.description || schema.type}`,
					)
					.join(', ');

				return `${tool.function.name}(${params}) - ${tool.function.description}`;
			})
			.join('\n');

		// Include current task context if available
		const taskContext = this.currentTaskContext 
			? `\n\nCURRENT TASK REMINDER: "${this.currentTaskContext}"\nYour job is to complete this specific task. After each tool execution, continue working toward this goal.`
			: '';

		const toolInstructions = `You have access to the following tools. To use a tool, respond with JSON in this exact format:

\`\`\`json
{
  "tool_calls": [
    {
      "id": "call_123",
      "function": {
        "name": "tool_name",
        "arguments": {
          "param1": "value1",
          "param2": "value2"
        }
      }
    }
  ]
}
\`\`\`

Available tools:
${toolDefinitions}${taskContext}

CRITICAL CONTINUATION RULES FOR NON-TOOL-CALLING MODELS:
1. NEVER stop after using a tool - immediately continue toward completing the original user request
2. After each tool execution, ask yourself: "Does this tool result help me complete the user's original request?"
3. If YES: Use the tool result to provide the final answer or take the next step
4. If NO: Explain what you learned and continue with the appropriate next step
5. ALWAYS reference the original user request when deciding what to do next
6. Tool execution is NOT the end goal - completing the user's task is the end goal

IMPORTANT RULES:
1. Only use the JSON tool format if you actually need to use a tool
2. If you're just responding normally, don't include any JSON
3. DO NOT repeat tool calls - if you've already used a tool recently, check the previous results instead
4. If you see tool results in the conversation history, use them rather than calling the same tool again
5. Each tool should only be called once per task unless the user explicitly asks to repeat it
6. CRITICAL: After tool execution, continue working toward your original goal - don't stop and wait for user input
7. Use tool results immediately to take the next logical step in completing the user's request

FOR NON-TOOL-CALLING MODELS:
- State the original user request before each response
- After each tool execution, immediately explain what you learned and what you'll do next
- Never end your response with just tool execution - always continue the conversation
- Keep the original task goal in mind throughout the entire process
- Don't wait for user confirmation - proceed automatically with your plan to complete the task`;

		// Add tool instructions to the system message or create one
		const modifiedMessages = [...messages];
		const systemMessageIndex = modifiedMessages.findIndex(
			msg => msg instanceof SystemMessage,
		);

		if (systemMessageIndex >= 0) {
			// Append to existing system message
			const existingSystemMsg = modifiedMessages[systemMessageIndex];
			modifiedMessages[systemMessageIndex] = new SystemMessage(
				existingSystemMsg.content + '\n\n' + toolInstructions,
			);
		} else {
			// Add new system message at the beginning
			modifiedMessages.unshift(new SystemMessage(toolInstructions));
		}

		return modifiedMessages;
	}

	private parseToolCallsFromContent(content: string): any[] {
		const toolCalls: any[] = [];

		// Look for JSON code blocks containing tool calls
		const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/g;
		let match;

		while ((match = jsonBlockRegex.exec(content)) !== null) {
			try {
				const parsed = JSON.parse(match[1]);

				// Handle standard format: { "tool_calls": [...] }
				if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
					for (const toolCall of parsed.tool_calls) {
						if (toolCall.function?.name) {
							toolCalls.push({
								id:
									toolCall.id ||
									`call_${Date.now()}_${Math.random()
										.toString(36)
										.substring(2, 11)}`,
								function: {
									name: toolCall.function.name,
									arguments: toolCall.function.arguments || {},
								},
							});
						}
					}
				}
			} catch (error) {
				// Skip invalid JSON
				continue;
			}
		}

		return toolCalls;
	}

	/**
	 * Extract current task context from recent user messages
	 */
	private extractTaskContext(messages: Message[]): void {
		// Find the most recent user message that looks like a task request
		for (let i = messages.length - 1; i >= 0; i--) {
			const message = messages[i];
			if (
				message.role === 'user' &&
				message.content &&
				message.content.trim().length > 10
			) {
				// Skip very short messages or common responses
				const content = message.content.toLowerCase();
				if (
					!content.includes('ok') &&
					!content.includes('yes') &&
					!content.includes('no') &&
					!content.includes('thanks') &&
					content.length > 20
				) {
					this.currentTaskContext = message.content;
					break;
				}
			}
		}
	}

	/**
	 * Extract reasoning content from model response, removing JSON tool calls
	 */
	private extractReasoningFromContent(content: string): string {
		// Remove JSON code blocks containing tool calls
		const withoutToolCalls = content
			.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '')
			.trim();

		// If there's still meaningful content, return it, otherwise return original
		return withoutToolCalls.length > 20 ? withoutToolCalls : content;
	}

	private async fetchOpenRouterModelInfo(): Promise<void> {
		if (
			this.providerConfig.name !== 'openrouter' ||
			!this.providerConfig.config.apiKey
		) {
			return;
		}

		try {
			const response = await fetch('https://openrouter.ai/api/v1/models', {
				headers: {
					Authorization: `Bearer ${this.providerConfig.config.apiKey}`,
					'Content-Type': 'application/json',
				},
			});

			if (response.ok) {
				const data: any = await response.json();
				for (const model of data.data) {
					this.modelInfoCache.set(model.id, model);
				}
			}
		} catch (error) {
			logError(`Failed to fetch OpenRouter model info: ${error}`);
		}
	}
}
