import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { highlight } from "cli-highlight";
import type { ToolHandler, ToolDefinition } from "../../types/index.js";
import {
  toolColor,
  secondaryColor,
  primaryColor,
  successColor,
  errorColor,
  addedLineColor,
  removedLineColor,
} from "../../ui/colors.js";
import { getLanguageFromExtension } from "../utils/programming-language-helper.js";

type EditMode = "insert" | "replace" | "delete" | "move" | "find_replace";

const handler: ToolHandler = async (args: {
  path: string;
  mode: EditMode;
  line_number?: number;
  end_line?: number;
  content?: string;
  target_line?: number;
  old_text?: string;
  new_text?: string;
  replace_all?: boolean;
}): Promise<string> => {
  try {
    const absPath = resolve(args.path);
    const fileContent = await readFile(absPath, "utf-8");
    const lines = fileContent.split("\n");

    // Handle find_replace mode differently - it doesn't use line numbers
    if (args.mode === "find_replace") {
      const oldText = args.old_text || "";
      const newText = args.new_text || "";

      if (!fileContent.includes(oldText)) {
        throw new Error(`Text "${oldText}" not found in file`);
      }

      const newContent = args.replace_all
        ? fileContent.replaceAll(oldText, newText)
        : fileContent.replace(oldText, newText);

      if (newContent === fileContent) {
        return "No changes made - text already matches";
      }

      await writeFile(absPath, newContent, "utf-8");
      return "File edited successfully";
    }

    // For line-based operations, validate line numbers
    const lineNum = args.line_number;
    if (!lineNum) {
      throw new Error(`line_number is required for mode "${args.mode}"`);
    }

    const endLine = args.end_line ?? lineNum;
    const content = args.content || "";

    // Validation depends on mode
    if (args.mode === "insert") {
      if (lineNum < 1 || lineNum > lines.length + 1) {
        throw new Error(
          `Line number ${lineNum} is out of range for insert (valid range: 1-${
            lines.length + 1
          })`
        );
      }
    } else {
      // For replace, delete, move - line must exist
      if (lineNum < 1 || lineNum > lines.length) {
        throw new Error(
          `Line number ${lineNum} is out of range (file has ${lines.length} lines)`
        );
      }

      if (endLine < lineNum || endLine > lines.length) {
        throw new Error(
          `End line ${endLine} is out of range or before start line`
        );
      }
    }

    let newLines = [...lines];
    let description = "";

    switch (args.mode) {
      case "insert": {
        const insertLines = content.split("\n");
        newLines.splice(lineNum - 1, 0, ...insertLines);
        description = `Inserted ${insertLines.length} line${
          insertLines.length > 1 ? "s" : ""
        } at line ${lineNum}`;
        break;
      }

      case "replace": {
        const replaceLines = content.split("\n");
        const linesToRemove = endLine - lineNum + 1;
        newLines.splice(lineNum - 1, linesToRemove, ...replaceLines);
        const rangeDesc =
          lineNum === endLine
            ? `line ${lineNum}`
            : `lines ${lineNum}-${endLine}`;
        description = `Replaced ${rangeDesc} with ${replaceLines.length} line${
          replaceLines.length > 1 ? "s" : ""
        }`;
        break;
      }

      case "delete": {
        const linesToRemove = endLine - lineNum + 1;
        newLines.splice(lineNum - 1, linesToRemove);
        const rangeDesc =
          lineNum === endLine
            ? `line ${lineNum}`
            : `lines ${lineNum}-${endLine}`;
        description = `Deleted ${rangeDesc}`;
        break;
      }

      case "move": {
        const targetLine = args.target_line;
        if (!targetLine || targetLine < 1 || targetLine > lines.length + 1) {
          throw new Error(`Target line ${targetLine} is invalid`);
        }

        // Extract lines to move
        const linesToMove = newLines.splice(lineNum - 1, endLine - lineNum + 1);

        // Insert at target position (adjust for removed lines if target is after source)
        const adjustedTarget =
          targetLine > lineNum ? targetLine - linesToMove.length : targetLine;
        newLines.splice(adjustedTarget - 1, 0, ...linesToMove);

        const rangeDesc =
          lineNum === endLine
            ? `line ${lineNum}`
            : `lines ${lineNum}-${endLine}`;
        description = `Moved ${rangeDesc} to line ${targetLine}`;
        break;
      }
    }

    const newContent = newLines.join("\n");
    await writeFile(absPath, newContent, "utf-8");

    return `Successfully ${description}`;
  } catch (error) {
    throw error; // Re-throw to preserve the original error
  }
};

