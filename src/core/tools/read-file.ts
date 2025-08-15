import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import type { ToolHandler, ToolDefinition } from "../../types/index.js";
import { toolColor, secondaryColor, primaryColor } from "../../ui/colors.js";

const handler: ToolHandler = async (args: {
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

const formatter = (args: any): string => {
  const path = args.path || args.file_path || 'unknown';
  let result = `${toolColor('⚒ read_file')}\n`;
  result += `${secondaryColor('Path:')} ${primaryColor(path)}`;
  
  if (args.offset || args.limit) {
    result += `\n${secondaryColor('Range:')} `;
    if (args.offset) result += `from line ${args.offset} `;
    if (args.limit) result += `(${args.limit} lines)`;
  }
  
  return result;
};

export const readFileTool: ToolDefinition = {
  handler,
  formatter,
  config: {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file to read.",
          },
        },
        required: ["path"],
      },
    },
  },
};

