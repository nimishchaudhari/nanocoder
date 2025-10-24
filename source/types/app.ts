import React from 'react';
import {CustomCommandLoader} from '@/custom-commands/loader';
import {CustomCommandExecutor} from '@/custom-commands/executor';

export interface MessageSubmissionOptions {
	customCommandCache: Map<string, any>;
	customCommandLoader: CustomCommandLoader | null;
	customCommandExecutor: CustomCommandExecutor | null;
	onClearMessages: () => Promise<void>;
	onEnterModelSelectionMode: () => void;
	onEnterProviderSelectionMode: () => void;
	onEnterThemeSelectionMode: () => void;
	onEnterRecommendationsMode: () => void;
	onEnterConfigWizardMode: () => void;
	onShowStatus: () => void;
	onHandleChatMessage: (message: string) => Promise<void>;
	onAddToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	setMessages: (messages: any[]) => void;
	messages: any[];
	setIsBashExecuting: (executing: boolean) => void;
	setCurrentBashCommand: (command: string) => void;
	provider: string;
	model: string;
	theme: string;
	updateInfo: any;
	getMessageTokens: (message: any) => number;
}
