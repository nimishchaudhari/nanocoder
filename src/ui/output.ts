import {
  assistantColor,
  toolColor,
  grayColor,
  subtextColor,
  whiteColor,
} from "./colors.js";
import type { ToolCall, ToolResult } from "../types/index.js";
import { ollamaConfig } from "../config/index.js";

export function displayWelcome(): void {
  const cwd = process.cwd();

  console.log();
  console.log(
    assistantColor(
      "╭─────────────────────────────────────────────────────────╮"
    )
  );
  console.log(
    assistantColor("│") +
      whiteColor(" ✻ Welcome to nano-coder!                                ") +
      assistantColor("│")
  );
  console.log(
    assistantColor(
      "│                                                         │"
    )
  );
  console.log(
    assistantColor("│") +
      subtextColor(
        "   /help for help, /status for your current setup        "
      ) +
      assistantColor("│")
  );
  console.log(
    assistantColor(
      "│                                                         │"
    )
  );
  console.log(
    assistantColor(
      "╰─────────────────────────────────────────────────────────╯"
    )
  );
  console.log();
  console.log(subtextColor(`cwd: ${cwd}`));
  console.log();
  console.log(subtextColor("Tips for getting started:"));
  console.log();
  console.log(
    subtextColor("1. Use natural language to describe what you want to build")
  );
  console.log(
    subtextColor("2. Ask for file analysis, editing, bash commands and more")
  );
  console.log(
    subtextColor(
      "3. Be as specific as you would with another engineer for best results"
    )
  );
  console.log(subtextColor("4. ✔ Type 'exit' or press Ctrl+C to quit"));
  console.log();
  console.log(subtextColor("※ Tip: This tool uses Ollama locally for privacy"));
  console.log();
}

export function displayAssistantMessage(content: string): void {
  console.log();
  console.log(`${assistantColor(ollamaConfig.model)} ${content}`);
  console.log(); // Add spacing after assistant message
}

export function displayToolCall(toolCall: ToolCall, result: ToolResult): void {
  console.log(`\n${toolColor(`🔧 ${toolCall.function.name}`)}`);
  console.log(grayColor("─".repeat(50)));

  console.log(toolColor("Arguments:"));
  console.log(grayColor(JSON.stringify(toolCall.function.arguments, null, 2)));

  console.log(toolColor("Result:"));
  console.log(grayColor(result.content));
  console.log(grayColor("─".repeat(50)));
  console.log(); // Add spacing after tool calls
}
