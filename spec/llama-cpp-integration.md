# llama.cpp Integration Specification

## Overview

This specification outlines the integration of llama.cpp HTTP server support into the nanocoder application, providing users with the ability to connect to local or remote llama.cpp instances running on configurable ports (default 8080).

## Background

llama.cpp provides an OpenAI-compatible HTTP API server that can serve local GGUF models. This integration will allow users to run local inference using llama.cpp while maintaining consistency with the existing provider architecture.

## Architecture Analysis

### Current Provider Architecture

The nanocoder application uses a well-structured provider system with the following key components:

- **LLMClient Interface** (`source/types/core.ts:71`): Common interface all providers implement
- **Factory Pattern** (`source/client-factory.ts`): Provider creation and fallback logic
- **Provider Types** (`source/types/core.ts:50`): Union type defining available providers
- **Configuration System** (`source/types/config.ts`): Type definitions for provider configs
- **UI Components** (`source/components/provider-selector.tsx`): Provider selection interface

### Existing Providers

1. **OllamaClient** (`source/ollama-client.ts`): Local Ollama integration using native client
2. **OpenRouterClient** (`source/openrouter-client.ts`): OpenRouter API with authentication
3. **OpenAICompatibleClient** (`source/openai-compatible-client.ts`): Generic OpenAI-compatible API client

## llama.cpp API Capabilities

Based on research, llama.cpp provides:

- **OpenAI-compatible endpoints**: `/v1/chat/completions`, `/v1/models`
- **Default configuration**: Port 8080, no authentication required
- **Streaming support**: Server-Sent Events compatible with OpenAI API
- **Model management**: Dynamic model loading, context size detection
- **Tool calling**: Function calling support (limited compared to OpenAI)
- **Authentication**: Optional API key support
- **Multimodal support**: Image + text capabilities with appropriate models

## Implementation Strategy

The llama.cpp integration should leverage the existing `OpenAICompatibleClient` as a foundation, with specific adaptations for llama.cpp's characteristics.

### Option 1: Extend OpenAICompatibleClient (Recommended)

Create a specialized llama.cpp client that extends or wraps the existing `OpenAICompatibleClient` with llama.cpp-specific optimizations.

**Benefits:**
- Reuses existing OpenAI-compatible API handling
- Maintains consistency with established patterns
- Minimal code duplication
- Easier maintenance

**Implementation Details:**
```typescript
export class LlamaCppClient implements LLMClient {
  private baseClient: OpenAICompatibleClient;
  
  constructor(config: LlamaCppConfig) {
    this.baseClient = new OpenAICompatibleClient({
      baseUrl: config.baseUrl || 'http://localhost:8080',
      apiKey: config.apiKey, // optional
      models: config.models
    });
  }
  
  // Implement LLMClient interface by delegating to baseClient
  // with llama.cpp-specific optimizations
}
```

### Option 2: Standalone LlamaCppClient

Create a completely separate client implementation following the patterns from existing clients.

**Benefits:**
- Full control over implementation
- Can optimize specifically for llama.cpp features
- Clear separation of concerns

**Drawbacks:**
- Code duplication with OpenAICompatibleClient
- More maintenance overhead

## Detailed Implementation Plan

### 1. Type System Updates

#### 1.1 Update Provider Types (`source/types/core.ts`)

```typescript
export type ProviderType = 'ollama' | 'openrouter' | 'openai-compatible' | 'llama-cpp';
```

#### 1.2 Add Configuration Types (`source/types/config.ts`)

```typescript
export interface LlamaCppConfig {
  baseUrl?: string; // default: 'http://localhost:8080'
  apiKey?: string; // optional API key
  models?: string[]; // optional predefined models list
  timeout?: number; // request timeout in ms
  maxRetries?: number; // retry attempts for failed requests
}

export interface AppConfig {
  nanocoder: {
    ollama?: OllamaConfig;
    openRouter?: OpenRouterConfig;
    openAICompatible?: OpenAICompatibleConfig;
    llamaCpp?: LlamaCppConfig; // new addition
  };
}
```

### 2. Client Implementation

#### 2.1 Create LlamaCppClient (`source/llama-cpp-client.ts`)

