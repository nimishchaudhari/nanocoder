import {ReactNode} from 'react';
import {ToolCall, LLMClient} from '@/types/core';
import {CustomCommand} from '@/types/commands';

export interface AssistantMessageProps {
	message: string;
	model: string;
}

export interface BashExecutionIndicatorProps {
	command: string;
}

export interface ChatQueueProps {
	staticComponents?: ReactNode[];
	queuedComponents?: ReactNode[];
}

export interface ChatProps {
	onSubmit?: (message: string) => void;
	placeholder?: string;
	customCommands?: string[];
	disabled?: boolean;
	onCancel?: () => void;
}

export type Completion = {name: string; isCustom: boolean};

export interface CustomCommandsProps {
	commands: CustomCommand[];
}

export interface ModelSelectorProps {
	client: LLMClient | null;
	currentModel: string;
	onModelSelect: (model: string) => void;
	onCancel: () => void;
}

export interface ModelOption {
	value: string;
	label: string;
	description?: string;
}

export interface ProviderSelectorProps {
	currentProvider: string;
	onProviderSelect: (provider: string) => void;
	onCancel: () => void;
}

export interface ProviderOption {
	value: string;
	label: string;
	available: boolean;
}

export interface StatusProps {
	conversationContext: any;
	currentProvider: string;
	currentModel: string;
	updateInfo?: any;
}

export interface ToolConfirmationProps {
	toolCall: ToolCall;
	onConfirm: (confirmed: boolean) => void;
	onCancel: () => void;
}

export interface ConfirmationOption {
	key: string;
	label: string;
	action: () => void;
}

export interface ToolExecutionIndicatorProps {
	toolName: string;
	currentIndex: number;
	totalTools: number;
}

export interface UserMessageProps {
	message: string;
}

export interface MCPProps {
	mcpServers: any[];
}

export interface DebugProps {
	messages: any[];
}
