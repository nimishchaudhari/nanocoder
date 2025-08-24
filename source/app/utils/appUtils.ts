import React from 'react';
import {commandRegistry} from '../../commands.js';
import {CustomCommandLoader} from '../../custom-commands/loader.js';
import {CustomCommandExecutor} from '../../custom-commands/executor.js';

export interface MessageSubmissionOptions {
	customCommandCache: Map<string, any>;
	customCommandLoader: CustomCommandLoader | null;
	customCommandExecutor: CustomCommandExecutor | null;
	onClearMessages: () => Promise<void>;
	onEnterModelSelectionMode: () => void;
	onEnterProviderSelectionMode: () => void;
	onHandleChatMessage: (message: string) => Promise<void>;
	onAddToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
}

export async function handleMessageSubmission(
	message: string,
	options: MessageSubmissionOptions
): Promise<void> {
	const {
		customCommandCache,
		customCommandLoader,
		customCommandExecutor,
		onClearMessages,
		onEnterModelSelectionMode,
		onEnterProviderSelectionMode,
		onHandleChatMessage,
		onAddToChatQueue,
		componentKeyCounter,
	} = options;

	if (message.startsWith('/')) {
		const commandName = message.slice(1).split(' ')[0];

		// Check for custom command first
		const customCommand =
			customCommandCache.get(commandName) ||
			customCommandLoader?.getCommand(commandName);

		if (customCommand) {
			// Execute custom command with any arguments
			const args = message
				.slice(commandName.length + 1)
				.trim()
				.split(/\s+/)
				.filter(arg => arg);
			const processedPrompt = await customCommandExecutor?.execute(customCommand, args);
			
			// Send the processed prompt to the AI
			if (processedPrompt) {
				await onHandleChatMessage(processedPrompt);
			}
		} else {
			// Handle special commands that need app state access
			if (commandName === 'clear') {
				await onClearMessages();
				// Still show the clear command result
			} else if (commandName === 'model') {
				onEnterModelSelectionMode();
				return;
			} else if (commandName === 'provider') {
				onEnterProviderSelectionMode();
				return;
			}

			// Execute built-in command
			const result = await commandRegistry.execute(message.slice(1)); // Remove the leading '/'
			if (result) {
				// Check if result is JSX (React element)
				if (React.isValidElement(result)) {
					onAddToChatQueue(result);
				} else if (typeof result === 'string' && result.trim()) {
					const InfoMessage = require('../../components/info-message.js').default;
					onAddToChatQueue(
						React.createElement(InfoMessage, {
							key: `command-result-${componentKeyCounter}`,
							message: result,
							hideBox: true,
						})
					);
				}
			}
		}
	} else {
		// Regular chat message - process with AI
		await onHandleChatMessage(message);
	}
}

export function createClearMessagesHandler(
	setMessages: (messages: any[]) => void,
	client: any
) {
	return async () => {
		// Clear message history and client context
		setMessages([]);
		if (client) {
			await client.clearContext();
		}
	};
}