```typescript
import { LLMClient, Message, Tool } from './types/core.js';
import { LlamaCppConfig } from './types/config.js';
import { logError } from './config/logging.js';

export class LlamaCppClient implements LLMClient {
  private currentModel: string = '';
  private config: Required<LlamaCppConfig>;
  private contextSize: number = 4096; // default, will be detected
  
  constructor(config: LlamaCppConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8080',
      apiKey: config.apiKey || '',
      models: config.models || [],
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3
    };
  }

  async initialize(): Promise<void> {
    try {
      // Check server health
      await this.checkServerHealth();
      
      // Get available models and set default
      const models = await this.getAvailableModels();
      if (models.length > 0 && !this.currentModel) {
        this.currentModel = models[0];
      }
      
      // Detect context size for current model
      await this.detectContextSize();
    } catch (error) {
      logError('Failed to initialize LlamaCpp client', error);
      throw error;
    }
  }

  private async checkServerHealth(): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/health`, {
      method: 'GET',
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.config.timeout)
    });
    
    if (!response.ok) {
      throw new Error(`llama.cpp server health check failed: ${response.status}`);
    }
  }

  private async detectContextSize(): Promise<void> {
    // Try to get model info from /v1/models endpoint
    try {
      const models = await this.fetchModelsInfo();
      const currentModelInfo = models.find(m => 
        m.id === this.currentModel || m.model === this.currentModel
      );
      
      if (currentModelInfo?.context_length) {
        this.contextSize = currentModelInfo.context_length;
      }
    } catch (error) {
      logError('Could not detect context size, using default', error);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }
    
    return headers;
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const models = await this.fetchModelsInfo();
      return models.map(model => model.id || model.model).filter(Boolean);
    } catch (error) {
      logError('Failed to fetch models from llama.cpp', error);
      return this.config.models; // fallback to configured models
    }
  }

  private async fetchModelsInfo(): Promise<any[]> {
    const response = await fetch(`${this.config.baseUrl}/v1/models`, {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Models fetch failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getContextSize(): number {
    return this.contextSize;
  }

  async chat(messages: Message[], tools: Tool[]): Promise<any> {
    const requestBody = {
      model: this.currentModel,
      messages: this.formatMessages(messages),
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      stream: false
    };

    const response = await this.makeRequest('/v1/chat/completions', requestBody);
    return response;
  }

  async *chatStream(messages: Message[], tools: Tool[]): AsyncIterable<any> {
    const requestBody = {
      model: this.currentModel,
      messages: this.formatMessages(messages),
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      stream: true
    };

    const response = await fetch(`${this.config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(this.config.timeout)
    });

    if (!response.ok) {
      throw new Error(`Chat stream request failed: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolCalls: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              // Handle tool calls accumulation
              if (parsed.choices?.[0]?.delta?.tool_calls) {
                this.accumulateToolCalls(toolCalls, parsed.choices[0].delta.tool_calls);
              }
              
              yield parsed;
            } catch (error) {
              logError('Failed to parse streaming response', error);
            }
          }
        }
      }

      // Yield final response with complete tool calls
      if (toolCalls.length > 0) {
        yield {
          choices: [{
            delta: { tool_calls: toolCalls },
            finish_reason: 'tool_calls'
          }]
        };
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async makeRequest(endpoint: string, body: any): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.config.timeout)
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    
    throw lastError;
  }

  private formatMessages(messages: Message[]): any[] {
    // Convert internal message format to OpenAI format
    // Handle tool result messages like other clients
    return messages
      .filter(msg => msg.role !== 'tool') // Filter out tool results
      .map(msg => {
        if (msg.role === 'tool') {
          // Convert tool results to user messages for compatibility
          return {
            role: 'user',
            content: `Tool result: ${msg.content}`
          };
        }
        return {
          role: msg.role,
          content: msg.content,
          tool_calls: msg.tool_calls
        };
      });
  }

  private accumulateToolCalls(accumulated: any[], newCalls: any[]): void {
    // Implement tool call accumulation logic similar to other clients
    for (const newCall of newCalls) {
      const existingIndex = accumulated.findIndex(call => call.index === newCall.index);
      
      if (existingIndex >= 0) {
        // Merge with existing call
        const existing = accumulated[existingIndex];
        if (newCall.function?.arguments) {
          existing.function.arguments += newCall.function.arguments;
        }
      } else {
        // Add new call
        accumulated.push({
          index: newCall.index,
          id: newCall.id,
          type: 'function',
          function: {
            name: newCall.function?.name || '',
            arguments: newCall.function?.arguments || ''
          }
        });
      }
    }
  }

  async clearContext(): Promise<void> {
    // llama.cpp doesn't have explicit context clearing
    // This is a no-op, but could potentially restart conversation
    // or call a specific endpoint if llama.cpp provides one
  }
}
```

### 3. Factory Integration

#### 3.1 Update Client Factory (`source/client-factory.ts`)

Add llama.cpp support to the factory pattern:

```typescript
import { LlamaCppClient } from './llama-cpp-client.js';

