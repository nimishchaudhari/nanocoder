import type {ToolCall, ToolResult, ToolHandler} from '@/types/index';
import type {ToolManager} from '@/tools/tool-manager';

// This will be set by the ChatSession
let toolRegistryGetter: (() => Record<string, ToolHandler>) | null = null;

// This will be set by the App
let toolManagerGetter: (() => ToolManager | null) | null = null;

export function setToolRegistryGetter(
	getter: () => Record<string, ToolHandler>,
) {
	toolRegistryGetter = getter;
}

export function setToolManagerGetter(getter: () => ToolManager | null) {
	toolManagerGetter = getter;
}

export function getToolManager(): ToolManager | null {
	return toolManagerGetter ? toolManagerGetter() : null;
}

export async function processToolUse(toolCall: ToolCall): Promise<ToolResult> {
	if (!toolRegistryGetter) {
		throw new Error('Tool registry not initialized');
	}

	const toolRegistry = toolRegistryGetter();
	const handler = toolRegistry[toolCall.function.name];
	if (!handler) {
		throw new Error(`Unknown tool: ${toolCall.function.name}`);
	}

	try {
		// Parse arguments if they're a JSON string
		let parsedArgs = toolCall.function.arguments;
		if (typeof parsedArgs === 'string') {
			try {
				parsedArgs = JSON.parse(parsedArgs);
			} catch (e) {
				throw new Error(`Invalid tool arguments: ${(e as Error).message}`);
			}
		}
		const result = await handler(parsedArgs);
		return {
			tool_call_id: toolCall.id,
			role: 'tool',
			name: toolCall.function.name,
			content: result,
		};
	} catch (error) {
		// Convert exceptions to error messages that the model can see and correct
		const errorMessage = `Error: ${
			error instanceof Error ? error.message : String(error)
		}`;
		return {
			tool_call_id: toolCall.id,
			role: 'tool',
			name: toolCall.function.name,
			content: errorMessage,
		};
	}
}
