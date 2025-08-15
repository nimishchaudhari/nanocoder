import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import type { ToolHandler } from "../../types/index.js";

export const write_file: ToolHandler = async (args: {
  path: string;
  content: string;
}): Promise<string> => {
  try {
    const absPath = resolve(args.path);
    await writeFile(absPath, args.content, "utf-8");
    return "File written successfully";
  } catch (error) {
    return `Error writing file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};