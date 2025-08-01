import inquirer from "inquirer";
import { commandRegistry } from "../core/commands.js";
import { primaryColor } from "./colors.js";

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
    // First, get input normally
    const answers = await inquirer.prompt({
      type: "input",
      name: "userInput",
      message: "",
      default: getRandomPrompt(),
    });

    let input = (answers.userInput || "").trim();

    // If user starts typing a command, show completions and let them choose
    if (input.startsWith("/") && input.length > 1) {
      const completions = getCommandCompletions(input);
      if (completions.length > 1) {
        console.log();
        console.log(`\n💡 Available commands matching "${input}":`);
        console.log();
        const commandChoice = await inquirer.prompt({
          type: "list",
          name: "selectedCommand",
          message: "Select a command:",
          choices: [
            { name: `Continue with: ${input}`, value: input },
            ...completions.map((cmd) => ({ name: cmd, value: cmd })),
          ],
        });
        input = commandChoice.selectedCommand;
      } else if (completions.length === 1 && completions[0] !== input) {
        console.log();
        console.log(`💡 Did you mean: ${completions[0]}?`);
        console.log();
        const confirm = await inquirer.prompt({
          type: "confirm",
          name: "useCompletion",
          message: `Use "${completions[0]}" instead?`,
          default: true,
        });
        if (confirm.useCompletion) {
          input = completions[0];
        }
      }
    }

    return input;
  } catch (error) {
    console.log(primaryColor("\nGoodbye!"));
    return null;
  }
}