// Add to createClient function
async function createClient(
  requestedProvider: ProviderType,
  config?: AppConfig
): Promise<{ client: LLMClient; provider: ProviderType; errors: string[] }> {
  // ... existing code ...
  
  // Add llama-cpp to provider attempts
  const providerAttempts: ProviderType[] = [requestedProvider];
  if (config) {
    // Add other providers as fallbacks
    const otherProviders: ProviderType[] = ['ollama', 'openrouter', 'openai-compatible', 'llama-cpp']
      .filter(p => p !== requestedProvider);
    providerAttempts.push(...otherProviders);
  }

  // Add createLlamaCppClient function
  async function createLlamaCppClient(): Promise<LLMClient> {
    const llamaCppConfig = config?.nanocoder?.llamaCpp || {};
    
    // Validate base URL is accessible
    try {
      const testUrl = llamaCppConfig.baseUrl || 'http://localhost:8080';
      const response = await fetch(`${testUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) {
        throw new Error(`llama.cpp server not accessible at ${testUrl}`);
      }
    } catch (error) {
      throw new Error(`llama.cpp connection failed: ${error.message}`);
    }

    const client = new LlamaCppClient(llamaCppConfig);
    await client.initialize();
    return client;
  }

  // Add to the provider creation switch/if statements
  if (provider === 'llama-cpp') {
    try {
      const client = await createLlamaCppClient();
      return { client, provider: 'llama-cpp', errors };
    } catch (error) {
      const errorMsg = `llama.cpp: ${error.message}. Ensure llama.cpp server is running at the configured URL (default: http://localhost:8080).`;
      errors.push(errorMsg);
    }
  }
}
```

### 4. Configuration Updates

#### 4.1 Update Configuration Schema (`agents.config.example.json`)

```json
{
  "nanocoder": {
    "openRouter": {
      "apiKey": "your-openrouter-api-key-here",
      "models": ["openai/gpt-4o-mini", "anthropic/claude-3-haiku"]
    },
    "openAICompatible": {
      "baseUrl": "http://localhost:1234",
      "apiKey": "optional-api-key-here",
      "models": ["local-model-1", "local-model-2"]
    },
    "llamaCpp": {
      "baseUrl": "http://localhost:8080",
      "apiKey": "",
      "models": [],
      "timeout": 30000,
      "maxRetries": 3
    }
  }
}
```

#### 4.2 Update Configuration Loader (`source/config/index.ts`)

Ensure the configuration loader properly handles the new `llamaCpp` configuration section.

### 5. UI Updates

#### 5.1 Update Provider Selector (`source/components/provider-selector.tsx`)

Add llama.cpp to the provider options:

```typescript
const providerOptions = [
  { value: 'ollama', label: 'Ollama' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'openai-compatible', label: 'OpenAI Compatible' },
  { value: 'llama-cpp', label: 'llama.cpp' } // new addition
];
```

#### 5.2 Update Provider Commands (`source/commands/provider.ts`)

Ensure the provider switching command recognizes 'llama-cpp' as a valid option.

### 6. Error Handling and Validation

#### 6.1 Connection Validation

The client should validate:
- Server accessibility at the configured URL
- API compatibility (validate `/v1/models` endpoint exists)
- Model availability
- Optional authentication if configured

#### 6.2 Graceful Degradation

- If model detection fails, fall back to configured models list
- If context size detection fails, use reasonable default
- Provide clear error messages for common issues (server not running, wrong port, etc.)

#### 6.3 User Guidance

Provide helpful error messages that guide users to:
- Start their llama.cpp server: `llama-server -m model.gguf --port 8080`
- Check server status at `http://localhost:8080`
- Configure alternative ports or remote servers
- Verify model loading and availability

## Testing Strategy

### 6.1 Unit Tests

- Test LlamaCppClient initialization and configuration
- Test message formatting and tool call handling
- Test error handling and retry logic
- Mock HTTP responses for reliable testing

### 6.2 Integration Tests

- Test with actual llama.cpp server instance
- Verify OpenAI API compatibility
- Test streaming functionality
- Validate tool calling (if supported by model)

### 6.3 User Acceptance Testing

- Test typical user workflows
- Verify configuration options work as expected
- Test error scenarios and user guidance
- Validate UI integration

## Documentation Updates

### 6.1 README Updates

Add llama.cpp setup instructions:
```markdown
### llama.cpp

1. Install and compile llama.cpp
2. Download a GGUF model
3. Start the server: `llama-server -m model.gguf --port 8080`
4. Configure nanocoder in `agents.config.json`
```

### 6.2 Configuration Documentation

Document llama.cpp-specific configuration options and their defaults.

## Migration and Backward Compatibility

- The integration is purely additive - no existing functionality is affected
- Existing configurations will continue to work unchanged
- Users can gradually adopt llama.cpp alongside other providers

## Performance Considerations

### 6.1 Connection Pooling

Consider implementing connection pooling for high-frequency requests to the same llama.cpp instance.

### 6.2 Request Batching

If llama.cpp supports request batching, implement it to improve throughput.

### 6.3 Caching

Cache model information and context size detection results to reduce startup overhead.

## Security Considerations

### 6.1 Network Security

- Default to localhost to prevent accidental exposure
- Support HTTPS for remote instances
- Validate URL formats to prevent injection attacks

### 6.2 Authentication

- Support optional API key authentication
- Secure storage of credentials in configuration
- No credentials logging or exposure

## Future Enhancements

### 6.1 Advanced Features

- Support for llama.cpp-specific features (mirostat, etc.)
- Multimodal capabilities integration
- Model hot-swapping
- Performance metrics reporting

### 6.2 Management Features

- Automatic model discovery
- Server health monitoring
- Resource usage tracking
- Load balancing across multiple llama.cpp instances

## Implementation Checklist

- [ ] Create `LlamaCppConfig` interface in `source/types/config.ts`
- [ ] Add 'llama-cpp' to `ProviderType` union in `source/types/core.ts`
- [ ] Implement `LlamaCppClient` class in `source/llama-cpp-client.ts`
- [ ] Update `client-factory.ts` with llama.cpp support
- [ ] Add llama.cpp option to `provider-selector.tsx`
- [ ] Update `agents.config.example.json` with llama.cpp configuration
- [ ] Update provider command in `source/commands/provider.ts`
- [ ] Add error handling and user guidance
- [ ] Write unit tests for LlamaCppClient
- [ ] Write integration tests
- [ ] Update documentation
- [ ] Test with real llama.cpp server instances

## Advanced Technical Considerations

### 7.1 llama.cpp-Specific API Endpoints

Beyond the standard OpenAI endpoints, llama.cpp provides additional endpoints that can be leveraged:

#### Extended Endpoint Support

```typescript
interface LlamaCppExtendedAPI {
  // Model management endpoints
  '/props': () => Promise<ModelProperties>; // Get model properties
  '/tokenize': (text: string) => Promise<TokenizeResponse>; // Tokenize text
  '/detokenize': (tokens: number[]) => Promise<string>; // Convert tokens back to text
  '/embedding': (input: string) => Promise<EmbeddingResponse>; // Generate embeddings
  
  // Server status and health
  '/health': () => Promise<HealthResponse>; // Server health check
  '/metrics': () => Promise<MetricsResponse>; // Performance metrics
  '/slots': () => Promise<SlotStatus[]>; // Active processing slots
  
  // Model loading and management
  '/completion': (params: CompletionParams) => Promise<CompletionResponse>; // Raw completion
  '/infill': (params: InfillParams) => Promise<InfillResponse>; // Code infill
}
```

#### Enhanced Client with Extended API Support

```typescript
export class EnhancedLlamaCppClient extends LlamaCppClient {
  async getModelProperties(): Promise<ModelProperties> {
    const response = await fetch(`${this.config.baseUrl}/props`, {
      headers: this.getHeaders()
    });
    return response.json();
  }

  async tokenizeText(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.baseUrl}/tokenize`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content: text })
    });
    const result = await response.json();
    return result.tokens;
  }

  async getEmbedding(input: string): Promise<number[]> {
    const response = await fetch(`${this.config.baseUrl}/embedding`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ content: input })
    });
    const result = await response.json();
    return result.embedding;
  }

  async getServerMetrics(): Promise<MetricsResponse> {
    const response = await fetch(`${this.config.baseUrl}/metrics`, {
      headers: this.getHeaders()
    });
    return response.json();
  }
}
```

### 7.2 Configuration Schema Validation

Implement comprehensive configuration validation with JSON Schema:

```typescript
export const llamaCppConfigSchema = {
  type: 'object',
  properties: {
    baseUrl: {
      type: 'string',
      pattern: '^https?://[^\\s]+$',
      default: 'http://localhost:8080'
    },
    apiKey: {
      type: 'string',
      description: 'Optional API key for authentication'
    },
    models: {
      type: 'array',
      items: { type: 'string' },
      description: 'Predefined models list'
    },
    timeout: {
      type: 'number',
      minimum: 1000,
      maximum: 300000,
      default: 30000
    },
    maxRetries: {
      type: 'number',
      minimum: 0,
      maximum: 10,
      default: 3
    },
    // Advanced llama.cpp specific options
    sampling: {
      type: 'object',
      properties: {
        temperature: { type: 'number', minimum: 0, maximum: 2, default: 0.8 },
        topP: { type: 'number', minimum: 0, maximum: 1, default: 0.95 },
        topK: { type: 'number', minimum: 1, maximum: 100, default: 40 },
        repeatPenalty: { type: 'number', minimum: 0, maximum: 2, default: 1.1 },
        mirostat: { type: 'number', enum: [0, 1, 2], default: 0 },
        mirostatTau: { type: 'number', minimum: 0, maximum: 10, default: 5.0 },
        mirostatEta: { type: 'number', minimum: 0, maximum: 1, default: 0.1 }
      }
    },
    performance: {
      type: 'object',
      properties: {
        nThreads: { type: 'number', minimum: 1, maximum: 32, default: 4 },
        nGpuLayers: { type: 'number', minimum: 0, maximum: 999, default: 0 },
        useMmap: { type: 'boolean', default: true },
        useMlock: { type: 'boolean', default: false },
        nCtx: { type: 'number', minimum: 512, maximum: 131072, default: 4096 }
      }
    }
  },
  required: [],
  additionalProperties: false
};
```

### 7.3 Comprehensive Error Handling Matrix

#### Error Classification and Recovery Strategies

```typescript
export enum LlamaCppErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  CONTEXT_OVERFLOW = 'CONTEXT_OVERFLOW',
  SERVER_OVERLOADED = 'SERVER_OVERLOADED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  STREAMING_ERROR = 'STREAMING_ERROR'
}

