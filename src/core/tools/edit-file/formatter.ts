import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { highlight } from "cli-highlight";
import type { EditArgs, LineChange } from "./types.js";
import {
  toolColor,
  secondaryColor,
  primaryColor,
  successColor,
  errorColor,
  addedLineColor,
  removedLineColor,
} from "../../../ui/colors.js";
import { getLanguageFromExtension } from "../../utils/programming-language-helper.js";

export async function formatEditPreview(args: any): Promise<string> {
  const path = args.path || args.file_path || "unknown";
  const mode = args.mode || "insert";
  const lineNumber = Number(args.line_number);
  const endLine = Number(args.end_line) || lineNumber;
  const content = args.content || "";
  const targetLine = Number(args.target_line);
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
      case "find_replace":
        result += await formatFindReplacePreview({
          fileContent,
          lines,
          oldText,
          newText,
          replaceAll,
          language,
          contextLines
        });
        break;

      case "insert":
        result += await formatInsertPreview({
          lines,
          lineNumber,
          content,
          language,
          contextLines
        });
        break;

      case "replace":
        result += await formatReplacePreview({
          lines,
          lineNumber,
          endLine,
          content,
          language,
          contextLines
        });
        break;

      case "delete":
        result += await formatDeletePreview({
          lines,
          lineNumber,
          endLine,
          language,
          contextLines
        });
        break;

      case "move":
        result += await formatMovePreview({
          lines,
          lineNumber,
          endLine,
          targetLine,
          language,
          contextLines
        });
        break;
    }
  } catch (error) {
    result += `${errorColor("Error:")} ${
      error instanceof Error ? error.message : String(error)
    }`;
  }

  return result;
}

async function formatFindReplacePreview({
  fileContent,
  lines,
  oldText,
  newText,
  replaceAll,
  language,
  contextLines
}: {
  fileContent: string;
  lines: string[];
  oldText: string;
  newText: string;
  replaceAll: boolean;
  language: string;
  contextLines: number;
}): Promise<string> {
  let result = "";
  
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
  const occurrences: LineChange[] = [];

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
  
  return result;
}

async function formatInsertPreview({
  lines,
  lineNumber,
  content,
  language,
  contextLines
}: {
  lines: string[];
  lineNumber: number;
  content: string;
  language: string;
  contextLines: number;
}): Promise<string> {
  let result = "";
  
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
      const highlighted = highlight(newLines[i] || "", {
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
  
  return result;
}

async function formatReplacePreview({
  lines,
  lineNumber,
  endLine,
  content,
  language,
  contextLines
}: {
  lines: string[];
  lineNumber: number;
  endLine: number;
  content: string;
  language: string;
  contextLines: number;
}): Promise<string> {
  let result = "";
  
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
      const highlighted = highlight(newLines[i] || "", {
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
  
  return result;
}

async function formatDeletePreview({
  lines,
  lineNumber,
  endLine,
  language,
  contextLines
}: {
  lines: string[];
  lineNumber: number;
  endLine: number;
  language: string;
  contextLines: number;
}): Promise<string> {
  let result = "";
  
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
  
  return result;
}

async function formatMovePreview({
  lines,
  lineNumber,
  endLine,
  targetLine,
  language,
  contextLines
}: {
  lines: string[];
  lineNumber: number;
  endLine: number;
  targetLine: number;
  language: string;
  contextLines: number;
}): Promise<string> {
  let result = "";
  
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
  
  return result;
}