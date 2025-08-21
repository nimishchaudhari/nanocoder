import {Box} from 'ink';
import WelcomeMessage from './components/welcome-message.js';
import {useEffect, useState} from 'react';
import {LLMClient, Message, ProviderType} from './types/core.js';
import {ToolManager} from './tools/tool-manager.js';
import {CustomCommandLoader} from './custom-commands/loader.js';
import {CustomCommandExecutor} from './custom-commands/executor.js';
import {
	getLastUsedModel,
	loadPreferences,
	updateLastUsed,
} from './config/preferences.js';
import {setToolRegistryGetter} from './message-handler.js';
import {commandRegistry} from './commands.js';
import {shouldLog} from './config/logging.js';
import {appConfig} from './config/index.js';
import {createLLMClient} from './client-factory.js';
import Chat from './components/chat.js';
import Status from './components/status.js';

export default function App() {
	const [client, setClient] = useState<LLMClient | null>(null);

	const [messages, setMessages] = useState<Message[]>([]);

	const [currentModel, setCurrentModel] = useState<string>('');

	const [currentProvider, setCurrentProvider] =
		useState<ProviderType>('ollama');

	const [toolManager, setToolManager] = useState<ToolManager | null>(null);

	const [customCommandLoader, setCustomCommandLoader] =
		useState<CustomCommandLoader | null>(null);

	const [customCommandExecutor, setCustomCommandExecutor] =
		useState<CustomCommandExecutor | null>(null);

	const [customCommandCache, setCustomCommandCache] = useState<
		Map<string, any>
	>(new Map());

	const [startChat, setStartChat] = useState<boolean>(false);

	useEffect(() => {
		setClient(null);
		setCurrentModel('');
		setToolManager(new ToolManager());
		setCustomCommandLoader(new CustomCommandLoader());
		setCustomCommandExecutor(new CustomCommandExecutor());

		// Load preferences to set initial provider
		const preferences = loadPreferences();
		if (preferences.lastProvider) {
			setCurrentProvider(preferences.lastProvider);
		}

		// Set up the tool registry getter for the message handler
		setToolRegistryGetter(() => toolManager!.getToolRegistry());

		commandRegistry.register([
			// helpCommand,
			// exitCommand,
			// clearCommand,
			// modelCommand,
			// providerCommand,
			// mcpCommand,
			// debugCommand,
			// commandsCommand,
		]);
		start();
		setStartChat(true);
	}, []);

	async function start(): Promise<void> {
		// Initialize client on startup
		try {
			const {client, actualProvider} = await createLLMClient(currentProvider);
			setClient(client);
			setCurrentProvider(actualProvider);

			// Try to use the last used model for this provider
			const lastUsedModel = getLastUsedModel(currentProvider);

			if (lastUsedModel) {
				const availableModels = await client.getAvailableModels();
				if (availableModels.includes(lastUsedModel)) {
					client.setModel(lastUsedModel);
					setCurrentModel(lastUsedModel);
				} else {
					setCurrentModel(client.getCurrentModel());
				}
			} else {
				setCurrentModel(client.getCurrentModel());
			}

			// Save the preference
			updateLastUsed(currentProvider, currentModel);

			// Display current provider and model (always show this)
			console.log(`Using provider: ${currentProvider}, model: ${currentModel}`);

			// Load custom commands
			await customCommandLoader?.loadCommands();
			const customCommands = customCommandLoader?.getAllCommands() || [];

			// Populate command cache for better performance
			customCommandCache.clear();
			for (const command of customCommands) {
				customCommandCache.set(command.name, command);
				// Also cache aliases for quick lookup
				if (command.metadata?.aliases) {
					for (const alias of command.metadata.aliases) {
						customCommandCache.set(alias, command);
					}
				}
			}

			if (customCommands.length > 0 && shouldLog('info')) {
				console.log(
					`Loaded ${customCommands.length} custom commands from .nanocoder/commands`,
				);
			}

			// Initialize MCP servers if configured
			if (appConfig.mcpServers && appConfig.mcpServers.length > 0) {
				if (shouldLog('info')) {
					console.log('Connecting to MCP servers...');
				}
				await toolManager?.initializeMCP(appConfig.mcpServers);
			}
		} catch (error) {
			console.error(`Failed to initialize ${currentProvider} provider:`, error);
			process.exit(1);
		}

		// while (true) {
		// 	const userInput = await getUserInput();

		// 	if (userInput === null) {
		// 		break;
		// 	}

		// 	// Handle commands
		// 	if (isCommandInput(userInput)) {
		// 		const parsed = parseInput(userInput);
		// 		if (parsed.fullCommand) {
		// 			// Check for custom command first
		// 			const customCommand =
		// 				customCommandCache.get(parsed.fullCommand) ||
		// 				customCommandLoader?.getCommand(parsed.fullCommand);
		// 			if (customCommand) {
		// 				// Execute custom command with any arguments
		// 				const args = userInput
		// 					.slice(parsed.fullCommand.length + 1)
		// 					.trim()
		// 					.split(/\s+/)
		// 					.filter(arg => arg);
		// 				await customCommandExecutor?.execute(customCommand, args);
		// 				continue;
		// 			}

		// 			// Otherwise try built-in command
		// 			const result = await commandRegistry.execute(parsed.fullCommand);
		// 			if (result && result.trim()) {
		// 				// Check if the result is a prompt to execute
		// 				if (result.startsWith('EXECUTE_PROMPT:')) {
		// 					const promptToExecute = result.replace('EXECUTE_PROMPT:', '');
		// 					// Add the selected prompt as a user message and process it
		// 					messages.push({role: 'user', content: promptToExecute});
		// 					setMessages([...messages]);
		// 					// Continue to process this as a regular user input
		// 					const response = await processStreamResponse();

		// 					if (!response) {
		// 						continue;
		// 					}

		// 					const {fullContent, toolCalls} = response;
		// 					messages.push({
		// 						role: 'assistant',
		// 						content: fullContent,
		// 						tool_calls: toolCalls,
		// 					});
		// 					setMessages([...messages]);

		// 					if (fullContent) {
		// 						displayAssistantMessage(fullContent, currentModel);
		// 					}

		// 					if (toolCalls && toolCalls.length > 0) {
		// 						const toolResult = await executeToolCalls(toolCalls);
		// 						messages.push(...toolResult.results);
		// 						if (toolResult.executed) {
		// 							await continueConversation();
		// 						}
		// 					}
		// 				} else {
		// 					console.log(result);
		// 				}
		// 			}
		// 			continue;
		// 		}
		// 	}

		// 	messages.push({role: 'user', content: userInput});
		// 	setMessages([...messages]);

		// 	const response = await processStreamResponse();

		// 	// If there was an error, just continue to next input (keep user message in history)
		// 	if (!response) {
		// 		continue;
		// 	}

		// 	const {fullContent, toolCalls} = response;

		// 	messages.push({
		// 		role: 'assistant',
		// 		content: fullContent,
		// 		tool_calls: toolCalls,
		// 	});
		// 	setMessages([...messages]);

		// 	if (fullContent) {
		// 		displayAssistantMessage(fullContent, currentModel);
		// 	}

		// 	if (toolCalls && toolCalls.length > 0) {
		// 		const result = await executeToolCalls(toolCalls);

		// 		// Add tool results to message history
		// 		messages.push(...result.results);
		// 		setMessages([...messages]);

		// 		// If tools were executed, continue the AI conversation
		// 		if (result.executed) {
		// 			await continueConversation();
		// 		}
		// 	}
		// }
	}

	return (
		<Box flexDirection="column" padding={1} width="100%">
			<WelcomeMessage />

			{startChat && (
				<>
					<Status provider={currentProvider} model={currentModel} />
					<Chat onSubmit={(message) => {
						console.log('=== COMPLETE MESSAGE ===');
						console.log('Length:', message.length);
						console.log('JSON:', JSON.stringify(message));
						console.log('=========================');
					}} />
				</>
			)}
		</Box>
	);
}
