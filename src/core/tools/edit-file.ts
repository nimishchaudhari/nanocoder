import type { ToolHandler, ToolDefinition } from "../../types/index.js";
import type { EditArgs } from "./edit-file/types.js";
import { executeEdit } from "./edit-file/handlers.js";
import { formatEditPreview } from "./edit-file/formatter.js";

const handler: ToolHandler = async (args: EditArgs): Promise<string> => {
  return await executeEdit(args);
};

const formatter = async (args: any): Promise<string> => {
  return await formatEditPreview(args);
};

export const editFileTool: ToolDefinition = {
  handler,
  formatter,
  config: {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "Edit specific lines in a file (insert, replace, delete, or move lines by line number)",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file to edit.",
          },
          mode: {
            type: "string",
            enum: ["insert", "replace", "delete", "move", "find_replace"],
            description:
              "The editing operation: 'insert' adds lines, 'replace' replaces line range, 'delete' removes lines, 'move' relocates lines, 'find_replace' finds and replaces text content.",
          },
          line_number: {
            type: "number",
            description:
              "The starting line number (1-based). Required for insert, replace, delete, move modes.",
          },
          end_line: {
            type: "number",
            description:
              "The ending line number for range operations (replace, delete, move). If not specified, only affects line_number.",
          },
          content: {
            type: "string",
            description:
              "The content for insert/replace operations. Can contain multiple lines separated by \\n.",
          },
          target_line: {
            type: "number",
            description: "The target line number for move operations.",
          },
          old_text: {
            type: "string",
            description:
              "The text to find and replace (for find_replace mode only).",
          },
          new_text: {
            type: "string",
            description: "The replacement text (for find_replace mode only).",
          },
          replace_all: {
            type: "boolean",
            description:
              "Whether to replace all occurrences or just the first one (for find_replace mode only). Default: false.",
            default: false,
          },
        },
        required: ["path", "mode"],
      },
    },
  },
};

// Re-export types for convenience
export type {
  EditMode,
  EditArgs,
  EditResult,
  LineChange,
  ValidationResult,
} from "./edit-file/types.js";
export {
  validateEditArgs,
  validateLineNumbers,
} from "./edit-file/validation.js";
export {
  generatePostEditContext,
  calculateActualEditRange,
} from "./edit-file/context.js";
export {
  executeEdit,
  handleFindReplace,
  handleLineBasedEdit,
} from "./edit-file/handlers.js";
export { formatEditPreview } from "./edit-file/formatter.js";
