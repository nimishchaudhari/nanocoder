import React from 'react';

/**
 * Phase 1 Migration Note:
 *
 * AI SDK provides native types that we should migrate to:
 * - ModelMessage (union of SystemModelMessage | UserModelMessage | AssistantModelMessage | ToolModelMessage)
 * - Tool (from AI SDK with execute functions)
 *
 * Current differences to address in Phase 2-3:
 * 1. AI SDK's ToolModelMessage.content is ToolContent (array of parts), not string
 * 2. AI SDK's AssistantModelMessage uses 'content' array, not tool_calls
 * 3. Tool definitions use tool() helper with inputSchema and execute
 *
 * For now, keeping custom types for backward compatibility.
 */

// Import AI SDK types for reference and future migration
import type {
	ModelMessage as AISDKModelMessage,
	SystemModelMessage as AISDKSystemMessage,
	UserModelMessage as AISDKUserMessage,
	AssistantModelMessage as AISDKAssistantMessage,
	ToolModelMessage as AISDKToolMessage,
	Tool as AISDKTool,
} from 'ai';

// Import AI SDK helpers for Phase 2 (tool definitions)
export {tool, jsonSchema} from 'ai';
// zodSchema available but not exported yet (use jsonSchema for now)

// Export AI SDK types for use in Phase 2-3
export type {
	AISDKModelMessage,
	AISDKSystemMessage,
	AISDKUserMessage,
	AISDKAssistantMessage,
	AISDKToolMessage,
	AISDKTool,
};

// Current Nanocoder message format (OpenAI-compatible)
// TODO Phase 3: Migrate to AISDKModelMessage
export interface Message {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
	name?: string;
}

export interface ToolCall {
	id: string;
	function: {
		name: string;
		arguments: Record<string, unknown>;
	};
}

export interface ToolResult {
	tool_call_id: string;
	role: 'tool';
	name: string;
	content: string;
}

export interface ToolParameterSchema {
	type?: string;
	description?: string;
	[key: string]: unknown;
}

export interface Tool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, ToolParameterSchema>;
			required: string[];
		};
	};
}

// Tool handlers accept dynamic args from LLM, so any is appropriate here
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
export type ToolHandler = (input: any) => Promise<string>;

export interface ToolDefinition {
	handler: ToolHandler;
	config: Tool;
	formatter?: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
		args: any,
		result?: string,
	) =>
		| string
		| Promise<string>
		| React.ReactElement
		| Promise<React.ReactElement>;
	requiresConfirmation?: boolean;
	validator?: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
		args: any,
	) => Promise<{valid: true} | {valid: false; error: string}>;
}

interface LLMMessage {
	role: 'assistant';
	content: string;
	tool_calls?: ToolCall[];
}

export interface LLMChatResponse {
	choices: Array<{
		message: LLMMessage;
	}>;
}

export interface LLMClient {
	getCurrentModel(): string;
	setModel(model: string): void;
	getContextSize(): number;
	getAvailableModels(): Promise<string[]>;
	chat(
		messages: Message[],
		tools: Tool[],
		signal?: AbortSignal,
	): Promise<LLMChatResponse>;
	clearContext(): Promise<void>;
}

export type DevelopmentMode = 'normal' | 'auto-accept' | 'plan';

export const DEVELOPMENT_MODE_LABELS: Record<DevelopmentMode, string> = {
	normal: '▶ normal mode on',
	'auto-accept': '⏵⏵ auto-accept mode on',
	plan: '⏸ plan mode on',
};