export class LlamaCppErrorHandler {
  static classifyError(error: Error, response?: Response): LlamaCppErrorType {
    if (!response) {
      if (error.name === 'AbortError') return LlamaCppErrorType.TIMEOUT_ERROR;
      if (error.message.includes('fetch')) return LlamaCppErrorType.CONNECTION_ERROR;
      return LlamaCppErrorType.CONNECTION_ERROR;
    }

    switch (response.status) {
      case 401: case 403: return LlamaCppErrorType.AUTHENTICATION_ERROR;
      case 404: return LlamaCppErrorType.MODEL_NOT_FOUND;
      case 413: return LlamaCppErrorType.CONTEXT_OVERFLOW;
      case 429: case 503: return LlamaCppErrorType.SERVER_OVERLOADED;
      case 400: return LlamaCppErrorType.INVALID_REQUEST;
      default: return LlamaCppErrorType.CONNECTION_ERROR;
    }
  }

  static getRecoveryStrategy(errorType: LlamaCppErrorType): RecoveryStrategy {
    const strategies: Record<LlamaCppErrorType, RecoveryStrategy> = {
      [LlamaCppErrorType.CONNECTION_ERROR]: {
        retry: true,
        backoff: 'exponential',
        maxRetries: 3,
        userMessage: 'Connection failed. Check if llama.cpp server is running.'
      },
      [LlamaCppErrorType.AUTHENTICATION_ERROR]: {
        retry: false,
        userMessage: 'Authentication failed. Check your API key configuration.'
      },
      [LlamaCppErrorType.MODEL_NOT_FOUND]: {
        retry: false,
        fallbackAction: 'use_first_available_model',
        userMessage: 'Model not found. Switching to first available model.'
      },
      [LlamaCppErrorType.CONTEXT_OVERFLOW]: {
        retry: true,
        fallbackAction: 'truncate_context',
        userMessage: 'Context too long. Truncating conversation history.'
      },
      [LlamaCppErrorType.SERVER_OVERLOADED]: {
        retry: true,
        backoff: 'exponential',
        maxRetries: 5,
        userMessage: 'Server overloaded. Retrying with backoff.'
      },
      [LlamaCppErrorType.INVALID_REQUEST]: {
        retry: false,
        userMessage: 'Invalid request format. Check tool definitions.'
      },
      [LlamaCppErrorType.TIMEOUT_ERROR]: {
        retry: true,
        maxRetries: 2,
        userMessage: 'Request timed out. Retrying with longer timeout.'
      },
      [LlamaCppErrorType.STREAMING_ERROR]: {
        retry: true,
        fallbackAction: 'use_non_streaming',
        userMessage: 'Streaming failed. Falling back to non-streaming mode.'
      }
    };
    
    return strategies[errorType];
  }
}
```

### 7.4 Production Deployment Considerations

#### Container Deployment with Docker Compose

```yaml
# docker-compose.yml for llama.cpp deployment
version: '3.8'
services:
  llama-cpp:
    image: ghcr.io/ggerganov/llama.cpp:server
    ports:
      - "8080:8080"
    volumes:
      - ./models:/models
      - ./cache:/cache
    command: >
      --server 
      --host 0.0.0.0 
      --port 8080
      --model /models/your-model.gguf
      --ctx-size 4096
      --threads 4
      --gpu-layers 32
    environment:
      - LLAMA_CACHE_DIR=/cache
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nanocoder:
    image: nanocoder:latest
    depends_on:
      - llama-cpp
    volumes:
      - ./agents.config.json:/app/agents.config.json
    environment:
      - NANOCODER_LLAMA_CPP_URL=http://llama-cpp:8080
