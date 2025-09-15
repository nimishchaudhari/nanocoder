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
		// For non-tool-calling models, format as user message with tool results
		// This allows the model to see the tool output as context and continue working
		if (isNonToolCallingModel && result.content) {
			// Parse the tool result to extract the actual output
			let toolOutput = result.content;

			// Format as tool result context for the model to process
			const actionMap: Record<string, string> = {
				read_file: 'file contents',
				execute_bash: 'command output',
				create_file: 'file created',
				edit_file: 'file edited',
			};
			const resultType = actionMap[result.name] || `${result.name} result`;

			return {
				role: 'user' as const,
				content: `[Tool result - ${resultType}]:\n\n${toolOutput}\n\n[Please continue with the original request]`,
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
