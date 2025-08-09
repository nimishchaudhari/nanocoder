import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import type { ToolHandler } from "../../types/index.js";

export const read_file: ToolHandler = async (args: {
  path: string;
}): Promise<string> => {
  try {
    const content = await readFile(resolve(args.path), "utf-8");
    return content;
  } catch (error) {
    return `Error reading file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};

export const read_many_files: ToolHandler = async (args: {
  paths: string[];
}): Promise<string> => {
  try {
    if (!Array.isArray(args.paths)) {
      return "Error: paths must be an array of strings";
    }
    const results = [] as { path: string; content: string }[];
    for (const p of args.paths) {
      try {
        const content = await readFile(resolve(p), "utf-8");
        results.push({ path: p, content });
      } catch (err) {
        results.push({
          path: p,
          content: `Error reading file: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }
    }
    return JSON.stringify(results);
  } catch (error) {
    return `Error reading multiple files: ${
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
    await writeFile(absPath, args.content, "utf-8");
    return "File written successfully";
  } catch (error) {
    return `Error writing file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};