```

#### Kubernetes Deployment Manifest

```yaml
# k8s-llama-cpp.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: llama-cpp-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: llama-cpp
  template:
    metadata:
      labels:
        app: llama-cpp
    spec:
      containers:
      - name: llama-cpp
        image: ghcr.io/ggerganov/llama.cpp:server
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "4Gi"
            cpu: "2"
            nvidia.com/gpu: "1"
          limits:
            memory: "8Gi"
            cpu: "4"
            nvidia.com/gpu: "1"
        volumeMounts:
        - name: models
          mountPath: /models
        - name: cache
          mountPath: /cache
        env:
        - name: CUDA_VISIBLE_DEVICES
          value: "0"
        command: ["./llama-server"]
        args:
          - "--host=0.0.0.0"
          - "--port=8080"
          - "--model=/models/model.gguf"
          - "--ctx-size=4096"
          - "--gpu-layers=32"
      volumes:
      - name: models
        persistentVolumeClaim:
          claimName: llama-models-pvc
      - name: cache
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: llama-cpp-service
spec:
  selector:
    app: llama-cpp
  ports:
  - port: 8080
    targetPort: 8080
  type: ClusterIP
```

### 7.5 Monitoring and Observability

#### Health Check and Monitoring Implementation

```typescript
export class LlamaCppMonitor {
  private client: LlamaCppClient;
  private metrics: Map<string, number> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(client: LlamaCppClient) {
    this.client = client;
  }

