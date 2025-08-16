import * as p from "@clack/prompts";
import { successColor, errorColor } from "./colors.js";
import { formatToolCall } from "./tool-formatter.js";
import type { ToolCall } from "../types/index.js";
import { getUserInputWithAutocomplete } from "./input-with-autocomplete.js";
import { promptHistory } from "../core/prompt-history.js";
import { endConversation } from "./output.js";

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
