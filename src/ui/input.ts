import * as p from "@clack/prompts";
import { commandRegistry } from "../core/commands.js";
import { successColor, errorColor, primaryColor, blueColor } from "./colors.js";
import { formatToolCall } from "./tool-formatter.js";
import type { ToolCall } from "../types/index.js";
import { promptHistory } from "../core/prompt-history.js";
import { borderedContent } from "./bordered-content.js";

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

function getRandomPrompt(): string {
  return (
    examplePrompts[Math.floor(Math.random() * examplePrompts.length)] ||
    'Try "fix typecheck errors"'
  );
}

function getCommandCompletions(input: string): string[] {
  if (!input.startsWith("/")) {
    return [];
  }

  const commandPart = input.slice(1);
  return Array.from(commandRegistry.getAll())
    .map((cmd) => cmd.name)
    .filter((name) => name.includes(commandPart))
    .map((cmd) => `/${cmd}`)
    .sort();
}

export async function getUserInput(): Promise<string | null> {
  try {
    // Load history on first use
    if (promptHistory.getHistory().length === 0) {
      await promptHistory.loadHistory();
    }

    const userInput = await p.text({
      message: primaryColor("What would you like me to help with?"),
      placeholder: getRandomPrompt(),
    });

    if (p.isCancel(userInput)) {
      p.cancel("Operation cancelled");
      return null;
    }

    let inputValue = userInput.trim();

    // Add to history if it's not empty and not a command
    if (inputValue && !inputValue.startsWith("/")) {
      promptHistory.addPrompt(inputValue);
    }

    // If user starts typing a command, show completions and let them choose
    if (inputValue.startsWith("/") && inputValue.length > 1) {
      const completions = getCommandCompletions(inputValue);
      if (completions.length > 1) {
        const selectedCommand = await p.select({
          message: blueColor(`Available commands matching "${inputValue}":`),
          options: [
            { label: `Continue with: ${inputValue}`, value: inputValue },
            ...completions.map((cmd) => ({ label: cmd, value: cmd })),
          ],
        });

        if (p.isCancel(selectedCommand)) {
          p.cancel("Operation cancelled");
          return null;
        }

        inputValue = selectedCommand;
      } else if (completions.length === 1 && completions[0] !== inputValue) {
        const useCompletion = await p.confirm({
          message: blueColor(`Did you mean "${completions[0]}"?`),
          initialValue: true,
        });

        if (p.isCancel(useCompletion)) {
          p.cancel("Operation cancelled");
          return null;
        }

        if (useCompletion && completions[0]) {
          inputValue = completions[0];
        }
      }
    }

    return inputValue;
  } catch (error) {
    p.cancel("Goodbye!");
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
    p.cancel("Operation cancelled");
    return false;
  }

  return action === "execute";
}
