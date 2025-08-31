import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOpenAI } from '@langchain/openai';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, BaseMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';
import type { Message, Tool, LLMClient, LangChainProviderConfig } from './types/index.js';
import { logError } from './utils/message-queue.js';

/**
 * Converts our Tool format to LangChain StructuredTool format
 */
function convertToLangChainTool(tool: Tool): StructuredTool {
  return new (class extends StructuredTool {
    name = tool.function.name;
    description = tool.function.description;
    schema = tool.function.parameters;

    async _call(input: any): Promise<string> {
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
  private supportsNativeTools: boolean | null = null; // Cache tool support detection
  private modelInfoCache: Map<string, any> = new Map(); // Cache OpenRouter model info

  constructor(providerConfig: LangChainProviderConfig) {
    this.providerConfig = providerConfig;
    this.availableModels = providerConfig.models;
    this.currentModel = providerConfig.models[0] || '';
    this.chatModel = this.createChatModel();
    
    // Fetch OpenRouter model info if this is OpenRouter
    if (this.providerConfig.name === 'openrouter') {
      this.fetchOpenRouterModelInfo();
    }
  }

  private createChatModel(): BaseChatModel {
    const { type, config } = this.providerConfig;

    switch (type) {
      case 'openai':
      case 'openai-compatible':
        return new ChatOpenAI({
          modelName: this.currentModel,
          openAIApiKey: config.apiKey,
          configuration: {
            baseURL: config.baseURL,
          },
          ...config,
        });

      default:
        throw new Error(`Unsupported LangChain provider type: ${type}`);
    }
  }

  setModel(model: string): void {
    this.currentModel = model;
    // Recreate the chat model with the new model and reset tool support detection
    this.supportsNativeTools = null;
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
      // Return 0 to hide context display if not available yet
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
        if (this.supportsNativeTools === false) {
          // We already know this model doesn't support native tools, skip directly to prompt-based
          result = await this.invokeWithPromptBasedTools(langchainMessages, tools);
        } else {
          try {
            // Try native tool calling first
            const modelWithTools = this.chatModel.bindTools!(langchainTools);
            result = await modelWithTools.invoke(langchainMessages) as AIMessage;
            this.supportsNativeTools = true; // Cache that it works
          } catch (error) {
            // Fallback to prompt-based tool calling for non-tool-calling models
            this.supportsNativeTools = false; // Cache that it doesn't work
            result = await this.invokeWithPromptBasedTools(langchainMessages, tools);
          }
        }
      } else {
        result = await this.chatModel.invoke(langchainMessages) as AIMessage;
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
        yield { done: true };
        return;
      }
      
      const message = result.choices[0].message;
      
      // If there are tool calls, yield them directly
      if (message.tool_calls && message.tool_calls.length > 0) {
        yield {
          message: {
            content: '',
            tool_calls: message.tool_calls,
          },
          done: true,
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
        
        yield { done: true };
      } else {
        yield { done: true };
      }
    } catch (error) {
      logError(`LangChain stream error: ${error}`);
      return;
    }
  }

  async clearContext(): Promise<void> {
    // LangChain models are typically stateless, no context to clear
    // If the underlying provider needs context clearing, it would be handled here
  }

  private async invokeWithPromptBasedTools(messages: BaseMessage[], tools: Tool[]): Promise<AIMessage> {
    const messagesWithTools = this.addToolsToMessages(messages, tools);
    const result = await this.chatModel.invoke(messagesWithTools) as AIMessage;
    
    // Parse tool calls from the response content
    const toolCalls = this.parseToolCallsFromContent(result.content as string);
    
    if (toolCalls.length > 0) {
      // Return modified result with tool calls
      return new AIMessage({
        content: '', // Clear content since we extracted tool calls
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          args: tc.function.arguments,
        })),
      });
    }
    
    return result;
  }

  private addToolsToMessages(messages: BaseMessage[], tools: Tool[]): BaseMessage[] {
    if (tools.length === 0) return messages;

    // Create tool definitions prompt
    const toolDefinitions = tools.map(tool => {
      const params = Object.entries(tool.function.parameters.properties)
        .map(([name, schema]: [string, any]) => `${name}: ${schema.description || schema.type}`)
        .join(', ');
      
      return `${tool.function.name}(${params}) - ${tool.function.description}`;
    }).join('\n');

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
${toolDefinitions}

IMPORTANT: Only use the JSON tool format if you actually need to use a tool. If you're just responding normally, don't include any JSON.`;

    // Add tool instructions to the system message or create one
    const modifiedMessages = [...messages];
    const systemMessageIndex = modifiedMessages.findIndex(msg => msg._getType() === 'system');
    
    if (systemMessageIndex >= 0) {
      // Append to existing system message
      const existingSystemMsg = modifiedMessages[systemMessageIndex];
      modifiedMessages[systemMessageIndex] = new SystemMessage(
        existingSystemMsg.content + '\n\n' + toolInstructions
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
                id: toolCall.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments || {},
                },
              });
            } else if (toolCall.id && (toolCall.command !== undefined || toolCall.name)) {
              // Handle simplified format: { "id": "tool_name", "command": "value" }
              const toolName = toolCall.name || toolCall.id;
              const args: any = {...toolCall};
              delete args.id;
              delete args.name;
              
              toolCalls.push({
                id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                function: {
                  name: toolName,
                  arguments: args,
                },
              });
            }
          }
        }
        // Handle direct tool call format (single tool)
        else if (parsed.id && (parsed.command !== undefined || parsed.name || parsed.function)) {
          if (parsed.function?.name) {
            // Standard single tool call format
            toolCalls.push({
              id: parsed.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              function: {
                name: parsed.function.name,
                arguments: parsed.function.arguments || {},
              },
            });
          } else {
            // Simplified single tool call format
            const toolName = parsed.name || parsed.id;
            const args: any = {...parsed};
            delete args.id;
            delete args.name;
            
            toolCalls.push({
              id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              function: {
                name: toolName,
                arguments: args,
              },
            });
          }
        }
      } catch (error) {
        console.log('[DEBUG] Failed to parse JSON in tool call block:', match[1], 'Error:', error);
        // Skip invalid JSON
        continue;
      }
    }
    
    return toolCalls;
  }

  private async fetchOpenRouterModelInfo(): Promise<void> {
    if (this.providerConfig.name !== 'openrouter' || !this.providerConfig.config.apiKey) {
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