  startHealthMonitoring(intervalMs: number = 30000): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.checkHealth();
        this.updateMetrics(health);
      } catch (error) {
        logError('Health check failed', error);
        this.metrics.set('health_check_failures', 
          (this.metrics.get('health_check_failures') || 0) + 1);
      }
    }, intervalMs);
  }

  stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.client.config.baseUrl}/health`, {
        headers: this.client.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });

      const responseTime = Date.now() - startTime;
      this.metrics.set('response_time', responseTime);
      this.metrics.set('last_health_check', Date.now());

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        status: 'healthy',
        responseTime,
        serverInfo: data
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async getServerMetrics(): Promise<ServerMetrics> {
    try {
      const response = await fetch(`${this.client.config.baseUrl}/metrics`, {
        headers: this.client.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`Metrics fetch failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      logError('Failed to fetch server metrics', error);
      return {};
    }
  }

  getClientMetrics(): ClientMetrics {
    return {
      totalRequests: this.metrics.get('total_requests') || 0,
      successfulRequests: this.metrics.get('successful_requests') || 0,
      failedRequests: this.metrics.get('failed_requests') || 0,
      averageResponseTime: this.metrics.get('avg_response_time') || 0,
      lastHealthCheck: this.metrics.get('last_health_check') || 0,
      healthCheckFailures: this.metrics.get('health_check_failures') || 0
    };
  }

  private updateMetrics(health: HealthStatus): void {
    this.metrics.set('response_time', health.responseTime);
    if (health.status === 'healthy') {
      this.metrics.set('consecutive_failures', 0);
    } else {
      this.metrics.set('consecutive_failures', 
        (this.metrics.get('consecutive_failures') || 0) + 1);
    }
  }
}
```

### 7.6 Performance Optimization Strategies

#### Connection Pool Implementation

```typescript
export class LlamaCppConnectionPool {
  private connections: Map<string, Connection[]> = new Map();
  private config: PoolConfig;

