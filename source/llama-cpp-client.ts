import { LLMClient, Message, Tool } from './types/core.js';
import { AppConfig } from './types/config.js';
import { logError } from './utils/message-queue.js';

export class LlamaCppClient implements LLMClient {
  private currentModel: string = '';
  private baseUrl: string;
  private apiKey?: string;
  private models: string[];
  private timeout: number;
  private maxRetries: number;
  private contextSize: number = 4096;

  constructor(config: AppConfig['llamaCpp'] = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:8080';
    this.apiKey = config.apiKey;
    this.models = config.models || [];
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
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
      
      // Try to detect context size
      await this.detectContextSize();
    } catch (error) {
      logError(`Failed to initialize LlamaCpp client: ${(error as Error).message}`);
      throw error;
    }
  }

  private async checkServerHealth(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`llama.cpp server health check failed: ${response.status}`);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('llama.cpp server health check timed out');
      }
      throw error as Error;
    }
  }

  private async detectContextSize(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/props`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout)
      });
      
      if (response.ok) {
        const props = await response.json();
        if (props.default_generation_settings?.n_ctx) {
          this.contextSize = props.default_generation_settings.n_ctx;
        }
      }
    } catch (error) {
      // Context size detection is not critical, use default
      logError(`Could not detect context size, using default: ${(error as Error).message}`);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.timeout)
      });

      if (!response.ok) {
        throw new Error(`Models fetch failed: ${response.status}`);
      }

      const data = await response.json();
      const modelList = data.data || [];
      const modelNames = modelList.map((model: any) => model.id || model.model).filter(Boolean);
      
      return modelNames.length > 0 ? modelNames : this.models;
    } catch (error) {
      logError(`Failed to fetch models from llama.cpp: ${(error as Error).message}`);
      return this.models;
    }
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

    return await this.makeRequest('/v1/chat/completions', requestBody);
  }

  async *chatStream(messages: Message[], tools: Tool[]): AsyncIterable<any> {
    const requestBody = {
      model: this.currentModel,
      messages: this.formatMessages(messages),
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      stream: true
    };

    // Create an abort controller that we can reset on each chunk
    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | undefined;
    
    const resetTimeout = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        controller.abort();
      }, this.timeout);
    };
    
    resetTimeout(); // Initial timeout
    const startTime = Date.now(); // Track elapsed time

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Chat stream request failed: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolCalls: any[] = [];
    let tokenCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Reset timeout since we received data
        resetTimeout();

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            if (data === '') continue;

            try {
              const parsed = JSON.parse(data);
              
              // Handle tool calls accumulation
              if (parsed.choices?.[0]?.delta?.tool_calls) {
                this.accumulateToolCalls(toolCalls, parsed.choices[0].delta.tool_calls);
              }
              
              // Transform to nanocoder's expected format
              if (parsed.choices?.[0]?.delta?.content) {
                // Count tokens (rough estimation: ~4 chars per token)
                const content = parsed.choices[0].delta.content;
                tokenCount += Math.ceil(content.length / 4);
                
                const elapsedMs = Date.now() - startTime;
                const tokensPerSecond = elapsedMs > 0 ? (tokenCount / elapsedMs) * 1000 : 0;
                
                yield {
                  message: {
                    content: content,
                  },
                  done: false,
                  elapsed_ms: elapsedMs,
                  tokens_per_second: Math.round(tokensPerSecond * 10) / 10,
                  token_count: tokenCount,
                };
              } else if (parsed.choices?.[0]?.finish_reason) {
                // This is the final chunk, don't yield it yet as we'll yield tool calls separately
                continue;
              } else {
                // For other chunks (like role), yield a minimal response
                const elapsedMs = Date.now() - startTime;
                const tokensPerSecond = elapsedMs > 0 ? (tokenCount / elapsedMs) * 1000 : 0;
                
                yield {
                  message: { content: '' },
                  done: false,
                  elapsed_ms: elapsedMs,
                  tokens_per_second: Math.round(tokensPerSecond * 10) / 10,
                  token_count: tokenCount,
                };
              }
            } catch (error) {
              logError(`Failed to parse streaming response: ${(error as Error).message}`);
            }
          }
        }
      }

      // Yield final response with complete tool calls in nanocoder format
      if (toolCalls.length > 0) {
        yield {
          message: {
            content: '', 
            tool_calls: toolCalls,
          },
          done: true,
        };
      }
    } finally {
      // Clear the timeout when done
      if (timeoutId) clearTimeout(timeoutId);
      reader.releaseLock();
    }
  }

  private async makeRequest(endpoint: string, body: any): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeout)
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          throw new Error(`Request failed: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if ((error as Error).name === 'AbortError' || 
            (error as any).status === 400 || 
            (error as any).status === 401 || 
            (error as any).status === 403) {
          break;
        }
        
        if (attempt < this.maxRetries - 1) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    throw lastError;
  }

  private formatMessages(messages: Message[]): any[] {
    return messages.map(msg => {
      if (msg.role === 'tool') {
        // Convert tool results to user messages for llama.cpp compatibility
        return {
          role: 'user',
          content: `Tool "${msg.name}" executed successfully. Result:\n${msg.content}`
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
    for (const newCall of newCalls) {
      const existingIndex = accumulated.findIndex(call => call.index === newCall.index);
      
      if (existingIndex >= 0) {
        const existing = accumulated[existingIndex];
        
        // Update id and type if provided
        if (newCall.id) existing.id = newCall.id;
        if (newCall.type) existing.type = newCall.type;
        
        // Update function info if provided
        if (newCall.function) {
          if (!existing.function) {
            existing.function = { name: '', arguments: '' };
          }
          
          if (newCall.function.name) {
            existing.function.name = newCall.function.name;
          }
          
          if (newCall.function.arguments !== undefined) {
            existing.function.arguments += newCall.function.arguments;
          }
        }
      } else {
        // Create new tool call entry
        accumulated.push({
          index: newCall.index,
          id: newCall.id || '',
          type: newCall.type || 'function',
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
    // This is a no-op for now
  }
}