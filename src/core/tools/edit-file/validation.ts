import type { EditArgs, EditMode, ValidationResult } from "./types.js";

export function validateEditArgs(args: EditArgs, lines: string[]): ValidationResult {
  const { mode, line_number: lineNum, end_line: endLine, target_line: targetLine, old_text } = args;

  // For find_replace mode, validate text exists
  if (mode === "find_replace") {
    if (!old_text) {
      return { isValid: false, error: "old_text is required for find_replace mode" };
    }
    return { isValid: true };
  }

  // For line-based operations, validate line numbers
  if (!lineNum) {
    return { isValid: false, error: `line_number is required for mode "${mode}"` };
  }

  const actualEndLine = endLine ?? lineNum;

  // Validation depends on mode
  if (mode === "insert") {
    if (lineNum < 1 || lineNum > lines.length + 1) {
      return {
        isValid: false,
        error: `Line number ${lineNum} is out of range for insert (valid range: 1-${lines.length + 1})`
      };
    }
  } else {
    // For replace, delete, move - line must exist
    if (lineNum < 1 || lineNum > lines.length) {
      return {
        isValid: false,
        error: `Line number ${lineNum} is out of range (file has ${lines.length} lines)`
      };
    }

    if (actualEndLine < lineNum || actualEndLine > lines.length) {
      return {
        isValid: false,
        error: `End line ${actualEndLine} is out of range or before start line`
      };
    }
  }

  // Additional validation for move mode
  if (mode === "move") {
    if (!targetLine || targetLine < 1 || targetLine > lines.length + 1) {
      return {
        isValid: false,
        error: `Target line ${targetLine} is invalid`
      };
    }
  }

  return { isValid: true };
}

export function validateLineNumbers(
  mode: EditMode,
  lineNum: number | undefined,
  endLine: number | undefined,
  targetLine: number | undefined,
  totalLines: number
): ValidationResult {
  if (mode === "find_replace") {
    return { isValid: true };
  }

  if (!lineNum) {
    return { isValid: false, error: `line_number is required for mode "${mode}"` };
  }

  const actualEndLine = endLine ?? lineNum;

  switch (mode) {
    case "insert":
      if (lineNum < 1 || lineNum > totalLines + 1) {
        return {
          isValid: false,
          error: `Line number ${lineNum} is out of range for insert (valid range: 1-${totalLines + 1})`
        };
      }
      break;

    case "replace":
    case "delete":
    case "move":
      if (lineNum < 1 || lineNum > totalLines) {
        return {
          isValid: false,
          error: `Line number ${lineNum} is out of range (file has ${totalLines} lines)`
        };
      }

      if (actualEndLine < lineNum || actualEndLine > totalLines) {
        return {
          isValid: false,
          error: `End line ${actualEndLine} is out of range or before start line`
        };
      }

      if (mode === "move") {
        if (!targetLine || targetLine < 1 || targetLine > totalLines + 1) {
          return {
            isValid: false,
            error: `Target line ${targetLine} is invalid`
          };
        }
      }
      break;
  }

  return { isValid: true };
}