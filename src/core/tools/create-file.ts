import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { highlight } from "cli-highlight";
import type { ToolHandler, ToolDefinition } from "../../types/index.js";
import {
  toolColor,
  secondaryColor,
  primaryColor,
  successColor,
} from "../../ui/colors.js";
import { getLanguageFromExtension } from "../utils/programming-language-helper.js";

const handler: ToolHandler = async (args: {
  path: string;
  content: string;
}): Promise<string> => {
  const absPath = resolve(args.path);
  await writeFile(absPath, args.content, "utf-8");
  return "File written successfully";
};

const formatter = async (args: any): Promise<string> => {
  const path = args.path || args.file_path || "unknown";
  const newContent = args.content || "";
  const lineCount = newContent.split("\n").length;
  const charCount = newContent.length;

  let result = `${toolColor("⚒ create_file")}\n`;
  result += `${secondaryColor("Path:")} ${primaryColor(path)}\n`;
  result += `${secondaryColor("Size:")} ${successColor(
    `${lineCount} lines, ${charCount} characters`
  )}\n\n`;

  if (newContent.length > 0) {
    const ext = path.split(".").pop()?.toLowerCase();
    const language = getLanguageFromExtension(ext);
    const lines = newContent.split("\n");

    result += `${secondaryColor("File content:")}\n`;
    
    // Show the entire file with line numbers
    for (let i = 0; i < lines.length; i++) {
      const lineNumStr = String(i + 1).padStart(4, " ");
      const line = lines[i];
      
      try {
        const highlighted = highlight(line, { language, theme: "default" });
        result += `${secondaryColor(lineNumStr)} ${highlighted}\n`;
      } catch {
        result += `${secondaryColor(lineNumStr)} ${line}\n`;
      }
    }
  } else {
    result += `${secondaryColor("File will be empty")}\n`;
  }

  return result;
};

export const createFileTool: ToolDefinition = {
  handler,
  formatter,
  config: {
    type: "function",
    function: {
      name: "create_file",
      description: "Create a new file with the specified content (overwrites if file exists)",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file to write.",
          },
          content: {
            type: "string",
            description: "The content to write to the file.",
          },
        },
        required: ["path", "content"],
      },
    },
  },
};
