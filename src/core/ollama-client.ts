import { Ollama } from "ollama";
import { ollamaConfig } from "../config/index.js";
import type { Message, Tool } from "../types/index.js";

export class OllamaClient {
  private ollama: Ollama;
  private currentModel: string;

  constructor() {
    this.ollama = new Ollama();
    this.currentModel = ollamaConfig.model;
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  async chat(messages: Message[], tools: Tool[]): Promise<any> {
    return await this.ollama.chat({
      model: this.currentModel,
      messages,
      tools,
      options: {
        num_predict: ollamaConfig.maxTokens,
      },
    });
  }

  async chatStream(messages: Message[], tools: Tool[]) {
    return this.ollama.chat({
      model: this.currentModel,
      messages,
      tools,
      stream: true,
      options: {
        num_predict: ollamaConfig.maxTokens,
      },
    });
  }
}
