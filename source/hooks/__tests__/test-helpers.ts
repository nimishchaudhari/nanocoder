import type {Message, ToolCall} from '@/types/core';
import type {ConversationContext} from '@/hooks/useAppState';

// Helper function to create a mock tool call
export function createMockToolCall(
	id: string,
	name: string,
	args: Record<string, any> = {},
): ToolCall {
	return {
		id,
		function: {
			name,
			arguments: args,
		},
	};
}

// Helper function to create a mock conversation context
export function createMockConversationContext(
	userMessage: string,
	assistantMessage: string,
	toolCalls: ToolCall[],
): ConversationContext {
	const userMsg: Message = {
		role: 'user',
		content: userMessage,
	};

	const assistantMsg: Message = {
		role: 'assistant',
		content: assistantMessage,
		tool_calls: toolCalls,
	};

	const systemMsg: Message = {
		role: 'system',
		content: 'System prompt',
	};

	return {
		updatedMessages: [userMsg],
		assistantMsg,
		systemMessage: systemMsg,
	};
}
