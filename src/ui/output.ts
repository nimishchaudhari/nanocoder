import {
  primaryColor,
  toolColor,
  secondaryColor,
  whiteColor,
  blueColor,
  successColor,
} from "./colors.js";
import * as p from "@clack/prompts";
import { highlightContent } from "./syntax-highlighter.js";
import type { ToolCall, ToolResult } from "../types/index.js";
import { borderedContent } from "./bordered-content.js";

export function displayWelcome(): void {
  const cwd = process.cwd();
  console.log();
  console.log(
    primaryColor("╭─────────────────────────────────────────────────────────╮")
  );
  console.log(
    primaryColor("│") +
      whiteColor(" ✻ Welcome to NanoCoder!                                 ") +
      primaryColor("│")
  );
  console.log(
    primaryColor("│                                                         │")
  );
  console.log(
    primaryColor("│") +
      secondaryColor(
        "   /help for help                                        "
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
  p.intro(blueColor(`cwd: ${cwd}`));
}

export function displayAssistantMessage(content: string, model?: string): void {
  const highlightedContent = highlightContent(content);
  const modelName = model || "Assistant";

  borderedContent(modelName, highlightedContent);
}

export function displayToolCall(toolCall: ToolCall, result: ToolResult): void {
  const tokenCount = Math.ceil((result.content?.length || 0) / 4);
  p.log.info(`${toolColor(`⚒ ${toolCall.function.name}`)} executed • ${tokenCount} tokens`);
}

let currentSpinner: ReturnType<typeof p.spinner> | null = null;
let finalTokenCount = 0;
let startTime = 0;

export function displayThinkingIndicator(
  tokenCount: number,
  elapsedSeconds: number,
  maxTokens: number,
  totalTokensUsed: number
): void {
  const contextRemaining = Math.max(
    0,
    Math.round(((maxTokens - totalTokensUsed) / maxTokens) * 100)
  );
  const isLowContext = contextRemaining < 20;
  const warning = isLowContext ? " ⚠ clear context soon" : "";

  const message = `${tokenCount} tokens • ${contextRemaining}% context left • ${elapsedSeconds}s${warning}`;

  if (!currentSpinner) {
    currentSpinner = p.spinner();
    currentSpinner.start(message);
    startTime = Date.now();
  } else {
    currentSpinner.message(message);
  }

  // Track final stats
  finalTokenCount = tokenCount;
}

export function clearThinkingIndicator(): void {
  if (currentSpinner) {
    const finalTime = Math.round((Date.now() - startTime) / 1000);
    currentSpinner.stop(`${finalTokenCount} tokens in ${finalTime}s`);
    currentSpinner = null;
    finalTokenCount = 0;
    startTime = 0;
  }
}

export function startNewConversation(): void {
  p.outro(successColor("Conversation cleared! Starting fresh..."));
  p.intro(blueColor("What will you create?"));
}

export function endConversation(): void {
  p.outro("Goodbye! 👋");
}
