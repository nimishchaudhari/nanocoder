import {ChatOpenAI} from '@langchain/openai';
import {StructuredTool} from '@langchain/core/tools';
import {
	AIMessage,
	HumanMessage,
	SystemMessage,
	ToolMessage,
	BaseMessage,
} from '@langchain/core/messages';
import type {
	Message,
	Tool,
	LLMClient,
	LangChainProviderConfig,
} from './types/index.js';
import {logError} from './utils/message-queue.js';
import {XMLToolCallParser} from './tool-calling/xml-parser.js';
import {generateToolCallInstructions} from './utils/prompt-processor.js';

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

export class LangGraphClient implements LLMClient {
	private chatModel: ChatOpenAI;
	private currentModel: string;
	private availableModels: string[];
	private providerConfig: LangChainProviderConfig;
	private modelInfoCache: Map<string, any> = new Map();
	private agent: any = null;
	private currentTools: Tool[] = [];
	private supportsNativeFunctionCalling: boolean | null = null;

	constructor(providerConfig: LangChainProviderConfig) {
		this.providerConfig = providerConfig;
		this.availableModels = providerConfig.models;
		this.currentModel = providerConfig.models[0] || '';
		this.chatModel = this.createChatModel();
	}

	static async create(
		providerConfig: LangChainProviderConfig,
	): Promise<LangGraphClient> {
		const client = new LangGraphClient(providerConfig);

		// Fetch OpenRouter model info if this is OpenRouter
		if (providerConfig.name === 'openrouter') {
			await client.fetchOpenRouterModelInfo();
		}

		return client;
	}

	private createChatModel(): ChatOpenAI {
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

	private async detectFunctionCallingSupport(tools: Tool[]): Promise<boolean> {
		if (this.supportsNativeFunctionCalling !== null) {
			return this.supportsNativeFunctionCalling;
		}

		if (tools.length === 0) {
			this.supportsNativeFunctionCalling = false;
			return false;
		}

		try {
			// Try to bind tools to check if model supports function calling
			const testAgent = this.chatModel.bindTools(
				tools.map(convertToLangChainTool),
			);

			// Test with a simple message to see if tool calling works
			const testMessage = new HumanMessage('Hello');
			const response = await testAgent.invoke([testMessage]);

			// If we get here without error, the model likely supports function calling
			this.supportsNativeFunctionCalling = true;
			console.log(`Function calling enabled for model ${this.currentModel}`);
			return true;
		} catch (error) {
			// Model doesn't support native tool calling
			this.supportsNativeFunctionCalling = false;
			console.log(
				`Function calling not enabled for model ${this.currentModel}. Mocking function calling via prompting.`,
			);
			return false;
		}
	}

	private createAgent(tools: Tool[]): any {
		// Simple: just try to bind tools to the model for native tool calling
		if (tools.length > 0 && this.supportsNativeFunctionCalling) {
			try {
				return this.chatModel.bindTools(tools.map(convertToLangChainTool));
			} catch (error) {
				// Model doesn't support native tool calling
				this.supportsNativeFunctionCalling = false;
				return null;
			}
		}
		return null;
	}

	setModel(model: string): void {
		this.currentModel = model;
		this.chatModel = this.createChatModel();
		// Reset agent and function calling detection when model changes
		this.agent = null;
		this.supportsNativeFunctionCalling = null;
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
			return 0;
		}

		// For OpenAI-compatible (local models), we can't reliably know the context
		if (this.providerConfig.name === 'openai-compatible') {
			return 0;
		}

		// Try to get from LangChain model if available
		if (this.chatModel && (this.chatModel as any).maxTokens) {
			return (this.chatModel as any).maxTokens;
		}

		return 0;
	}

	async getAvailableModels(): Promise<string[]> {
		return this.availableModels;
	}

	async chat(messages: Message[], tools: Tool[]): Promise<any> {
		try {
			// Detect function calling support if not already detected
			if (tools.length > 0 && this.supportsNativeFunctionCalling === null) {
				await this.detectFunctionCallingSupport(tools);
			}

			// Create or recreate agent if tools changed
			if (
				!this.agent ||
				JSON.stringify(this.currentTools) !== JSON.stringify(tools)
			) {
				this.currentTools = tools;
				this.agent = this.createAgent(tools);
			}

			const langchainMessages = messages.map(convertToLangChainMessage);

			let result: AIMessage;

			if (
				this.agent &&
				tools.length > 0 &&
				this.supportsNativeFunctionCalling
			) {
				// Use model with bound tools for native tool calling
				result = (await this.agent.invoke(langchainMessages)) as AIMessage;
			} else {
				// Use base model (tool parsing handled in chat handler)
				result = (await this.chatModel.invoke(langchainMessages)) as AIMessage;
			}

			let convertedMessage = convertFromLangChainMessage(result);

			// Handle XML tool calls for non-function-calling models
			if (
				!this.supportsNativeFunctionCalling &&
				tools.length > 0 &&
				convertedMessage.content
			) {
				const content = convertedMessage.content as string;

				if (XMLToolCallParser.hasToolCalls(content)) {
					const parsedToolCalls = XMLToolCallParser.parseToolCalls(content);
					const toolCalls =
						XMLToolCallParser.convertToToolCalls(parsedToolCalls);
					const cleanedContent =
						XMLToolCallParser.removeToolCallsFromContent(content);

					convertedMessage = {
						...convertedMessage,
						content: cleanedContent,
						tool_calls: toolCalls,
					};
				}
			}

			// Add metadata about function calling support
			(convertedMessage as any).supportsNativeFunctionCalling =
				this.supportsNativeFunctionCalling;

			return {
				choices: [
					{
						message: convertedMessage,
					},
				],
			};
		} catch (error) {
			logError(`LangGraph chat error: ${error}`);
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
						content: message.content || '',
						tool_calls: message.tool_calls,
					},
					done: false,
				};
			} else if (message.content) {
				// If there's content, simulate streaming by yielding it in chunks
				const content = message.content as string;
				const chunkSize = 50;

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
			logError(`LangGraph stream error: ${error}`);
			return;
		}
	}

	async clearContext(): Promise<void> {
		// Reset the agent to clear any internal state
		this.agent = null;
	}

	/**
	 * Get function calling support status and XML instructions if needed
	 */
	getFunctionCallingInfo(tools: Tool[]): {
		supportsNativeFunctionCalling: boolean | null;
		xmlInstructions?: string;
	} {
		const info = {
			supportsNativeFunctionCalling: this.supportsNativeFunctionCalling,
		};

		// Add XML instructions for non-function-calling models
		if (this.supportsNativeFunctionCalling === false && tools.length > 0) {
			const toolSpecs = tools.map(tool => ({
				name: tool.function.name,
				description: tool.function.description,
				parameters: tool.function.parameters,
			}));

			return {
				...info,
				xmlInstructions:
					generateToolCallInstructions(toolSpecs),
			};
		}

		return info;
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
