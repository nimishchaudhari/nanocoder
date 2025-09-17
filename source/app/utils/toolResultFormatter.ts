import type {Message, ToolResult} from '../../types/index.js';
import type {ConversationState} from './conversationState.js';

/**
 * Formats tool results appropriately for different model types
 * - Non-tool-calling models: Enhanced context with progress tracking
 * - Tool-calling models: standard tool messages
 */
export function formatToolResultsForModel(
	results: ToolResult[],
	assistantMsg: Message,
	taskContext?: string,
	conversationState?: ConversationState | null,
): Message[] {
	// Detect if this is a non-tool-calling model that needs special formatting
	// We can detect this by checking if the assistant message has no tool_calls
	// (meaning the tools were parsed from content rather than native tool calling)
	const isNonToolCallingModel = !assistantMsg.tool_calls;

	return results.map(result => {
		// For non-tool-calling models, format as user message with enhanced context
		if (isNonToolCallingModel && result.content) {
			let toolOutput = result.content;

			// Enhanced formatting with conversation state
			const actionMap: Record<string, string> = {
				read_file: 'file contents',
				execute_bash: 'command output',
				create_file: 'file created',
				edit_file: 'file edited',
			};
			const resultType = actionMap[result.name] || `${result.name} result`;

			// Build rich context message
			let contextMessage = `[Tool result - ${resultType}]:\n\n${toolOutput}\n\n`;

			// Add conversation state context if available
			if (conversationState?.progress) {
				const progress = conversationState.progress;
				const isGreeting = isSimpleGreeting(progress.originalTask);

				if (!isGreeting) {
					contextMessage += `--- Task Progress ---\n`;
					contextMessage += `Step ${progress.currentStep} of ~${progress.totalEstimatedSteps}\n`;
					contextMessage += `Original task: "${progress.originalTask}"\n`;

					if (progress.completedActions.length > 0) {
						contextMessage += `Recent actions: ${progress.completedActions
							.slice(-2)
							.join(', ')}\n`;
					}

					if (progress.isRepeatingAction) {
						contextMessage += `⚠️ Warning: Avoid repeating similar actions. Try a different approach.\n`;
					}

					// Provide smart continuation guidance
					contextMessage += `\nNext: `;
					if (progress.currentStep >= progress.totalEstimatedSteps * 0.8) {
						contextMessage += `You're near completion. Focus on finalizing and testing your work.\n`;
					} else if (result.name === 'read_file') {
						contextMessage += `Analyze the file contents and determine what changes are needed.\n`;
					} else if (result.name === 'execute_bash') {
						contextMessage += `Review the command output and take the next logical action.\n`;
					} else if (result.name.includes('file')) {
						contextMessage += `Consider testing or verifying your file changes.\n`;
					} else {
						contextMessage += `Use this result to continue working toward your goal.\n`;
					}

					contextMessage += `Continue working systematically toward: "${progress.originalTask}"`;
				} else {
					// For simple greetings, provide minimal guidance
					contextMessage += `[This was in response to a simple greeting - respond naturally and ask how you can help]`;
				}
			} else if (taskContext) {
				// Fallback to original simple context
				contextMessage += `[Reminder: Your original task was "${taskContext}"]\n`;
				contextMessage += `Continue working toward completing this task.`;
			} else {
				contextMessage += `[Please continue with the original request]`;
			}

			return {
				role: 'user' as const,
				content: contextMessage,
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

/**
 * Helper to detect simple greetings
 */
function isSimpleGreeting(message: string): boolean {
	const lowerMessage = message.toLowerCase().trim();
	const greetings = [
		'hi',
		'hello',
		'hey',
		'hiya',
		'howdy',
		'good morning',
		'good afternoon',
		'good evening',
		"what's up",
		'whats up',
		'sup',
		'yo',
	];

	// Check if the entire message is just a greeting (with optional punctuation)
	const cleanMessage = lowerMessage.replace(/[!?.,\s]+$/g, '');
	return (
		greetings.includes(cleanMessage) ||
		(cleanMessage.length <= 10 &&
			greetings.some(greeting => cleanMessage.includes(greeting)))
	);
}
