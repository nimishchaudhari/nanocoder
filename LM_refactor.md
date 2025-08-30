# Complete Refactoring Plan: LangChain Integration for OpenAI-Compatible APIs

Let me first systematically analyze your codebase to understand exactly what needs to be changed.

## 1. Codebase Analysis

Based on the directory structure and file examination, here's what we're working with:

### Core LLM Client Interface
The `LLMClient` interface in `source/types/core.ts` defines the contract that all LLM implementations must follow:
- `getCurrentModel(): string`
- `setModel(model: string): void`
- `getContextSize(): number`
- `getAvailableModels(): Promise<string[]>`
- `chat(messages: Message[], tools: Tool[]): Promise<any>`
- `chatStream(messages: Message[], tools: Tool[]): AsyncIterable<any>`
- `clearContext(): Promise<void`

### Current Implementation Files
1. **`source/client-factory.ts`** - Main factory that creates LLM clients
2. **`source/ollama-client.ts`** - Ollama implementation
3. **`source/openai-compatible-client.ts`** - OpenAI-compatible API implementation
4. **`source/openrouter-client.ts`** - OpenRouter implementation

### Configuration
Configuration is handled through `agents.config.json` with separate sections for each provider.

## 2. Files That Require Changes

### Files to be MODIFIED:
1. **`source/client-factory.ts`** - Update to use LangChain implementation
2. **`source/types/core.ts`** - Potentially update LLMClient interface if needed
3. **`source/config/index.ts`** - Update configuration structure if needed

### Files to be CREATED:
1. **`source/langchain-factory.ts`** - Main LangChain factory
2. **`source/langchain-client.ts`** - LangChain client implementation
3. **`source/langchain-tools/context-detector.ts`** - Context window detection
4. **`source/langchain-tools/manual-tool-handler.ts`** - Manual tool calling abstraction
5. **`source/langchain-tools/tool-detector.ts`** - Tool calling capability detection

### Files to be REMOVED (after migration):
1. **`source/ollama-client.ts`** - Will be replaced by LangChain
2. **`source/openai-compatible-client.ts`** - Will be replaced by LangChain
3. **`source/openrouter-client.ts`** - Will be replaced by LangChain

## 3. Complete Refactoring Plan

### Phase 1: Foundation (Week 1)

#### Step 1: Add LangChain Dependencies
```bash
npm install @langchain/core @langchain/openai
```

#### Step 2: Create LangChain Factory
```typescript
// source/langchain-factory.ts
import { ChatOpenAI } from "@langchain/openai";
import { LangChainClient } from "./langchain-client.js";
import { appConfig } from "./config/index.js";
import type { ProviderType } from "./types/core.js";

interface ModelConfig {
  baseUrl?: string;
  apiKey?: string;
  models?: string[];
  model?: string;
  temperature?: number;
  contextSize?: number;
}

export async function createLangChainLLMClient(
  provider?: ProviderType,
  config?: ModelConfig
): Promise<{client: LangChainClient; actualProvider: ProviderType}> {
  // For this refactoring, we only focus on OpenAI-compatible APIs
  provider = provider || 'openai-compatible';
  
  // Validate that we're working with OpenAI-compatible provider
  if (provider !== 'openai-compatible' && provider !== 'openrouter') {
    throw new Error(`This refactoring only supports OpenAI-compatible APIs. Provider: ${provider}`);
  }
  
  // Get configuration from parameters or appConfig
  let modelConfig: ModelConfig;
  
  if (config) {
    // Use passed configuration
    modelConfig = config;
  } else if (provider === 'openai-compatible' && appConfig.openAICompatible) {
    // Use appConfig for openai-compatible
    modelConfig = {
      baseUrl: appConfig.openAICompatible.baseUrl,
      apiKey: appConfig.openAICompatible.apiKey,
      models: appConfig.openAICompatible.models,
      model: appConfig.openAICompatible.models?.[0],
      temperature: 0.7,
      contextSize: undefined
    };
  } else if (provider === 'openrouter' && appConfig.openRouter) {
    // Use appConfig for openrouter
    modelConfig = {
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: appConfig.openRouter.apiKey,
      models: appConfig.openRouter.models,
      model: appConfig.openRouter.models?.[0],
      temperature: 0.7,
      contextSize: undefined
    };
  } else {
    // Fallback defaults
    modelConfig = {
      baseUrl: 'http://localhost:11434/v1', // Default to Ollama's OpenAI API
      apiKey: 'ollama', // Dummy key for Ollama
      models: ['llama3'],
      model: 'llama3',
      temperature: 0.7,
      contextSize: undefined
    };
  }
  
  // Validate required configuration
  if (!modelConfig.baseUrl) {
    throw new Error("Base URL is required for OpenAI-compatible API");
  }
  
  // Set default model if not provided
  if (!modelConfig.model && modelConfig.models && modelConfig.models.length > 0) {
    modelConfig.model = modelConfig.models[0];
  }
  
  // Ensure we have a valid API key for the LangChain OpenAI client
  // For local APIs like Ollama, we can use any non-empty string as the API key
  // For OpenRouter, we need a real API key
  let apiKey = modelConfig.apiKey;
  if (!apiKey) {
    // For local APIs, use a dummy key
    if (modelConfig.baseUrl.includes('localhost') || modelConfig.baseUrl.includes('127.0.0.1')) {
      apiKey = "ollama"; // Dummy key for local APIs
    } else {
      // For remote APIs, check if we have an API key in environment variables
      if (provider === 'openai-compatible') {
        apiKey = process.env.OPENAI_API_KEY || "ollama"; // Fallback to dummy key
      } else if (provider === 'openrouter') {
        apiKey = process.env.OPENROUTER_API_KEY || ""; // OpenRouter requires a real key
      }
    }
  }
  
  // Create LangChain model - IMPORTANT: Use 'apiKey' not 'openAIApiKey'
  const model = new ChatOpenAI({
    modelName: modelConfig.model,
    apiKey: apiKey, // Correct parameter name
    temperature: modelConfig.temperature,
    configuration: {
      baseURL: modelConfig.baseUrl
    }
  });
  
  // Create client
  const client = new LangChainClient(provider, model, modelConfig.model, modelConfig.contextSize);
  
  // Initialize the client
  await client.initialize(modelConfig.baseUrl, modelConfig.apiKey);
  
  return { client, actualProvider: provider };
}
```

