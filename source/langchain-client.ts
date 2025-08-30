import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { ContextDetector } from "./langchain-tools/context-detector.js";
import { ToolDetector } from "./langchain-tools/tool-detector.js";
import { ManualToolHandler } from "./langchain-tools/manual-tool-handler.js";
import type { Message, Tool, ToolCall, LLMClient } from './types/core.js';

export class LangChainClient implements LLMClient {
  private provider: string;
  private chatModel: BaseChatModel;
  private currentModel: string;
  private contextSize: number;
  private supportsToolCalling: boolean;
  private baseUrl?: string;
  private apiKey?: string;

  constructor(
    provider: string, 
    chatModel: BaseChatModel, 
    currentModel?: string,
    contextSize?: number
  ) {
    this.provider = provider;
    this.chatModel = chatModel;
    this.currentModel = currentModel || 'gpt-3.5-turbo';
    
    // Initialize context size - either provided or default
    this.contextSize = contextSize || 4096;
    
    // Initialize tool calling support
    this.supportsToolCalling = ToolDetector.supportsNativeToolCalling(provider, this.currentModel);
  }

  async initialize(baseUrl?: string, apiKey?: string): Promise<void> {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    
    // If context size wasn't provided and we have a base URL, detect it
    if (!this.contextSize && baseUrl) {
      try {
        this.contextSize = await ContextDetector.detectContextWindow(
          baseUrl, 
          this.currentModel, 
          apiKey
        );
      } catch (error) {
        // Fallback to safe default
        this.contextSize = 4096;
      }
    }
    
    // Update model name if needed
    if ('modelName' in this.chatModel) {
      this.currentModel = (this.chatModel as any).modelName;
    }
  }

  setModel(model: string): void {
    this.currentModel = model;
    // Update the model in the chat model if possible
    if ('modelName' in this.chatModel) {
      (this.chatModel as any).modelName = model;
    }
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  getContextSize(): number {
    return this.contextSize;
  }

  async getAvailableModels(): Promise<string[]> {
    // Try to fetch models from the API if base URL is available
    if (this.baseUrl) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(`${this.baseUrl}/v1/models`, { headers });
        if (response.ok) {
          const data: any = await response.json();
          return data.data?.map((model: any) => model.id) || [this.currentModel];
        }
      } catch (error) {
        // Fall back to current model
      }
    }
    
