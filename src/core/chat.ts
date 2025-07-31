import { OllamaClient } from './ollama-client.js';
import { processToolUse } from './message-handler.js';
import { getUserInput } from '../ui/input.js';
import { displayAssistantMessage, displayToolCall } from '../ui/output.js';
import { tools, read_file } from '../tools/index.js';
import { promptPath } from '../config/index.js';
import type { Message } from '../types/index.js';

export class ChatSession {
  private client: OllamaClient;
  private messages: Message[] = [];

  constructor() {
    this.client = new OllamaClient();
  }

  async start(): Promise<void> {
    let needsUserInput = true;

    while (true) {
      if (needsUserInput) {
        const userInput = await getUserInput();
        
        if (userInput === null) {
          break;
        }

        this.messages.push({ role: 'user', content: userInput });
      }

      const instructions = await read_file({ path: promptPath });
      const systemMessage: Message = { role: 'system', content: instructions };

      const response = await this.client.chat([systemMessage, ...this.messages], tools);

      this.messages.push({
        role: 'assistant',
        content: response.message.content,
        tool_calls: response.message.tool_calls,
      });

      if (response.message.content) {
        displayAssistantMessage(response.message.content);
      }

      if (response.message.tool_calls && response.message.tool_calls.length > 0) {
        needsUserInput = false;

        for (const toolCall of response.message.tool_calls) {
          const toolResult = await processToolUse(toolCall);
          this.messages.push(toolResult);
          displayToolCall(toolCall, toolResult);
        }
      } else {
        needsUserInput = true;
      }
    }
  }
}