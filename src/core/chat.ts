import { OllamaClient } from "./ollama-client.js";
import { processToolUse } from "./message-handler.js";
import { getUserInput } from "../ui/input.js";
import { displayAssistantMessage, displayToolCall } from "../ui/output.js";
import { tools, read_file } from "../tools/index.js";
import { promptPath } from "../config/index.js";
import { commandRegistry } from "./commands.js";
import { isCommandInput, parseInput } from "./command-parser.js";
import type { Message } from "../types/index.js";

import { exitCommand, helpCommand, clearCommand } from "./commands/index.js";

let currentChatSession: ChatSession | null = null;

export function getCurrentChatSession(): ChatSession | null {
  return currentChatSession;
}

export class ChatSession {
  private client: OllamaClient;
  private messages: Message[] = [];

  constructor() {
    this.client = new OllamaClient();
    currentChatSession = this;
    commandRegistry.register([helpCommand, exitCommand, clearCommand]);
  }

  clearHistory(): void {
    this.messages = [];
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

      const response = await this.client.chat(
        [systemMessage, ...this.messages],
        tools
      );

      // Parse tool calls from content if tool_calls field is empty
      let toolCalls = response.message.tool_calls;
      if (!toolCalls && response.message.content) {
        const toolCallMatch = response.message.content.match(
          /\{"name":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]*\})\}/
        );
        if (toolCallMatch) {
          const [, name, argsStr] = toolCallMatch;
          try {
            const args = JSON.parse(argsStr);
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
        content: response.message.content,
        tool_calls: toolCalls,
      });

      if (response.message.content) {
        displayAssistantMessage(response.message.content);
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