  constructor(config: PoolConfig) {
    this.config = {
      maxConnections: 5,
      maxIdleTime: 300000, // 5 minutes
      connectionTimeout: 10000,
      ...config
    };
  }

  async getConnection(baseUrl: string): Promise<Connection> {
    const poolKey = baseUrl;
    let pool = this.connections.get(poolKey);

    if (!pool) {
      pool = [];
      this.connections.set(poolKey, pool);
    }

    // Find available connection
    const available = pool.find(conn => 
      !conn.inUse && Date.now() - conn.lastUsed < this.config.maxIdleTime
    );

    if (available) {
      available.inUse = true;
      return available;
    }

    // Create new connection if under limit
    if (pool.length < this.config.maxConnections) {
      const connection = await this.createConnection(baseUrl);
      pool.push(connection);
      return connection;
    }

    // Wait for available connection
    return this.waitForConnection(poolKey);
  }

  releaseConnection(connection: Connection): void {
    connection.inUse = false;
    connection.lastUsed = Date.now();
  }

  private async createConnection(baseUrl: string): Promise<Connection> {
    // Implement connection creation logic
    return {
      id: crypto.randomUUID(),
      baseUrl,
      inUse: true,
      lastUsed: Date.now(),
      created: Date.now()
    };
  }

  private async waitForConnection(poolKey: string): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection pool timeout'));
      }, this.config.connectionTimeout);

      const checkAvailable = () => {
        const pool = this.connections.get(poolKey);
        const available = pool?.find(conn => !conn.inUse);
        
        if (available) {
          clearTimeout(timeout);
          available.inUse = true;
          resolve(available);
        } else {
          setTimeout(checkAvailable, 100);
        }
      };

      checkAvailable();
    });
  }
}
```

### 7.7 Advanced Testing Scenarios

#### Comprehensive Test Suite Structure

```typescript
// Test scenarios covering edge cases and production scenarios
describe('LlamaCppClient Advanced Tests', () => {
  describe('Connection Management', () => {
    test('handles server restarts gracefully', async () => {
      // Test scenario where server restarts mid-conversation
    });

    test('recovers from network partitions', async () => {
      // Test network partition recovery
    });

    test('handles concurrent request limits', async () => {
      // Test behavior under high concurrent load
    });
  });

  describe('Model Management', () => {
    test('switches models dynamically', async () => {
      // Test model hot-swapping
    });

    test('handles model loading failures', async () => {
      // Test graceful handling of model loading errors
    });

    test('detects context size changes', async () => {
      // Test context size detection for different models
    });
  });

  describe('Streaming Edge Cases', () => {
    test('handles malformed streaming responses', async () => {
      // Test malformed SSE handling
    });

    test('recovers from streaming interruptions', async () => {
      // Test streaming interruption recovery
    });

    test('handles large streaming responses', async () => {
      // Test memory management with large streams
    });
  });

  describe('Tool Calling Integration', () => {
    test('accumulates tool calls correctly', async () => {
      // Test tool call accumulation logic
    });

    test('handles partial tool call responses', async () => {
      // Test incomplete tool call handling
    });

    test('validates tool call arguments', async () => {
      // Test tool argument validation
    });
  });

  describe('Performance Tests', () => {
    test('maintains performance under load', async () => {
      // Load testing scenarios
    });

    test('memory usage remains stable', async () => {
      // Memory leak detection
    });

    test('connection pooling works correctly', async () => {
      // Connection pool efficiency tests
    });
  });
});
```

### 7.8 Migration and Compatibility

#### Migration Guide for Existing Users

```markdown
# Migration Guide: Adding llama.cpp Support

## For New Installations
1. Add llama.cpp configuration to `agents.config.json`
2. Start llama.cpp server
3. Select "llama.cpp" provider in nanocoder

## For Existing Users
1. **Backup current configuration**: `cp agents.config.json agents.config.backup.json`
2. **Update configuration schema**: Add llamaCpp section to config
3. **Test integration**: Verify llama.cpp server connectivity
4. **Gradual adoption**: Use alongside existing providers

