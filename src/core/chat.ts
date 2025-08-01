import { OllamaClient } from "./ollama-client.js";
import { processToolUse } from "./message-handler.js";
import { getUserInput } from "../ui/input.js";
import {
  displayAssistantMessage,
  displayToolCall,
  displayThinkingIndicator,
  clearThinkingIndicator,
} from "../ui/output.js";
import { tools, read_file } from "../tools/index.js";
import { promptPath, ollamaConfig } from "../config/index.js";
import { commandRegistry } from "./commands.js";
import { isCommandInput, parseInput } from "./command-parser.js";
import type { Message } from "../types/index.js";

import {
  exitCommand,
  helpCommand,
  clearCommand,
  modelCommand,
} from "./commands/index.js";

let currentChatSession: ChatSession | null = null;

export function getCurrentChatSession(): ChatSession | null {
  return currentChatSession;
}

export class ChatSession {
  private client: OllamaClient;
  private messages: Message[] = [];
  private currentModel: string;
  private modelContextSize: number = ollamaConfig.contextSize;

  constructor() {
    this.client = new OllamaClient();
    this.currentModel = this.client.getCurrentModel();
    currentChatSession = this;
    commandRegistry.register([
      helpCommand,
      exitCommand,
      clearCommand,
      modelCommand,
    ]);
  }

  async clearHistory(): Promise<void> {
    this.messages = [];
    await this.client.clearContext();
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(model: string): void {
    this.currentModel = model;
    this.client.setModel(model);
  }

  async start(): Promise<void> {
    let needsUserInput = true;

    while (true) {
      if (needsUserInput) {
        const userInput = await getUserInput();

        if (userInput === null) {
          break;
        }

        // Handle commands
        if (isCommandInput(userInput)) {
          const parsed = parseInput(userInput);
          if (parsed.fullCommand) {
            const result = await commandRegistry.execute(parsed.fullCommand);
            if (result) {
              console.log(result);
            }
            continue;
          }
        }

        this.messages.push({ role: "user", content: userInput });
      }

      const instructions = await read_file({ path: promptPath });
      const systemMessage: Message = { role: "system", content: instructions };

      const stream = await this.client.chatStream(
        [systemMessage, ...this.messages],
        tools
      );

      let fullContent = "";
      let tokenCount = 0;
      let toolCalls: any = null;
      const startTime = Date.now();

      for await (const chunk of stream) {
        if (chunk.message?.content) {
          fullContent += chunk.message.content;
          // Approximate token count by character count (rough estimate: ~4 chars per token)
          tokenCount = Math.ceil(fullContent.length / 4);
        }

        // Use actual token count if available (final chunk)
        if (chunk.eval_count) {
          tokenCount = chunk.eval_count;
        }

        if (chunk.message?.tool_calls) {
          toolCalls = chunk.message.tool_calls;
        }

        if (!chunk.done) {
          const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
          // Calculate total tokens used in conversation so far
          const systemTokens = Math.ceil(instructions.length / 4);
          const conversationTokens = this.messages.reduce((total, msg) => {
            return total + Math.ceil((msg.content?.length || 0) / 4);
          }, 0);
          const totalTokensUsed = systemTokens + conversationTokens + tokenCount; // System + conversation + current response
          displayThinkingIndicator(
            tokenCount,
            elapsedSeconds,
            this.modelContextSize,
            totalTokensUsed
          );
        }
      }

      clearThinkingIndicator();

      // Parse tool calls from content if tool_calls field is empty
      if (!toolCalls && fullContent) {
        const toolCallMatch = fullContent.match(
          /\{"name":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]*\})\}/
        );
        if (toolCallMatch) {
          const [, name, argsStr] = toolCallMatch;
          try {
            const args = JSON.parse(argsStr || "{}");
            toolCalls = [
              {
                id: `call_${Date.now()}`,
                type: "function",
                function: {
                  name,
                  arguments: args,
                },
              },
            ];
          } catch (e) {
            console.error(
              "🔍 DEBUG - Failed to parse tool call from content:",
              e
            );
          }
        }
      }

      this.messages.push({
        role: "assistant",
        content: fullContent,
        tool_calls: toolCalls,
      });

      if (fullContent) {
        displayAssistantMessage(fullContent, this.currentModel);
      }

      if (toolCalls && toolCalls.length > 0) {
        needsUserInput = false;

        for (const toolCall of toolCalls) {
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
