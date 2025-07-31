import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import type { ToolHandler } from '../types/index.js';

export const read_file: ToolHandler = async (args: { path: string }): Promise<string> => {
  try {
    const content = await readFile(resolve(args.path), 'utf-8');
    return content;
  } catch (error) {
    return `Error reading file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};

export const write_file: ToolHandler = async (args: {
  path: string;
  content: string;
}): Promise<string> => {
  try {
    const absPath = resolve(args.path);
    await writeFile(absPath, args.content, 'utf-8');
    return 'File written successfully';
  } catch (error) {
    return `Error writing file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};