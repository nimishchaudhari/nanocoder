import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import type { ToolHandler, ToolDefinition } from "../../types/index.js";
import { toolColor, secondaryColor, primaryColor } from "../../ui/colors.js";

const handler: ToolHandler = async (args: {
  path: string;
}): Promise<string> => {
  const content = await readFile(resolve(args.path), "utf-8");
  const lines = content.split("\n");

  // Return content with line numbers for precise editing
  let result = "";
  for (let i = 0; i < lines.length; i++) {
    const lineNum = String(i + 1).padStart(4, " ");
    result += `${lineNum}: ${lines[i]}\n`;
  }

  return result.slice(0, -1); // Remove trailing newline
};

const formatter = (args: any): string => {
  const path = args.path || args.file_path || "unknown";
  let result = `${toolColor("⚒ read_file")}\n`;
  result += `${secondaryColor("Path:")} ${primaryColor(path)}`;

  if (args.offset || args.limit) {
    result += `\n${secondaryColor("Range:")} `;
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
      description:
        "Read the contents of a file with line numbers (use line numbers with edit_file tool for precise editing)",
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
