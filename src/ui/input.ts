import inquirer from "inquirer";

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

export async function getUserInput(): Promise<string | null> {
  try {
    const answers = await inquirer.prompt({
      type: "input",
      name: "userInput",
      message: "",
      default: getRandomPrompt(),
    });

    const input = (answers.userInput || "").trim();

    if (
      !input ||
      input.toLowerCase() === "exit" ||
      examplePrompts.includes(input)
    ) {
      console.log("Goodbye!");
      return null;
    }

    return input;
  } catch (error) {
    console.log("\nGoodbye!");
    return null;
  }
}
