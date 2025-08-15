import { resolve } from "node:path";
import { writeFile, readFile } from "node:fs/promises";
import { highlight } from 'cli-highlight';
import { diffLines } from 'diff';
import type { ToolHandler, ToolDefinition } from "../../types/index.js";
import { toolColor, secondaryColor, primaryColor, successColor, errorColor, addedLineColor, removedLineColor } from "../../ui/colors.js";

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
  const path = args.path || args.file_path || 'unknown';
  const newContent = args.content || '';
  const lineCount = newContent.split('\n').length;
  
  let result = `${toolColor('⚒ write_file')}\n`;
  result += `${secondaryColor('Path:')} ${primaryColor(path)}\n`;
  
  try {
    const existingContent = await readFile(resolve(path), 'utf-8');
    const existingLines = existingContent.split('\n').length;
    const netChange = lineCount - existingLines;
    
    if (netChange > 0) {
      result += `${secondaryColor('Change:')} ${successColor(`+${netChange} lines`)}\n`;
    } else if (netChange < 0) {
      result += `${secondaryColor('Change:')} ${errorColor(`${netChange} lines`)}\n`;
    } else {
      result += `${secondaryColor('Change:')} ${secondaryColor('±0 lines')}\n`;
    }
    
    const diff = diffLines(existingContent, newContent);
    const ext = path.split('.').pop()?.toLowerCase();
    const language = getLanguageFromExtension(ext);
    
    result += `${secondaryColor('Changes:')}\n`;
    
    let addedLines = 0;
    let removedLines = 0;
    let contextLines = 0;
    let diffOutput = '';
    
    const contextLinesBeforeAfter = 3;
    
    for (let i = 0; i < diff.length; i++) {
      const part = diff[i];
      if (!part) continue;
      
      const prevPart = diff[i - 1];
      const nextPart = diff[i + 1];
      const hasChangesBefore = prevPart && (prevPart.added || prevPart.removed);
      const hasChangesAfter = nextPart && (nextPart.added || nextPart.removed);
      
      if (part.added) {
        addedLines += part.count || 0;
        const lines = part.value.split('\n').filter(line => line !== '');
        for (const line of lines) {
          diffOutput += `${addedLineColor('+ ' + line)}\n`;
        }
      } else if (part.removed) {
        removedLines += part.count || 0;
        const lines = part.value.split('\n').filter(line => line !== '');
        for (const line of lines) {
          diffOutput += `${removedLineColor('- ' + line)}\n`;
        }
      } else {
        const lines = part.value.split('\n').filter(line => line !== '');
        
        if (hasChangesBefore && hasChangesAfter) {
          const maxBetween = Math.min(6, lines.length);
          const showLines = lines.slice(0, maxBetween);
          contextLines += showLines.length;
          
          for (const line of showLines) {
            try {
              const highlighted = highlight(line, { language, theme: 'default' });
              diffOutput += `  ${highlighted}\n`;
            } catch {
              diffOutput += `  ${line}\n`;
            }
          }
          
          if (lines.length > maxBetween) {
            diffOutput += `${secondaryColor('  ... (' + (lines.length - maxBetween) + ' unchanged lines)')}\n`;
          }
        } else if (hasChangesBefore) {
          const showLines = lines.slice(0, contextLinesBeforeAfter);
          contextLines += showLines.length;
          
          for (const line of showLines) {
            try {
              const highlighted = highlight(line, { language, theme: 'default' });
              diffOutput += `  ${highlighted}\n`;
            } catch {
              diffOutput += `  ${line}\n`;
            }
          }
          
          if (lines.length > contextLinesBeforeAfter) {
            diffOutput += `${secondaryColor('  ... (' + (lines.length - contextLinesBeforeAfter) + ' unchanged lines)')}\n`;
          }
        } else if (hasChangesAfter) {
          const startIndex = Math.max(0, lines.length - contextLinesBeforeAfter);
          const showLines = lines.slice(startIndex);
          contextLines += showLines.length;
          
          if (startIndex > 0) {
            diffOutput += `${secondaryColor('  ... (' + startIndex + ' unchanged lines)')}\n`;
          }
          
          for (const line of showLines) {
            try {
              const highlighted = highlight(line, { language, theme: 'default' });
              diffOutput += `  ${highlighted}\n`;
            } catch {
              diffOutput += `  ${line}\n`;
            }
          }
        } else {
          const maxContext = 2;
          const showLines = lines.slice(0, maxContext);
          contextLines += showLines.length;
          
          for (const line of showLines) {
            try {
              const highlighted = highlight(line, { language, theme: 'default' });
              diffOutput += `  ${highlighted}\n`;
            } catch {
              diffOutput += `  ${line}\n`;
            }
          }
          
          if (lines.length > maxContext) {
            diffOutput += `${secondaryColor('  ... (' + (lines.length - maxContext) + ' unchanged lines)')}\n`;
          }
        }
      }
    }
    
    result += `${successColor(`+${addedLines} lines`)} ${errorColor(`-${removedLines} lines`)}\n\n`;
    result += diffOutput;
    
  } catch {
    result += `${secondaryColor('Change:')} ${successColor(`+${lineCount} lines (new file)`)}\n`;
    
    if (newContent.length > 0) {
      const ext = path.split('.').pop()?.toLowerCase();
      const language = getLanguageFromExtension(ext);
      
      const preview = newContent.split('\n').slice(0, 10).join('\n');
      const truncated = newContent.split('\n').length > 10;
      
      try {
        const highlighted = highlight(preview, { language, theme: 'default' });
        result += `${secondaryColor('Content preview:')}\n`;
        result += `${highlighted}`;
        if (truncated) {
          result += `\n${secondaryColor('... (' + (lineCount - 10) + ' more lines)')}`;
        }
      } catch {
        result += `${secondaryColor('Content:')} ${newContent.length} characters`;
      }
    }
  }
  
  return result;
};

function getLanguageFromExtension(ext?: string): string {
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript', 
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'md': 'markdown',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'bash',
    'sql': 'sql',
  };
  
  return languageMap[ext || ''] || 'javascript';
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

