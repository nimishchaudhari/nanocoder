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
import {getOrCreateProxy} from './litellm-proxy.js';

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

	private usingProxy = false; // Track if we're using LiteLLM proxy
	private originalConfig: LangChainProviderConfig; // Store original config for proxy fallback

	constructor(providerConfig: LangChainProviderConfig) {
		this.originalConfig = providerConfig;
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
					// Native tool calling failed - switch to LiteLLM proxy
					await this.switchToProxy();
					const modelWithTools = this.chatModel.bindTools!(langchainTools);
					result = (await modelWithTools.invoke(
						langchainMessages,
					)) as AIMessage;

					// Apply loop detection to proxy tool calls
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

	private async switchToProxy(): Promise<void> {
		if (this.usingProxy) {
			return; // Already using proxy
		}

		// Start the LiteLLM proxy with the original provider config and current model
		const proxy = await getOrCreateProxy(this.originalConfig, this.getCurrentModel());
		
		// Switch to using the proxy
		this.usingProxy = true;
		const proxyConfig: LangChainProviderConfig = {
			...this.originalConfig,
			models: ['proxy-model'], // Use the proxy model name
			config: {
				...this.originalConfig.config,
				baseURL: `${proxy.getProxyUrl()}/v1`,
			},
		};
		this.providerConfig = proxyConfig;
		// Update current model to proxy model name
		this.currentModel = 'proxy-model';
		this.chatModel = this.createChatModel();
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
