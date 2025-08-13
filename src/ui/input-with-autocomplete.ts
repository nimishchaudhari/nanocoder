import * as readline from "readline";
import { commandRegistry } from "../core/commands.js";
import { getCurrentChatSession } from "../core/chat.js";
import { primaryColor, secondaryColor, successColor } from "./colors.js";
import { endConversation } from "./output.js";
import { promptHistory } from "../core/prompt-history.js";

/**
 * Get all available command completions
 */
function getAllCommandCompletions(): string[] {
  const completions: string[] = [];

  // Get built-in commands
  const builtInCommands = Array.from(commandRegistry.getAll()).map(
    (cmd) => `/${cmd.name}`
  );
  completions.push(...builtInCommands);

  // Get custom commands if available
  const chatSession = getCurrentChatSession();
  if (chatSession) {
    const customLoader = chatSession.getCustomCommandLoader();
    const customCommands = customLoader.getAllCommands();
    for (const cmd of customCommands) {
      completions.push(`/${cmd.fullName}`);
      // Also add aliases
      if (cmd.metadata.aliases) {
        for (const alias of cmd.metadata.aliases) {
          const fullAlias = cmd.namespace
            ? `/${cmd.namespace}:${alias}`
            : `/${alias}`;
          completions.push(fullAlias);
        }
      }
    }
  }

  return [...new Set(completions)].sort();
}

/**
 * Completer function for readline
 */
function completer(line: string): [string[], string] {
  if (!line.startsWith("/")) {
    return [[], line];
  }

  const allCommands = getAllCommandCompletions();
  const hits = allCommands.filter((cmd) => cmd.startsWith(line));

  // If there's exactly one match, return it for immediate completion
  if (hits.length === 1) {
    return [hits, line];
  }

  // If there are multiple matches, find the longest common prefix
  if (hits.length > 1) {
    let commonPrefix = hits[0] || "";
    for (let i = 1; i < hits.length; i++) {
      const hit = hits[i];
      if (!hit) continue;

      let j = 0;
      while (
        j < commonPrefix.length &&
        j < hit.length &&
        commonPrefix[j] === hit[j]
      ) {
        j++;
      }
      commonPrefix = commonPrefix.substring(0, j);
    }

    // If the common prefix is longer than the current input, complete to the prefix
    if (commonPrefix.length > line.length) {
      return [[commonPrefix], line];
    }
  }

  return [hits, line];
}

/**
 * Get user input with autocomplete support
 */
export async function getUserInputWithAutocomplete(): Promise<string | null> {
  return new Promise(async (resolve) => {
    // Load history before creating the interface
    await promptHistory.loadHistory();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: completer,
      terminal: true,
    });

    // Enable keypress events
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    readline.emitKeypressEvents(process.stdin);

    // Display the prompt
    console.log();
    const promptText = primaryColor("What would you like me to help with?");
    console.log(promptText);
    console.log(
      secondaryColor(
        "Type `/` and then press Tab for command suggestions. Use ↑/↓ for history."
      )
    );
    console.log();

    const keypressHandler = (_str: string, key: any) => {
      if (key && key.name === "escape") {
        // Clear the line and reset history index
        process.stdout.write("\r\x1b[K>>> ");
        (rl as any).line = "";
        (rl as any).cursor = 0;
        promptHistory.resetIndex();
        (rl as any)._refreshLine();
      } else if (key && key.name === "up") {
        // Navigate to previous history entry
        const prevEntry = promptHistory.getPrevious();
        if (prevEntry !== null) {
          (rl as any).line = prevEntry;
          (rl as any).cursor = prevEntry.length;
          (rl as any)._refreshLine();
        }
      } else if (key && key.name === "down") {
        // Navigate to next history entry
        const nextEntry = promptHistory.getNext();
        if (nextEntry !== null) {
          (rl as any).line = nextEntry;
          (rl as any).cursor = nextEntry.length;
          (rl as any)._refreshLine();
        }
      }
    };

    // Handle escape key to clear input and arrow keys for history
    process.stdin.on("keypress", keypressHandler);

    rl.question(">>> ", (answer) => {
      // Clean up
      process.stdin.removeListener("keypress", keypressHandler);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      rl.close();
      console.log();

      const trimmed = answer.trim();
      if (trimmed === "") {
        resolve(null);
      } else {
        resolve(trimmed);
      }
    });

    // Handle Ctrl+C
    rl.on("SIGINT", () => {
      process.stdin.removeListener("keypress", keypressHandler);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
      }
      rl.close();
      console.log();

      console.log();
      endConversation();
      resolve(null);
    });
  });
}
