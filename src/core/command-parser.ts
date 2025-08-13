import type { ParsedCommand } from "../types/index.js";

export function parseInput(input: string): ParsedCommand {
  const trimmed = input.trim();
  
  if (!trimmed.startsWith('/')) {
    return { isCommand: false };
  }

  const commandText = trimmed.slice(1);
  if (!commandText) {
    return { isCommand: true, command: '', args: [], fullCommand: '' };
  }

  const parts = commandText.split(/\s+/);
  const command = parts[0];
  const args = parts.slice(1);

  return {
    isCommand: true,
    command,
    args,
    fullCommand: commandText
  };
}

export function isCommandInput(input: string): boolean {
  return input.trim().startsWith('/');
}