## Configuration Migration
```json
// Before (existing config remains unchanged)
{
  "nanocoder": {
    "openRouter": { ... },
    "openAICompatible": { ... }
  }
}

// After (additive changes only)
{
  "nanocoder": {
    "openRouter": { ... },
    "openAICompatible": { ... },
    "llamaCpp": {
      "baseUrl": "http://localhost:8080",
      "models": ["your-model-name"]
    }
  }
}
```

## Compatibility Matrix
| Feature | Ollama | OpenRouter | OpenAI Compatible | llama.cpp |
|---------|--------|------------|-------------------|-----------|
| Chat Completions | ✅ | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ | ✅ |
| Tool Calling | ⚠️ | ✅ | ✅ | ⚠️ |
| Model Switching | ✅ | ✅ | ✅ | ✅ |
| Context Detection | ✅ | ✅ | ✅ | ✅ |
| Authentication | ❌ | ✅ | ⚠️ | ⚠️ |
| Multimodal | ⚠️ | ✅ | ⚠️ | ✅ |

**Legend**: ✅ Full Support, ⚠️ Partial/Model Dependent, ❌ Not Supported
```

### 7.9 Troubleshooting Guide

#### Common Issues and Solutions

```typescript
export const troubleshootingGuide = {
  'CONNECTION_REFUSED': {
    description: 'Cannot connect to llama.cpp server',
    causes: [
      'Server not running',
      'Wrong port configuration',
      'Firewall blocking connection'
    ],
    solutions: [
      'Start llama.cpp server: `llama-server -m model.gguf --port 8080`',
      'Check port configuration in agents.config.json',
      'Verify server health: `curl http://localhost:8080/health`',
      'Check firewall rules for port 8080'
    ],
    diagnosticCommands: [
      'ps aux | grep llama-server',
      'netstat -ln | grep 8080',
      'curl -v http://localhost:8080/health'
    ]
  },
  
  'MODEL_NOT_FOUND': {
    description: 'Specified model is not available',
    causes: [
      'Model not loaded on server',
      'Incorrect model name',
      'Model loading failed'
    ],
    solutions: [
      'Check available models: `curl http://localhost:8080/v1/models`',
      'Restart server with correct model path',
      'Verify model file exists and is valid GGUF format',
      'Check server logs for model loading errors'
    ]
  },
  
  'CONTEXT_OVERFLOW': {
    description: 'Context size exceeded',
    causes: [
      'Conversation too long',
      'Large tool responses',
      'Context size misconfiguration'
    ],
    solutions: [
      'Clear conversation history with `/clear` command',
      'Increase context size: `llama-server --ctx-size 8192`',
      'Enable automatic context truncation in client',
      'Split large requests into smaller chunks'
    ]
  },
  
  'AUTHENTICATION_FAILED': {
    description: 'API key authentication failed',
    causes: [
      'Invalid API key',
      'Server not configured for authentication',
      'API key format incorrect'
    ],
    solutions: [
      'Verify API key in agents.config.json',
      'Check server authentication configuration',
      'Remove apiKey field if server doesn\'t require auth',
      'Restart server with --api-key parameter'
    ]
  },
  
  'STREAMING_ERRORS': {
    description: 'Streaming responses failing',
    causes: [
      'Network interruption',
      'Server overload',
      'Client-side timeout'
    ],
    solutions: [
      'Check network stability',
      'Increase timeout in configuration',
      'Reduce concurrent requests',
      'Fall back to non-streaming mode'
    ]
  }
};

export function diagnoseIssue(error: Error, response?: Response): DiagnosticResult {
  const errorType = LlamaCppErrorHandler.classifyError(error, response);
  const guide = troubleshootingGuide[errorType];
  
  return {
    errorType,
    description: guide?.description || 'Unknown error',
    possibleCauses: guide?.causes || [],
    recommendedSolutions: guide?.solutions || [],
    diagnosticCommands: guide?.diagnosticCommands || [],
    recoveryStrategy: LlamaCppErrorHandler.getRecoveryStrategy(errorType)
  };
}
```

## Conclusion

This integration strategy leverages the existing architecture while providing comprehensive llama.cpp support. The implementation follows established patterns, ensuring consistency and maintainability. The modular approach allows for future enhancements while maintaining backward compatibility.

The key advantage is reusing the robust OpenAI-compatible API handling infrastructure while adding llama.cpp-specific optimizations and error handling. This approach minimizes code duplication and leverages the proven patterns from existing provider integrations.

The enhanced specification now includes production-ready considerations, comprehensive error handling, monitoring capabilities, and detailed troubleshooting guidance to ensure robust deployment and operation in various environments.