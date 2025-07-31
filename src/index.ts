#!/usr/bin/env node
import { Ollama } from "ollama";
import chalk from "chalk";
import * as readline from "readline";
import { read_file, toolRegistry, tools } from "./tools.js";

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

const ollama = new Ollama();
const model = "qwen3:0.6b";
const maxTokens = 4096;

// Define colors for different roles when printing messages.
const userHexCode = "#e11d48";
const claudeHexCode = "#d97757";
const toolHexCode = "#0d9488";

async function processToolUse(toolUse: any): Promise<any> {
  const handler = toolRegistry[toolUse.function.name];
  if (!handler) throw new Error(`Unknown tool: ${toolUse.function.name}`);
  const result = await handler(JSON.parse(toolUse.function.arguments));
  return {
    tool_call_id: toolUse.id,
    role: "tool",
    name: toolUse.function.name,
    content: result,
  };
}

async function chat() {
  const messages: any[] = [];
  let needsUserInput = true;

  while (true) {
    // If we need user input, prompt for it
    if (needsUserInput) {
      const userInput = await askQuestion(chalk.hex(userHexCode).bold("You: "));

      if (!userInput || userInput.toLowerCase() === "exit") {
        console.log("Goodbye!");
        rl.close();
        break;
      }

      messages.push({ role: "user", content: userInput });
    }

    const instructions = await read_file({
      path: "./src/prompt.md",
    });

    const response = await ollama.chat({
      model,
      messages: [{ role: "system", content: instructions }, ...messages],
      tools,
      options: {
        num_predict: maxTokens,
      },
    });

    messages.push({
      role: "assistant",
      content: response.message.content,
      tool_calls: response.message.tool_calls,
    });

    // Handle text response
    if (response.message.content) {
      console.log(
        `${chalk.hex(claudeHexCode).bold("Ollama:")} ${
          response.message.content
        }`
      );
    }

    // Handle tool calls
    if (response.message.tool_calls && response.message.tool_calls.length > 0) {
      needsUserInput = false;

      for (const toolCall of response.message.tool_calls) {
        const toolResult = await processToolUse(toolCall);
        messages.push(toolResult);

        console.log(
          `\n${chalk.hex(toolHexCode).bold(`🔧 ${toolCall.function.name}`)}`
        );
        console.log(chalk.gray("─".repeat(50)));

        console.log(chalk.hex(toolHexCode)("Arguments:"));
        console.log(chalk.gray(toolCall.function.arguments));

        console.log(chalk.hex(toolHexCode)("Result:"));
        console.log(chalk.gray(toolResult.content));
        console.log(chalk.gray("─".repeat(50)));
      }
    } else {
      needsUserInput = true;
    }
  }
}

console.log();
console.log(chalk.hex(claudeHexCode).bold("Welcome to nano-ollama-code!"));
console.log();
chat().catch(console.error);