const formatter = async (args: any): Promise<string> => {
  const path = args.path || args.file_path || "unknown";
  const mode = args.mode || "insert";
  const lineNumber = args.line_number;
  const endLine = args.end_line ?? lineNumber;
  const content = args.content || "";
  const targetLine = args.target_line;
  const oldText = args.old_text || "";
  const newText = args.new_text || "";
  const replaceAll = args.replace_all || false;

  let result = `${toolColor("⚒ edit_file")}\n`;
  result += `${secondaryColor("Path:")} ${primaryColor(path)}\n`;
  result += `${secondaryColor("Mode:")} ${mode}\n`;

  if (mode === "find_replace") {
    result += `${secondaryColor("Operation:")} ${
      replaceAll ? "Replace all" : "Replace first"
    }\n`;
  } else {
    const rangeDesc =
      lineNumber === endLine
        ? `line ${lineNumber}`
        : `lines ${lineNumber}-${endLine}`;
    result += `${secondaryColor("Range:")} ${rangeDesc}\n`;

    if (mode === "move" && targetLine) {
      result += `${secondaryColor("Target:")} line ${targetLine}\n`;
    }
  }

  try {
    const fileContent = await readFile(resolve(path), "utf-8");
    const lines = fileContent.split("\n");

    const ext = path.split(".").pop()?.toLowerCase();
    const language = getLanguageFromExtension(ext);
    const contextLines = 3;

    switch (mode) {
      case "find_replace": {
        // Use same logic as handler - check if text exists first
        if (!fileContent.includes(oldText)) {
          result += `${errorColor("✗")} Text not found in file\n`;
          result += `${secondaryColor("Looking for:")} ${oldText}\n`;
          result += `${secondaryColor(
            "Note:"
          )} Operation will fail - text must exist exactly as specified\n`;
          return result;
        }

        // Find all occurrences for diff display
        const occurrences: Array<{
          lineNum: number;
          lineContent: string;
          startPos: number;
        }> = [];

        for (let i = 0; i < lines.length; i++) {
          const lineContent = lines[i];
          if (!lineContent) continue;

          let searchFrom = 0;

          while (true) {
            const pos = lineContent.indexOf(oldText, searchFrom);
            if (pos === -1) break;

            occurrences.push({
              lineNum: i + 1,
              lineContent,
              startPos: pos,
            });

            if (!replaceAll) break;
            searchFrom = pos + oldText.length;
          }
        }

        // Handle single-line occurrences
        if (occurrences.length > 0) {
          const changesToShow = replaceAll
            ? occurrences
            : occurrences.slice(0, 1);
          result += `${successColor(
            `✓ ${changesToShow.length} change${
              changesToShow.length > 1 ? "s" : ""
            } found`
          )}\n\n`;

          for (const occurrence of changesToShow) {
            const { lineNum, lineContent, startPos } = occurrence;

            // Show context around the change
            const startLine = Math.max(0, lineNum - 1 - contextLines);
            const endLine = Math.min(
              lines.length - 1,
              lineNum - 1 + contextLines
            );

            result += `${secondaryColor(`Line ${lineNum}:`)}\n`;

            // Show context before
            for (let i = startLine; i < lineNum - 1; i++) {
              const lineNumStr = String(i + 1).padStart(4, " ");
              const line = lines[i] || "";
              try {
                const highlighted = highlight(line, {
                  language,
                  theme: "default",
                });
                result += `${secondaryColor(
                  ` ${lineNumStr}`
                )} ${highlighted}\n`;
              } catch {
                result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
              }
            }

            // Show the changed line
            const lineNumStr = String(lineNum).padStart(4, " ");
            const before = lineContent.substring(0, startPos);
            const after = lineContent.substring(startPos + oldText.length);
            const oldLine = before + oldText + after;
            const newLine = before + newText + after;

            result += `${secondaryColor(lineNumStr)} ${removedLineColor(
              `- ${oldLine}`
            )}\n`;
            result += `${secondaryColor(lineNumStr)} ${addedLineColor(
              `+ ${newLine}`
            )}\n`;

            // Show limited context after
            const maxAfterLines = 2;
            const actualEndLine = Math.min(
              endLine,
              lineNum - 1 + maxAfterLines
            );
            for (let i = lineNum; i <= actualEndLine; i++) {
              const lineNumStr = String(i + 1).padStart(4, " ");
              const line = lines[i] || "";
              try {
                const highlighted = highlight(line, {
                  language,
                  theme: "default",
                });
                result += `${secondaryColor(
                  ` ${lineNumStr}`
                )} ${highlighted}\n`;
              } catch {
                result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
              }
            }

            if (
              changesToShow.length > 1 &&
              occurrence !== changesToShow[changesToShow.length - 1]
            ) {
              result += "\n";
            }
          }

          if (replaceAll && occurrences.length > changesToShow.length) {
            result += `${secondaryColor(
              `... and ${
                occurrences.length - changesToShow.length
              } more occurrences`
            )}\n`;
          }
        } else {
          // Handle multiline text
          result += `${errorColor("✗")} Could not locate text in file\n`;
          result += `${secondaryColor("Looking for text starting with:")} ${
            oldText.split("\n")[0]
          }\n`;
        }
        break;
      }
      case "insert": {
        if (!lineNumber || lineNumber < 1 || lineNumber > lines.length + 1) {
          result += `${errorColor(
            "✗"
          )} Line number ${lineNumber} is out of range (file has ${
            lines.length
          } lines)\n`;
          return result;
        }

        const newLines = content.split("\n");
        result += `${successColor(
          `✓ Inserting ${newLines.length} line${newLines.length > 1 ? "s" : ""}`
        )}\n\n`;

        const showStart = Math.max(0, lineNumber - 1 - contextLines);
        const showEnd = Math.min(
          lines.length - 1,
          lineNumber - 1 + contextLines
        );

        // Show context before
        for (let i = showStart; i < lineNumber - 1; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(` ${lineNumStr}`)} ${highlighted}\n`;
          } catch {
            result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
          }
        }

        // Show inserted lines
        for (let i = 0; i < newLines.length; i++) {
          const lineNumStr = String(lineNumber + i).padStart(4, " ");
          try {
            const highlighted = highlight(newLines[i], {
              language,
              theme: "default",
            });
            result += `${secondaryColor(lineNumStr)} ${addedLineColor(
              `+ ${highlighted}`
            )}\n`;
          } catch {
            result += `${secondaryColor(lineNumStr)} ${addedLineColor(
              `+ ${newLines[i]}`
            )}\n`;
          }
        }

        // Show context after
        for (let i = lineNumber - 1; i <= showEnd; i++) {
          const lineNumStr = String(i + newLines.length + 1).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(` ${lineNumStr}`)} ${highlighted}\n`;
          } catch {
            result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
          }
        }
        break;
      }

      case "replace": {
        const newLines = content.split("\n");
        const linesToRemove = endLine - lineNumber + 1;
        result += `${successColor(
          `✓ Replacing ${linesToRemove} line${
            linesToRemove > 1 ? "s" : ""
          } with ${newLines.length} line${newLines.length > 1 ? "s" : ""}`
        )}\n\n`;

        const showStart = Math.max(0, lineNumber - 1 - contextLines);
        const showEnd = Math.min(lines.length - 1, endLine - 1 + contextLines);

        // Show context before
        for (let i = showStart; i < lineNumber - 1; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(` ${lineNumStr}`)} ${highlighted}\n`;
          } catch {
            result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
          }
        }

        // Show removed lines
        for (let i = lineNumber - 1; i < endLine; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(lineNumStr)} ${removedLineColor(
              `- ${highlighted}`
            )}\n`;
          } catch {
            result += `${secondaryColor(lineNumStr)} ${removedLineColor(
              `- ${line}`
            )}\n`;
          }
        }

        // Show added lines
        for (let i = 0; i < newLines.length; i++) {
          const lineNumStr = String(lineNumber + i).padStart(4, " ");
          try {
            const highlighted = highlight(newLines[i], {
              language,
              theme: "default",
            });
            result += `${secondaryColor(lineNumStr)} ${addedLineColor(
              `+ ${highlighted}`
            )}\n`;
          } catch {
            result += `${secondaryColor(lineNumStr)} ${addedLineColor(
              `+ ${newLines[i]}`
            )}\n`;
          }
        }

        // Show context after
        for (let i = endLine; i <= showEnd; i++) {
          const lineNumStr = String(
            i + newLines.length - linesToRemove + 1
          ).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(` ${lineNumStr}`)} ${highlighted}\n`;
          } catch {
            result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
          }
        }
        break;
      }

      case "delete": {
        const linesToRemove = endLine - lineNumber + 1;
        result += `${successColor(
          `✓ Deleting ${linesToRemove} line${linesToRemove > 1 ? "s" : ""}`
        )}\n\n`;

        const showStart = Math.max(0, lineNumber - 1 - contextLines);
        const showEnd = Math.min(lines.length - 1, endLine - 1 + contextLines);

        // Show context before
        for (let i = showStart; i < lineNumber - 1; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(` ${lineNumStr}`)} ${highlighted}\n`;
          } catch {
            result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
          }
        }

        // Show deleted lines
        for (let i = lineNumber - 1; i < endLine; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(lineNumStr)} ${removedLineColor(
              `- ${highlighted}`
            )}\n`;
          } catch {
            result += `${secondaryColor(lineNumStr)} ${removedLineColor(
              `- ${line}`
            )}\n`;
          }
        }

        // Show context after
        for (let i = endLine; i <= showEnd; i++) {
          const lineNumStr = String(i - linesToRemove + 1).padStart(4, " ");
          const line = lines[i] || "";
          try {
            const highlighted = highlight(line, { language, theme: "default" });
            result += `${secondaryColor(` ${lineNumStr}`)} ${highlighted}\n`;
          } catch {
            result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
          }
        }
        break;
      }

      case "move": {
        if (!targetLine || targetLine < 1 || targetLine > lines.length + 1) {
          result += `${errorColor("✗")} Target line ${targetLine} is invalid\n`;
          return result;
        }

        const linesToMove = endLine - lineNumber + 1;
        result += `${successColor(
          `✓ Moving ${linesToMove} line${
            linesToMove > 1 ? "s" : ""
          } to line ${targetLine}`
        )}\n\n`;

        // Show source location
        result += `${secondaryColor("From:")}\n`;
        const sourceStart = Math.max(0, lineNumber - 1 - contextLines);
        const sourceEnd = Math.min(
          lines.length - 1,
          endLine - 1 + contextLines
        );

        for (let i = sourceStart; i < lineNumber - 1; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
        }

        for (let i = lineNumber - 1; i < endLine; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          result += `${secondaryColor(lineNumStr)} ${removedLineColor(
            `- ${line}`
          )}\n`;
        }

        for (let i = endLine; i <= sourceEnd; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
        }

        // Show target location
        result += `\n${secondaryColor("To:")}\n`;
        const targetStart = Math.max(0, targetLine - 1 - contextLines);
        const targetEnd = Math.min(
          lines.length - 1,
          targetLine - 1 + contextLines
        );

        for (let i = targetStart; i < targetLine - 1; i++) {
          const lineNumStr = String(i + 1).padStart(4, " ");
          const line = lines[i] || "";
          result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
        }

        for (let i = lineNumber - 1; i < endLine; i++) {
          const lineNumStr = String(targetLine + (i - lineNumber + 1)).padStart(
            4,
            " "
          );
          const line = lines[i] || "";
          result += `${secondaryColor(lineNumStr)} ${addedLineColor(
            `+ ${line}`
          )}\n`;
        }

        for (let i = targetLine - 1; i <= targetEnd; i++) {
          const lineNumStr = String(i + linesToMove + 1).padStart(4, " ");
          const line = lines[i] || "";
          result += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
        }
        break;
      }
    }
  } catch (error) {
    result += `${errorColor("Error:")} ${
      error instanceof Error ? error.message : String(error)
    }`;
  }

  return result;
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
