import { Command } from "../../types/index.js";
import { commandRegistry } from "../commands.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { borderedContent } from "../../ui/bordered-content.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../../package.json"), "utf8")
);

export const helpCommand: Command = {
  name: "help",
  description: "Show available commands",
  handler: async (_args: string[]) => {
    const commands = commandRegistry.getAll();

    const commandList =
      commands.length === 0
        ? "No commands available."
        : commands
            .map((cmd) => `  • /${cmd.name} - ${cmd.description}`)
            .join("\n");

    borderedContent(
      `Nanocoder ${packageJson.version}`,
      `
A local-first CLI coding agent that brings the power of agentic coding tools like Claude Code and Gemini CLI to local models or controlled APIs like OpenRouter.

Always review model responses, especially when running code. Models have read access to files in the current directory and can run commands and edit files with your permission.

Common Tasks:
  • Ask questions about your codebase > How does foo.py work?
  • Edit files > Update bar.ts to...
  • Fix errors > cargo build
  • Run commands > /help

Commands:
${commandList}`
    );
  },
};