#### Step 3: Create Context Detector
```typescript
// source/langchain-tools/context-detector.ts
export class ContextDetector {
  static async detectContextWindow(baseUrl: string, model: string, apiKey?: string): Promise<number> {
    try {
      // Try to fetch model info from /v1/models endpoint
      const modelsResponse = await this.fetchModels(baseUrl, apiKey);
      if (modelsResponse) {
        const contextSize = this.extractContextFromModels(modelsResponse, model);
        if (contextSize) return contextSize;
      }
    } catch (error) {
      // Silently continue to estimation
    }
    
    // Fallback to estimation based on model name
    return this.estimateContextFromName(model);
  }

  private static async fetchModels(baseUrl: string, apiKey?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/v1/models`, { headers });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      // Silently fail
    }
    return null;
  }

  private static extractContextFromModels(modelsData: any, modelName: string): number | null {
    if (!modelsData?.data) return null;
    
    // Look for the specific model
    const model = modelsData.data.find((m: any) => 
      m.id === modelName || m.name === modelName
    );
    
    if (model?.context_length) {
      return model.context_length;
    }
    
    if (model?.max_context_length) {
      return model.max_context_length;
    }
    
    return null;
  }

  private static estimateContextFromName(modelName: string): number {
    const modelContextMap: Record<string, number> = {
      // GPT models
      'gpt-3.5-turbo': 16385,
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      
      // Llama models
      'llama3': 8192,
      'llama2': 4096,
      'mistral': 32768,
      'mixtral': 32768,
      
      // Default fallback
      'default': 4096
    };

    // Exact match
    if (modelContextMap[modelName]) {
      return modelContextMap[modelName];
    }

    // Partial match
    for (const [key, value] of Object.entries(modelContextMap)) {
      if (modelName.includes(key)) {
        return value;
      }
    }

    return 4096; // Safe default
  }
}
```

#### Step 4: Create Tool Detector
```typescript
// source/langchain-tools/tool-detector.ts
export class ToolDetector {
  static supportsNativeToolCalling(provider: string, model: string): boolean {
    // Known models that support native tool calling
    const nativeSupport = [
      'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'gpt-4o',
      'llama3', 'mistral', 'mixtral'
    ];
    
    // For OpenRouter, most models support tool calling
    if (provider === 'openrouter') return true;
    
    return nativeSupport.some(supportedModel => model.includes(supportedModel));
  }
}
```

#### Step 5: Create Manual Tool Handler
```typescript
// source/langchain-tools/manual-tool-handler.ts
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

