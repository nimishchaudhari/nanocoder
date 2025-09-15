import type {Message, ToolResult} from '../../types/index.js';

/**
 * Formats tool results appropriately for different model types
 * - Non-tool-calling models: assistant messages with natural language
 * - Tool-calling models: standard tool messages
 */
export function formatToolResultsForModel(
	results: ToolResult[],
	assistantMsg: Message,
): Message[] {
	// Detect if this is a non-tool-calling model that needs special formatting
	// We can detect this by checking if the assistant message has no tool_calls
	// (meaning the tools were parsed from content rather than native tool calling)
	const isNonToolCallingModel = !assistantMsg.tool_calls;

	return results.map(result => {
		// For non-tool-calling models, format as assistant message with natural language
		if (isNonToolCallingModel && result.content) {
			// Parse the tool result to extract the actual output
			let toolOutput = result.content;

			// Format as natural language response
			const actionMap: Record<string, string> = {
				read_file: 'read the file',
				execute_bash: 'executed the command',
				create_file: 'created the file',
				edit_file: 'edited the file',
			};
			const action = actionMap[result.name] || `used ${result.name}`;

			return {
				role: 'assistant' as const,
				content: `I ${action} and here are the results:\n\n${toolOutput}`,
			};
		}

		// For tool-calling models, use standard tool message format
		return {
			role: 'tool' as const,
			content: result.content || '',
			tool_call_id: result.tool_call_id,
			name: result.name,
		};
	});
}