    // Return current model as fallback
    return [this.currentModel];
  }

  async chat(messages: Message[], tools: Tool[]): Promise<any> {
    try {
      // Convert messages to LangChain format
      const langChainMessages = this.convertNanocoderMessagesToLangChain(messages);
      const langChainTools = this.convertNanocoderToolsToLangChain(tools);
      
      let response: any;
      
      // Check if model supports native tool calling and we have tools
      if (this.supportsToolCalling && langChainTools.length > 0) {
        // Use native tool calling
        const modelWithTools = this.chatModel.bindTools 
          ? this.chatModel.bindTools(langChainTools)
          : this.chatModel;
          
        response = await modelWithTools.invoke(langChainMessages);
      } else if (langChainTools.length > 0) {
        // Use manual tool calling for unsupported models
        response = await ManualToolHandler.executeWithManualToolCalling(
          this.chatModel,
          langChainMessages,
          langChainTools
        );
      } else {
        // No tools, direct invocation
        response = await this.chatModel.invoke(langChainMessages);
      }
      
      return this.formatResponse(response);
    } catch (error) {
      throw new Error(`Chat completion failed: ${error}`);
    }
  }

  async *chatStream(messages: Message[], tools: Tool[]): AsyncIterable<any> {
    try {
      const langChainMessages = this.convertNanocoderMessagesToLangChain(messages);
      const langChainTools = this.convertNanocoderToolsToLangChain(tools);
      
      let stream: AsyncIterable<any>;
      
      if (this.supportsToolCalling && langChainTools.length > 0) {
        // Native tool calling streaming
        const modelWithTools = this.chatModel.bindTools 
          ? this.chatModel.bindTools(langChainTools)
          : this.chatModel;
          
        stream = await modelWithTools.stream(langChainMessages);
      } else if (langChainTools.length > 0) {
        // Manual tool calling (no streaming for now)
        const response = await ManualToolHandler.executeWithManualToolCalling(
          this.chatModel,
          langChainMessages,
          langChainTools
        );
        yield this.formatResponse(response);
        return;
      } else {
        // Direct streaming
        stream = await this.chatModel.stream(langChainMessages);
      }
      
      for await (const chunk of stream) {
        const formattedChunk = this.formatStreamChunk(chunk);
        yield formattedChunk;
      }
      
      // Yield final chunk to signal completion
      yield {
        message: {
          content: '',
        },
        done: true
      };
    } catch (error) {
      throw new Error(`Chat streaming failed: ${error}`);
    }
  }

  private convertNanocoderMessagesToLangChain(messages: Message[]): any[] {
    return messages.map(msg => {
      switch (msg.role) {
        case 'user':
          return new HumanMessage(msg.content || '');
        case 'assistant':
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            return new AIMessage({
              content: msg.content || '',
              tool_calls: msg.tool_calls.map(tc => ({
                id: tc.id,
                name: tc.function.name,
                args: tc.function.arguments,
                type: "tool_call"
              }))
            });
          }
          return new AIMessage(msg.content || '');
        case 'system':
          return new SystemMessage(msg.content || '');
        case 'tool':
          return new ToolMessage({
            content: msg.content || '',
            tool_call_id: msg.tool_call_id || ''
          });
        default:
          return new HumanMessage(msg.content || '');
      }
    });
  }

  private convertNanocoderToolsToLangChain(tools: Tool[]): any[] {
    return tools.map(tool => ({
      type: "function",
      function: {
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters
      }
    }));
  }

  private formatResponse(response: any): any {
    // Format the response to match the expected nanocoder format
    if (response instanceof AIMessage) {
      // Convert tool calls to the correct format
      let toolCalls: ToolCall[] = [];
      if (response.tool_calls && Array.isArray(response.tool_calls)) {
        toolCalls = response.tool_calls.map((tc: any) => {
          // Convert LangChain tool call format to Nanocoder format
          return {
            id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            function: {
              name: tc.name,
              arguments: tc.args || {}
            }
          };
        });
      }
      
      return {
        content: response.content,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        // Add other fields as needed
      };
    }
    
    // If it's already in the right format, return as-is
    return response;
  }

  private formatStreamChunk(chunk: any): any {
    // Format streaming chunks to match the expected nanocoder format

    
    // Handle AIMessage and AIMessageChunk instances (both inherit from BaseMessage)
    if (chunk instanceof AIMessage || chunk.constructor.name === 'AIMessageChunk') {
      // Convert tool calls to the correct format
      let toolCalls: ToolCall[] = [];
      if (chunk.tool_calls && Array.isArray(chunk.tool_calls)) {
        toolCalls = chunk.tool_calls.map((tc: any) => {
          // Convert LangChain tool call format to Nanocoder format
          return {
            id: tc.id || `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            function: {
              name: tc.name,
              arguments: tc.args || {}
            }
          };
        });
      }
      
      // Return chunks with the proper structure (even if content is empty)
      return {
        message: {
          content: chunk.content || '',
          tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        },
        done: false
      };
    }
    
    // Handle string chunks
    if (typeof chunk === 'string') {
      return {
        message: {
          content: chunk
        },
        done: false
      };
    }
    
    // Handle object chunks that might contain content or tool calls
    if (typeof chunk === 'object' && chunk !== null) {
      // If it already has the message format, return as-is but ensure done flag
      if (chunk.message) {
        return {
          ...chunk,
          done: chunk.done ?? false
        };
      }
      
      // If it has content directly, wrap it properly
      if ('content' in chunk || 'tool_calls' in chunk) {
        return {
          message: {
            content: chunk.content !== undefined ? chunk.content : '',
            tool_calls: chunk.tool_calls !== undefined ? chunk.tool_calls : undefined
          },
          done: chunk.done ?? false
        };
      }
    }
    
    // For any other chunk type, return a default structure
    return {
      message: {
        content: typeof chunk === 'object' ? JSON.stringify(chunk) : String(chunk)
      },
      done: false
    };
  }

  async clearContext(): Promise<void> {
    // LangChain models are stateless, so there's no context to clear
    // This is a no-op
  }
}