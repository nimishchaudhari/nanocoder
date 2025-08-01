import {
  primaryColor,
  toolColor,
  secondaryColor,
  whiteColor,
} from "./colors.js";
import type { ToolCall, ToolResult } from "../types/index.js";
import { ollamaConfig } from "../config/index.js";

export function displayWelcome(): void {
  const cwd = process.cwd();

  console.log();
  console.log(
    primaryColor("╭─────────────────────────────────────────────────────────╮")
  );
  console.log(
    primaryColor("│") +
      whiteColor(" ✻ Welcome to nano-coder!                                ") +
      primaryColor("│")
  );
  console.log(
    primaryColor("│                                                         │")
  );
  console.log(
    primaryColor("│") +
      secondaryColor(
        "   /help for help, /status for your current setup        "
      ) +
      primaryColor("│")
  );
  console.log(
    primaryColor("│                                                         │")
  );
  console.log(
    primaryColor("╰─────────────────────────────────────────────────────────╯")
  );
  console.log();
  console.log(secondaryColor(`cwd: ${cwd}`));
  console.log();
  console.log(secondaryColor("Tips for getting started:"));
  console.log();
  console.log(
    secondaryColor("1. Use natural language to describe what you want to build")
  );
  console.log(
    secondaryColor("2. Ask for file analysis, editing, bash commands and more")
  );
  console.log(
    secondaryColor(
      "3. Be as specific as you would with another engineer for best results"
    )
  );
  console.log(secondaryColor("4. ✔ Type '/exit' or press Ctrl+C to quit"));
  console.log();
  console.log(
    secondaryColor("※ Tip: This tool uses Ollama locally for privacy")
  );
  console.log();
}

export function displayAssistantMessage(content: string): void {
  console.log();
  console.log(`${primaryColor(ollamaConfig.model)} ${content}`);
  console.log(); // Add spacing after assistant message
}

export function displayToolCall(toolCall: ToolCall, result: ToolResult): void {
  console.log(`\n${toolColor(`🔧 ${toolCall.function.name}`)}`);
  console.log(secondaryColor("─".repeat(50)));

  console.log(toolColor("Arguments:"));
  console.log(
    secondaryColor(JSON.stringify(toolCall.function.arguments, null, 2))
  );

  console.log(toolColor("Result:"));
  console.log(secondaryColor(result.content));
  console.log(secondaryColor("─".repeat(50)));
  console.log(); // Add spacing after tool calls
}
