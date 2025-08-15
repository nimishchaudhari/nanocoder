import type { ToolCall } from '../types/index.js';
import { toolFormatters } from '../core/tools/index.js';
import { toolColor, secondaryColor, primaryColor } from './colors.js';

export async function formatToolCall(toolCall: ToolCall): Promise<string> {
  const { name, arguments: args } = toolCall.function;
  
  // Find the formatter for this tool
  const formatter = toolFormatters[name];
  
  if (formatter) {
    // Use custom formatter
    const result = formatter(args);
    return typeof result === 'string' ? result : await result;
  }
  
  // Fall back to generic formatter
  return formatGenericTool(name, args);
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