import React from 'react';

export interface UseModeHandlersProps {
	onEnterModelSelectionMode: () => void;
	onEnterProviderSelectionMode: () => void;
	onExitSelectionMode: () => void;
}

export interface UseToolHandlerProps {
	client: any;
	setIsThinking: (thinking: boolean) => void;
	onAddToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	messages: any[];
	setMessages: (messages: any[]) => void;
}

export interface UseChatHandlerProps {
	client: any;
	setIsThinking: (thinking: boolean) => void;
	onAddToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	messages: any[];
	setMessages: (messages: any[]) => void;
	setConversationContext: (context: any) => void;
}