export class ManualToolHandler {
  static async executeWithManualToolCalling(
    model: BaseChatModel,
    messages: any[],
    tools: any[]
  ): Promise<any> {
    // Create tool description prompt
    const toolDescriptions = tools.map(tool => 
      `${tool.function.name}: ${tool.function.description}
Parameters: ${JSON.stringify(tool.function.parameters)}`
    ).join('

');

    const toolPrompt = `You have access to the following tools:
${toolDescriptions}

` +
      `To use a tool, respond ONLY with a JSON object in this exact format:
` +
      `{"tool_call": {"name": "tool_name", "arguments": {"param1": "value1"}}}

` +
      `If you don't need to use any tools, respond normally to the user's request.`;

    // Add tool prompt to messages
    const enhancedMessages = [
      ...messages,
      new SystemMessage(toolPrompt)
    ];

    // Get initial response
    const response = await model.invoke(enhancedMessages);

    // Check if response contains tool call
    try {
      const parsedResponse = JSON.parse(response.content);
      if (parsedResponse.tool_call) {
        // Extract tool call and execute (this would integrate with your existing tool system)
        return await this.handleToolCall(model, messages, parsedResponse.tool_call, tools);
      }
    } catch (e) {
      // Not a tool call, return normal response
    }

    return response;
  }

  private static async handleToolCall(
    model: BaseChatModel,
    originalMessages: any[],
    toolCall: any,
    tools: any[]
  ): Promise<any> {
    // This would integrate with your existing tool execution system
    // For now, return a placeholder
    const toolResult = `Tool ${toolCall.name} executed with args: ${JSON.stringify(toolCall.arguments)}`;
    
    // Send tool result back to model
    const finalMessages = [
      ...originalMessages,
      new HumanMessage(`Tool result: ${toolResult}`)
    ];

    return await model.invoke(finalMessages);
  }
}
```

### Phase 2: LangChain Client Implementation (Week 2)

#### Step 6: Create LangChain Client
```typescript
// source/langchain-client.ts
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

    
    // Handle AIMessage instances
    if (chunk instanceof AIMessage) {
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
      // This is important for maintaining the streaming connection
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
```

### Phase 3: Integration (Week 3)

#### Step 7: Update Client Factory
```typescript
// source/client-factory.ts (updated)
import { appConfig } from './config/index.js';
import { loadPreferences } from './config/preferences.js';
import type { LLMClient, ProviderType } from './types/index.js';
import { existsSync } from 'fs';
import { join } from 'path';
import { createLangChainLLMClient } from './langchain-factory.js';

export async function createLLMClient(
  provider?: ProviderType,
): Promise<{client: LLMClient; actualProvider: ProviderType}> {
  // Check if agents.config.json exists
  const agentsJsonPath = join(process.cwd(), 'agents.config.json');
  const hasConfigFile = existsSync(agentsJsonPath);
  
  // If no provider specified, check user preferences (but only if config exists)
  if (!provider) {
    if (hasConfigFile) {
      const preferences = loadPreferences();
      provider = preferences.lastProvider || 'openai-compatible';
    } else {
      // No config file - force OpenAI-compatible only
      provider = 'openai-compatible';
    }
  }
  
  // If no config file exists but user requested non-supported provider, force OpenAI-compatible
  if (!hasConfigFile && provider !== 'openai-compatible' && provider !== 'openrouter') {
    provider = 'openai-compatible';
  }
  
  // Define available providers based on config file presence
  const allProviders: ProviderType[] = hasConfigFile 
    ? ['openai-compatible', 'openrouter']
    : ['openai-compatible'];
  
  // Put the requested provider first, then try others (if config exists)
  const tryOrder = hasConfigFile 
    ? [provider, ...allProviders.filter(p => p !== provider)]
    : ['openai-compatible'];
  
  const errors: string[] = [];

  // Try each provider in order
  for (const currentProvider of tryOrder as ProviderType[]) {
    try {
      // Only try OpenAI-compatible and OpenRouter providers
      if (currentProvider === 'openai-compatible' || currentProvider === 'openrouter') {
        // Pass configuration from appConfig to the LangChain factory
        let config;
        if (currentProvider === 'openai-compatible') {
          if (!appConfig.openAICompatible?.baseUrl) {
            throw new Error('OpenAI-compatible API requires baseUrl in config');
          }
          config = {
            baseUrl: appConfig.openAICompatible.baseUrl,
            apiKey: appConfig.openAICompatible.apiKey,
            models: appConfig.openAICompatible.models,
            model: appConfig.openAICompatible.models?.[0],
          };
        } else {
          // OpenRouter
          if (!appConfig.openRouter?.apiKey) {
            throw new Error('OpenRouter requires API key in config');
          }
          if (!appConfig.openRouter?.models || appConfig.openRouter.models.length === 0) {
            throw new Error('OpenRouter requires models array in config');
          }
          config = {
            baseUrl: "https://openrouter.ai/api/v1",
            apiKey: appConfig.openRouter.apiKey,
            models: appConfig.openRouter.models,
            model: appConfig.openRouter.models?.[0],
          };
        }
        
        const result = await createLangChainLLMClient(currentProvider, config);
        return result;
      }
    } catch (error: any) {
      const errorMsg = `${currentProvider}: ${error.message}`;
      errors.push(errorMsg);
    }
  }

  // If we get here, all providers failed
  let combinedError: string;
  
  if (!hasConfigFile) {
    // No config file - only tried OpenAI-compatible
    combinedError = `OpenAI-compatible API unavailable: ${errors[0]?.split(': ')[1] || 'Unknown error'}
` +
      `Please ensure your OpenAI-compatible API is running and configured properly.`;
  } else {
    // Config file exists - tried multiple providers
    combinedError = `All configured providers failed:
${errors.map(e => `• ${e}`).join('
')}

` +
      `Please check your provider configuration in agents.config.json`;
  }
  
  throw new Error(combinedError);
}
```

### Phase 4: Testing and Validation (Week 4)

#### Step 8: Create Test Configuration
Create a test `agents.config.json`:
```json
{
  "nanocoder": {
    "openAICompatible": {
      "baseUrl": "http://localhost:1234/v1",
      "apiKey": "lm-studio-key",
      "models": ["gpt-3.5-turbo"]
    },
    "openRouter": {
      "apiKey": "your-openrouter-key",
      "models": ["openai/gpt-3.5-turbo"]
    }
  }
}
```

#### Step 9: Test with Different Providers
1. **LM Studio**: Test with local model
2. **OpenRouter**: Test with cloud model
3. **Ollama** (OpenAI mode): Test with Ollama in OpenAI mode

#### Step 10: Validate Context Detection
1. Test automatic context detection with providers that support it
2. Test fallback estimation for providers that don't
3. Verify context size is correctly used in application

### Phase 5: Cleanup and Documentation (Week 5)

#### Step 11: Remove Old Files
Remove the old provider-specific client files:
- `source/ollama-client.ts`
- `source/openai-compatible-client.ts`
- `source/openrouter-client.ts`

#### Step 12: Update Documentation
1. Update README with new configuration instructions
2. Document supported providers
3. Explain context window detection
4. Provide migration guide

#### Step 13: Update Package Dependencies
Update `package.json` to remove unused dependencies:
```json
{
  "dependencies": {
    "@langchain/core": "^0.3.72",
    "@langchain/openai": "^0.6.9",
    // Remove ollama dependency if not used elsewhere
  }
}
```

## 4. Key Benefits of This Approach

1. **Focused Implementation**: Only implements what you need (OpenAI-compatible APIs)
2. **Automatic Context Detection**: Detects context window from API endpoints
3. **Smart Tool Calling**: Automatically uses native tool calling when available
4. **Single Codebase**: One implementation handles all OpenAI-compatible APIs
5. **Maintainability**: Leverages LangChain's robust implementation
6. **Extensibility**: Easy to add new OpenAI-compatible providers

## 5. Important Implementation Notes

### API Key Handling
The LangChain OpenAI client requires the API key to be passed as `apiKey` parameter, not `openAIApiKey`. This was a critical fix to prevent the "OPENAI_API_KEY environment variable is missing" error.

### Streaming Response Handling
The streaming implementation was carefully designed to:
1. **Deliver all chunks**: Even empty chunks are important for maintaining the streaming connection
2. **Preserve chunk structure**: All chunks must have the expected `message` and `done` properties
3. **Handle edge cases**: Properly handle different chunk types (AIMessage, strings, objects)

### Error Handling
Comprehensive error handling was implemented to provide clear error messages to users when:
1. Configuration is missing or invalid
2. API calls fail
3. Models are unavailable

## 6. Risk Mitigation

1. **Backward Compatibility**: Maintain old configuration format support temporarily
2. **Testing**: Extensive testing with LM Studio, OpenRouter, and other providers
3. **Fallback**: Safe defaults for context window detection
4. **Error Handling**: Comprehensive error handling and user-friendly messages
5. **Documentation**: Clear migration path for users

## 7. Timeline

1. **Week 1**: Foundation and core infrastructure
2. **Week 2**: LangChain client implementation
3. **Week 3**: Integration with existing application
4. **Week 4**: Testing and validation
5. **Week 5**: Cleanup, documentation, and release

This plan provides a clean, focused refactoring that replaces your custom LLM implementations with LangChain.js while maintaining all the functionality you need and adding intelligent context window detection.