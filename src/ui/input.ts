import { input, select, confirm } from "@inquirer/prompts";
import { commandRegistry } from "../core/commands.js";
import { primaryColor, successColor, errorColor } from "./colors.js";
import { formatToolCall } from "./tool-formatter.js";
import type { ToolCall } from "../types/index.js";

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
    // Add bottom margin for main input
    process.stdout.write('\n\n\n\n\n\u001b[5A');
    
    const userInput = await input({
      message: "",
      default: getRandomPrompt(),
    });

    if (userInput === undefined) {
      return null;
    }

    let inputValue = userInput.trim();

    // If user starts typing a command, show completions and let them choose
    if (inputValue.startsWith("/") && inputValue.length > 1) {
      const completions = getCommandCompletions(inputValue);
      if (completions.length > 1) {
        console.log();
        console.log(`\n💡 Available commands matching "${inputValue}":`);
        console.log();
        
        // Add bottom margin for command selection input
        process.stdout.write('\n\n\n\n\n\u001b[5A');
        
        const selectedCommand = await select({
          message: "Select a command:",
          choices: [
            { name: `Continue with: ${inputValue}`, value: inputValue },
            ...completions.map((cmd) => ({ name: cmd, value: cmd })),
          ],
        });
        inputValue = selectedCommand;
      } else if (completions.length === 1 && completions[0] !== inputValue) {
        console.log();
        console.log(`💡 Did you mean: ${completions[0]}?`);
        console.log();
        
        // Add bottom margin for command confirmation input
        process.stdout.write('\n\n\n\n\n\u001b[5A');
        
        const useCompletion = await confirm({
          message: `Use "${completions[0]}" instead?`,
          default: true,
        });
        if (useCompletion && completions[0]) {
          inputValue = completions[0];
        }
      }
    }

    return inputValue;
  } catch (error) {
    console.log(primaryColor("\nGoodbye!"));
    return null;
  }
}

export async function promptToolApproval(toolCall: ToolCall): Promise<boolean> {
  // Add bottom margin for tool approval input
  process.stdout.write('\n\n\n\n\n\u001b[5A');
  
  // Display the formatted tool call
  console.log();
  console.log(await formatToolCall(toolCall));
  console.log();
  
  const action = await select({
    message: "Execute this tool?",
    choices: [
      { name: `${successColor("✓ Yes, execute")}`, value: "execute" },
      {
        name: `${errorColor("⨯ No, tell agent what to do differently")}`,
        value: "cancel",
      },
    ],
    default: "execute",
  });

  return action === "execute";
}
