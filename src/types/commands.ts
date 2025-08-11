export interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void;
}

export interface ParsedCommand {
  isCommand: boolean;
  command?: string;
  args?: string[];
  fullCommand?: string;
}

export interface CustomCommandMetadata {
  description?: string;
  aliases?: string[];
  parameters?: string[];
}

export interface CustomCommand {
  name: string;
  path: string;
  namespace?: string;
  fullName: string; // e.g., "refactor:dry" or just "test"
  metadata: CustomCommandMetadata;
  content: string; // The markdown content without frontmatter
}

export interface ParsedCustomCommand {
  metadata: CustomCommandMetadata;
  content: string;
}