import type { EditMode } from "./types.js";

export function generatePostEditContext(
  lines: string[],
  editStartLine: number,
  editEndLine: number,
  mode: EditMode
): string {
  const totalLines = lines.length;
  
  let result = `\n\nCurrent file state (${totalLines} total lines):\n`;
  
  // Show the entire file with line numbers
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const isInEditRange = lineNum >= editStartLine && lineNum <= editEndLine;
    const marker = isInEditRange ? "→" : " ";
    result += `${lineNum.toString().padStart(3, " ")}${marker}${lines[i] || ""}\n`;
  }
  
  return result;
}

export function calculateActualEditRange(
  mode: EditMode,
  lineNum: number,
  endLineArg: number | undefined,
  content: string,
  targetLine?: number
): { startLine: number; endLine: number } {
  // Calculate the actual affected line range in the new file
  let actualStartLine = lineNum || 1;
  let actualEndLine = endLineArg || lineNum || 1;
  
  switch (mode) {
    case "insert": {
      const insertLines = content.split("\n");
      actualEndLine = actualStartLine + insertLines.length - 1;
      break;
    }
    case "replace": {
      const replaceLines = content.split("\n");
      actualEndLine = actualStartLine + replaceLines.length - 1;
      break;
    }
    case "delete": {
      // For delete, show context around where deletion happened
      actualEndLine = actualStartLine;
      break;
    }
    case "move": {
      const target = targetLine || 1;
      const linesToMove = (endLineArg || lineNum || 1) - (lineNum || 1) + 1;
      actualStartLine = target;
      actualEndLine = target + linesToMove - 1;
      break;
    }
  }
  
  return { startLine: actualStartLine, endLine: actualEndLine };
}