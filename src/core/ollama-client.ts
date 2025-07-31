import { Ollama } from 'ollama';
import { ollamaConfig } from '../config/index.js';
import type { Message, Tool } from '../types/index.js';

export class OllamaClient {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama();
  }

  async chat(messages: Message[], tools: Tool[]): Promise<any> {
    return await this.ollama.chat({
      model: ollamaConfig.model,
      messages,
      tools,
      options: {
        num_predict: ollamaConfig.maxTokens,
      },
    });
  }
}