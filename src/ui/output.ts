import { assistantColor, toolColor, grayColor } from "./colors.js";
import type { ToolCall, ToolResult } from "../types/index.js";

export function displayWelcome(): void {
  console.log();
  console.log(assistantColor("Welcome to nano-ollama-code!"));
  console.log();
}

export function displayAssistantMessage(content: string): void {
  console.log(`${assistantColor("Ollama:")} ${content}`);
}

export function displayToolCall(toolCall: ToolCall, result: ToolResult): void {
  console.log(`\n${toolColor(`🔧 ${toolCall.function.name}`)}`);
  console.log(grayColor("─".repeat(50)));

  console.log(toolColor("Arguments:"));
  console.log(grayColor(JSON.stringify(toolCall.function.arguments, null, 2)));

  console.log(toolColor("Result:"));
  console.log(grayColor(result.content));
  console.log(grayColor("─".repeat(50)));
}
