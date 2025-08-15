import { resolve } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { highlight } from "cli-highlight";
import { diffLines } from "diff";
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

const handler: ToolHandler = async (args: {
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

const formatter = async (args: any): Promise<string> => {
  const path = args.path || args.file_path || "unknown";
  const newContent = args.content || "";
  const lineCount = newContent.split("\n").length;

  let result = `${toolColor("⚒ write_file")}\n`;
  result += `${secondaryColor("Path:")} ${primaryColor(path)}\n`;

  try {
    const existingContent = await readFile(resolve(path), "utf-8");

    const diff = diffLines(existingContent, newContent);
    const ext = path.split(".").pop()?.toLowerCase();
    const language = getLanguageFromExtension(ext);

    result += `${secondaryColor("Changes:")}\n`;

    let addedLines = 0;
    let removedLines = 0;
    let contextLines = 0;
    let diffOutput = "";

    const contextLinesBeforeAfter = 3;

    // Track line numbers for old and new content
    let oldLineNumber = 1;
    let newLineNumber = 1;

    for (let i = 0; i < diff.length; i++) {
      const part = diff[i];
      if (!part) continue;

      const prevPart = diff[i - 1];
      const nextPart = diff[i + 1];
      const hasChangesBefore = prevPart && (prevPart.added || prevPart.removed);
      const hasChangesAfter = nextPart && (nextPart.added || nextPart.removed);

      if (part.added) {
        addedLines += part.count || 0;
        const lines = part.value.split("\n");
        // Remove only the last empty line if it exists (from splitting)
        if (lines.length > 0 && lines[lines.length - 1] === "") {
          lines.pop();
        }
        for (const line of lines) {
          const lineNumStr = String(newLineNumber).padStart(4, " ");
          diffOutput += `${secondaryColor(lineNumStr)} ${addedLineColor(
            `+ ${line}`
          )}\n`;
          newLineNumber++;
        }
      } else if (part.removed) {
        removedLines += part.count || 0;
        const lines = part.value.split("\n");
        // Remove only the last empty line if it exists (from splitting)
        if (lines.length > 0 && lines[lines.length - 1] === "") {
          lines.pop();
        }
        for (const line of lines) {
          const lineNumStr = String(oldLineNumber).padStart(4, " ");
          diffOutput += `${secondaryColor(lineNumStr)} ${removedLineColor(
            `- ${line}`
          )}\n`;
          oldLineNumber++;
        }
      } else {
        const lines = part.value.split("\n");
        // Remove only the last empty line if it exists (from splitting)
        if (lines.length > 0 && lines[lines.length - 1] === "") {
          lines.pop();
        }

        if (hasChangesBefore && hasChangesAfter) {
          const maxBetween = Math.min(6, lines.length);
          const showLines = lines.slice(0, maxBetween);
          contextLines += showLines.length;

          for (const line of showLines) {
            const lineNumStr = String(oldLineNumber).padStart(4, " ");
            try {
              const highlighted = highlight(line, {
                language,
                theme: "default",
              });
              diffOutput += `${secondaryColor(
                ` ${lineNumStr}`
              )} ${highlighted}\n`;
            } catch {
              diffOutput += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
            }
            oldLineNumber++;
            newLineNumber++;
          }

          if (lines.length > maxBetween) {
            const skippedLines = lines.length - maxBetween;
            oldLineNumber += skippedLines;
            newLineNumber += skippedLines;
            diffOutput += `${secondaryColor(
              "  ... (" + skippedLines + " unchanged lines)"
            )}\n`;
          }
        } else if (hasChangesBefore) {
          const showLines = lines.slice(0, contextLinesBeforeAfter);
          contextLines += showLines.length;

          for (const line of showLines) {
            const lineNumStr = String(oldLineNumber).padStart(4, " ");
            try {
              const highlighted = highlight(line, {
                language,
                theme: "default",
              });
              diffOutput += `${secondaryColor(
                ` ${lineNumStr}`
              )} ${highlighted}\n`;
            } catch {
              diffOutput += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
            }
            oldLineNumber++;
            newLineNumber++;
          }

          if (lines.length > contextLinesBeforeAfter) {
            const skippedLines = lines.length - contextLinesBeforeAfter;
            oldLineNumber += skippedLines;
            newLineNumber += skippedLines;
            diffOutput += `${secondaryColor(
              "  ... (" + skippedLines + " unchanged lines)"
            )}\n`;
          }
        } else if (hasChangesAfter) {
          const startIndex = Math.max(
            0,
            lines.length - contextLinesBeforeAfter
          );
          const showLines = lines.slice(startIndex);
          contextLines += showLines.length;

          if (startIndex > 0) {
            oldLineNumber += startIndex;
            newLineNumber += startIndex;
            diffOutput += `${secondaryColor(
              "  ... (" + startIndex + " unchanged lines)"
            )}\n`;
          }

          for (const line of showLines) {
            const lineNumStr = String(oldLineNumber).padStart(4, " ");
            try {
              const highlighted = highlight(line, {
                language,
                theme: "default",
              });
              diffOutput += `${secondaryColor(
                ` ${lineNumStr}`
              )} ${highlighted}\n`;
            } catch {
              diffOutput += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
            }
            oldLineNumber++;
            newLineNumber++;
          }
        } else {
          const maxContext = 2;
          const showLines = lines.slice(0, maxContext);
          contextLines += showLines.length;

          for (const line of showLines) {
            const lineNumStr = String(oldLineNumber).padStart(4, " ");
            try {
              const highlighted = highlight(line, {
                language,
                theme: "default",
              });
              diffOutput += `${secondaryColor(
                ` ${lineNumStr}`
              )} ${highlighted}\n`;
            } catch {
              diffOutput += `${secondaryColor(` ${lineNumStr}`)} ${line}\n`;
            }
            oldLineNumber++;
            newLineNumber++;
          }

          if (lines.length > maxContext) {
            const skippedLines = lines.length - maxContext;
            oldLineNumber += skippedLines;
            newLineNumber += skippedLines;
            diffOutput += `${secondaryColor(
              "  ... (" + skippedLines + " unchanged lines)"
            )}\n`;
          }
        }
      }
    }

    result += `${successColor(`+${addedLines} lines`)} ${errorColor(
      `-${removedLines} lines`
    )}\n\n`;
    result += diffOutput;
  } catch {
    result += `${secondaryColor("Change:")} ${successColor(
      `+${lineCount} lines (new file)`
    )}\n`;

    if (newContent.length > 0) {
      const ext = path.split(".").pop()?.toLowerCase();
      const language = getLanguageFromExtension(ext);

      const preview = newContent.split("\n").slice(0, 10).join("\n");
      const truncated = newContent.split("\n").length > 10;

      try {
        const highlighted = highlight(preview, { language, theme: "default" });
        result += `${secondaryColor("Content preview:")}\n`;
        result += `${highlighted}`;
        if (truncated) {
          result += `\n${secondaryColor(
            "... (" + (lineCount - 10) + " more lines)"
          )}`;
        }
      } catch {
        result += `${secondaryColor("Content:")} ${
          newContent.length
        } characters`;
      }
    }
  }

  return result;
};

function getLanguageFromExtension(ext?: string): string {
  const languageMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    cpp: "cpp",
    c: "c",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    sql: "sql",
  };

  return languageMap[ext || ""] || "javascript";
}

export const writeFileTool: ToolDefinition = {
  handler,
  formatter,
  config: {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file (overwrites existing content)",
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
