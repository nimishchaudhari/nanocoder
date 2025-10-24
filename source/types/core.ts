import React from 'react';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolHandler = (input: any) => Promise<string>;

export interface ToolDefinition {
	handler: ToolHandler;
	config: Tool;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	formatter?: (
		args: any,
		result?: string,
	) =>
		| string
		| Promise<string>
		| React.ReactElement
		| Promise<React.ReactElement>;
	requiresConfirmation?: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	validator?: (
		args: any,
	) => Promise<{valid: true} | {valid: false; error: string}>;
}

export interface LLMMessage {
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
