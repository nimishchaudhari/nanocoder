import { highlight } from 'cli-highlight';
import { diffLines } from 'diff';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { primaryColor, secondaryColor, toolColor, successColor, errorColor } from './colors.js';
import type { ToolCall } from '../types/index.js';

export async function formatToolCall(toolCall: ToolCall): Promise<string> {
  const { name, arguments: args } = toolCall.function;
  
  switch (name) {
    case 'write_file':
      return await formatWriteFile(args);
    case 'read_file':
      return formatReadFile(args);
    case 'execute_bash':
      return formatBashCommand(args);
    default:
      return formatGenericTool(name, args);
  }
}

async function formatWriteFile(args: any): Promise<string> {
  const path = args.path || args.file_path || 'unknown';
  const newContent = args.content || '';
  const lineCount = newContent.split('\n').length;
  
  let result = `${toolColor('⚒ write_file')}\n`;
  result += `${secondaryColor('Path:')} ${primaryColor(path)}\n`;
  
  // Try to read existing file for diff
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
    
    // Generate diff
    const diff = diffLines(existingContent, newContent);
    const ext = path.split('.').pop()?.toLowerCase();
    const language = getLanguageFromExtension(ext);
    
    result += `${secondaryColor('Changes:')}\n`;
    
    let addedLines = 0;
    let removedLines = 0;
    let contextLines = 0;
    let diffOutput = '';
    
    for (const part of diff) {
      if (part.added) {
        addedLines += part.count || 0;
        const lines = part.value.split('\n').filter(line => line !== '');
        for (const line of lines) {
          try {
            const highlighted = highlight(line, { language, theme: 'default' });
            diffOutput += `${successColor('+ ')}${highlighted}\n`;
          } catch {
            diffOutput += `${successColor('+ ')}${line}\n`;
          }
        }
      } else if (part.removed) {
        removedLines += part.count || 0;
        const lines = part.value.split('\n').filter(line => line !== '');
        for (const line of lines) {
          try {
            const highlighted = highlight(line, { language, theme: 'default' });
            diffOutput += `${errorColor('- ')}${highlighted}\n`;
          } catch {
            diffOutput += `${errorColor('- ')}${line}\n`;
          }
        }
      } else {
        // Context lines - show only a few
        const lines = part.value.split('\n').filter(line => line !== '');
        const maxContext = 3;
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
    
    // Summary
    result += `${successColor(`+${addedLines} lines`)} ${errorColor(`-${removedLines} lines`)}\n\n`;
    result += diffOutput;
    
  } catch {
    // File doesn't exist, show as new file
    result += `${secondaryColor('Change:')} ${successColor(`+${lineCount} lines (new file)`)}\n`;
    
    // Show preview of new content
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
}

function formatReadFile(args: any): string {
  const path = args.path || args.file_path || 'unknown';
  let result = `${toolColor('⚒ read_file')}\n`;
  result += `${secondaryColor('Path:')} ${primaryColor(path)}`;
  
  if (args.offset || args.limit) {
    result += `\n${secondaryColor('Range:')} `;
    if (args.offset) result += `from line ${args.offset} `;
    if (args.limit) result += `(${args.limit} lines)`;
  }
  
  return result;
}

function formatBashCommand(args: any): string {
  const command = args.command || 'unknown';
  let result = `${toolColor('⚒ execute_bash')}\n`;
  result += `${secondaryColor('Command:')} `;
  
  try {
    const highlighted = highlight(command, { language: 'bash', theme: 'default' });
    result += highlighted;
  } catch {
    result += `${primaryColor(command)}`;
  }
  
  return result;
}


function formatGenericTool(name: string, args: any): string {
  let result = `${toolColor('⚒ ' + name)}\n`;
  
  // Show key arguments in a nice format
  const entries = Object.entries(args);
  if (entries.length === 0) {
    return result.slice(0, -1); // Remove trailing newline
  }
  
  for (const [key, value] of entries) {
    if (typeof value === 'string' && value.length > 100) {
      result += `${secondaryColor(key + ':')} ${value.slice(0, 100)}...\n`;
    } else if (typeof value === 'object') {
      result += `${secondaryColor(key + ':')} ${JSON.stringify(value, null, 2)}\n`;
    } else {
      result += `${secondaryColor(key + ':')} ${primaryColor(String(value))}\n`;
    }
  }
  
  return result.slice(0, -1); // Remove trailing newline
}

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