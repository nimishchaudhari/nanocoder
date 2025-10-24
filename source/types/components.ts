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

export type Completion = {name: string; isCustom: boolean};

export interface ToolExecutionIndicatorProps {
	toolName: string;
	currentIndex: number;
	totalTools: number;
}

export interface UserMessageProps {
	message: string;
}
