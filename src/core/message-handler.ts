import { toolRegistry } from "./tools/index.js";
import type { ToolCall, ToolResult } from "../types/index.js";

export async function processToolUse(toolCall: ToolCall): Promise<ToolResult> {
  const handler = toolRegistry[toolCall.function.name];
  if (!handler) {
    throw new Error(`Unknown tool: ${toolCall.function.name}`);
  }

  const result = await handler(toolCall.function.arguments);

  return {
    tool_call_id: toolCall.id,
    role: "tool",
    name: toolCall.function.name,
    content: result,
  };
}
