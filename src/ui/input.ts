import * as p from "@clack/prompts";
import { commandRegistry } from "../core/commands.js";
import { getCurrentChatSession } from "../core/chat.js";
import {
  successColor,
  errorColor,
  toolColor,
  primaryColor,
  blueColor,
} from "./colors.js";
import { formatToolCall } from "./tool-formatter.js";
import type { ToolCall } from "../types/index.js";
import { getUserInputWithAutocomplete } from "./input-with-autocomplete.js";
import { promptHistory } from "../core/prompt-history.js";
import { borderedContent } from "./bordered-content.js";
import { endConversation } from "./output.js";

const examplePrompts = [
  'Try "fix typecheck errors"',
  'Try "add dark mode"',
  'Try "optimize performance"',
  'Try "add tests"',
  'Try "refactor this function"',
  'Try "add error handling"',
  'Try "update dependencies"',
  'Try "fix linting issues"',
  'Try "add documentation"',
  'Try "implement authentication"',
  'Try "create API endpoint"',
  'Try "add responsive design"',
  'Try "fix memory leak"',
  'Try "add logging"',
  'Try "improve accessibility"',
  'Try "add validation"',
  'Try "optimize database queries"',
  'Try "add caching"',
  'Try "implement search"',
  'Try "add unit tests"',
];

export async function getUserInput(): Promise<string | null> {
  try {
    // Load history on first use
    if (promptHistory.getHistory().length === 0) {
      await promptHistory.loadHistory();
    }

    // Use autocomplete input for better command discovery
    const userInput = await getUserInputWithAutocomplete();

    if (userInput === null) {
      return null;
    }

    let inputValue = userInput.trim();

    // Add to history if it's not empty and not a command
    if (inputValue && !inputValue.startsWith("/")) {
      promptHistory.addPrompt(inputValue);
    }

    return inputValue;
  } catch (error) {
    endConversation();
    return null;
  }
}

export async function promptToolApproval(toolCall: ToolCall): Promise<boolean> {
  // Display formatted tool call - use message to avoid extra dots
  const formattedTool = await formatToolCall(toolCall);
  console.log("\n" + formattedTool + "\n");

  const action = await p.select({
    message: "Execute this tool?",
    options: [
      { label: `${successColor("✓ Yes, execute")}`, value: "execute" },
      {
        label: `${errorColor("⨯ No, tell agent what to do differently")}`,
        value: "cancel",
      },
    ],
  });

  if (p.isCancel(action)) {
    endConversation();
    return false;
  }

  return action === "execute";
}
