import {Box, Text, useInput, useFocus} from 'ink';
import {useState, useEffect, useCallback} from 'react';
import {colors} from '../config/index.js';
import {promptHistory} from '../prompt-history.js';
import {commandRegistry} from '../commands.js';

interface ChatProps {
	onSubmit?: (message: string) => void;
	placeholder?: string;
	customCommands?: string[]; // List of custom command names and aliases
	disabled?: boolean; // Disable input when AI is processing
	onCancel?: () => void; // Callback when user presses escape while thinking
}

// Types for better organization
type Completion = {name: string; isCustom: boolean};

// Custom hooks
function useInputState() {
	const [input, setInput] = useState('');
	const [hasLargeContent, setHasLargeContent] = useState(false);
	const [originalInput, setOriginalInput] = useState('');
	const [historyIndex, setHistoryIndex] = useState(-1);

	const updateInput = useCallback((newInput: string) => {
		setInput(newInput);
		setHasLargeContent(newInput.length > 150);
	}, []);

	const resetInput = useCallback(() => {
		setInput('');
		setHasLargeContent(false);
		setOriginalInput('');
		setHistoryIndex(-1);
	}, []);

	return {
		input,
		hasLargeContent,
		originalInput,
		historyIndex,
		setInput,
		setHasLargeContent,
		setOriginalInput,
		setHistoryIndex,
		updateInput,
		resetInput,
	};
}

function useUIState() {
	const [showClearMessage, setShowClearMessage] = useState(false);
	const [showFullContent, setShowFullContent] = useState(false);
	const [showCompletions, setShowCompletions] = useState(false);
	const [completions, setCompletions] = useState<Completion[]>([]);

	const resetUIState = useCallback(() => {
		setShowClearMessage(false);
		setShowFullContent(false);
		setShowCompletions(false);
		setCompletions([]);
	}, []);

	return {
		showClearMessage,
		showFullContent,
		showCompletions,
		completions,
		setShowClearMessage,
		setShowFullContent,
		setShowCompletions,
		setCompletions,
		resetUIState,
	};
}

export default function UserInput({
	onSubmit,
	placeholder = 'Type `/` and then press Tab for command suggestions or `!` to execute bash commands. Use ↑/↓ for history.',
	customCommands = [],
	disabled = false,
	onCancel,
}: ChatProps) {
	const {isFocused} = useFocus({autoFocus: !disabled});
	const inputState = useInputState();
	const uiState = useUIState();

	const {
		input,
		hasLargeContent,
		originalInput,
		historyIndex,
		setOriginalInput,
		setHistoryIndex,
		updateInput,
		resetInput,
	} = inputState;

	const {
		showClearMessage,
		showFullContent,
		showCompletions,
		completions,
		setShowClearMessage,
		setShowFullContent,
		setShowCompletions,
		setCompletions,
		resetUIState,
	} = uiState;

	// Load history on mount
	useEffect(() => {
		promptHistory.loadHistory();
	}, []);


	// Helper functions

	const getExpandKey = () => 'Ctrl+B';

	// Command completion logic
	const handleCommandCompletion = useCallback(
		(commandPrefix: string) => {
			const builtInCompletions = commandRegistry.getCompletions(commandPrefix);
			const customCompletions = customCommands.filter(cmd =>
				cmd.startsWith(commandPrefix),
			);

			const allCompletions: Completion[] = [
				...builtInCompletions.map(cmd => ({name: cmd, isCustom: false})),
				...customCompletions.map(cmd => ({name: cmd, isCustom: true})),
			];

			if (allCompletions.length === 1) {
				// Auto-complete when there's exactly one match
				const completion = allCompletions[0];
				updateInput(`/${completion.name}`);
			} else if (allCompletions.length > 1) {
				// Show completions when there are multiple matches
				setCompletions(allCompletions);
				setShowCompletions(true);
			}
		},
		[customCommands, setCompletions, setShowCompletions, updateInput],
	);

	// Handle form submission
	const handleSubmit = useCallback(() => {
		if (input.trim() && onSubmit) {
			const message = input.trim();
			promptHistory.addPrompt(message);
			onSubmit(message);
			resetInput();
			resetUIState();
			promptHistory.resetIndex();
		}
	}, [input, onSubmit, resetInput, resetUIState]);

	// Handle escape key logic
	const handleEscape = useCallback(() => {
		if (showClearMessage) {
			resetInput();
			resetUIState();
		} else {
			setShowClearMessage(true);
		}
	}, [showClearMessage, resetInput, resetUIState, setShowClearMessage]);

	// History navigation
	const handleHistoryNavigation = useCallback(
		(direction: 'up' | 'down') => {
			const history = promptHistory.getHistory();
			if (history.length === 0) return;

			if (direction === 'up') {
				if (historyIndex === -1) {
					setOriginalInput(input);
					setHistoryIndex(history.length - 1);
					updateInput(history[history.length - 1]);
				} else if (historyIndex > 0) {
					const newIndex = historyIndex - 1;
					setHistoryIndex(newIndex);
					updateInput(history[newIndex]);
				} else {
					setHistoryIndex(-2);
					updateInput('');
				}
			} else {
				if (historyIndex >= 0 && historyIndex < history.length - 1) {
					const newIndex = historyIndex + 1;
					setHistoryIndex(newIndex);
					updateInput(history[newIndex]);
				} else if (historyIndex === history.length - 1) {
					setHistoryIndex(-1);
					updateInput(originalInput);
					setOriginalInput('');
				} else if (historyIndex === -2) {
					setHistoryIndex(0);
					updateInput(history[0]);
				}
			}
		},
		[
			historyIndex,
			input,
			originalInput,
			setHistoryIndex,
			setOriginalInput,
			updateInput,
		],
	);

	useInput((inputChar, key) => {
		// Handle escape for cancellation even when disabled
		if (key.escape && disabled && onCancel) {
			onCancel();
			return;
		}
		
		// Block all other input when disabled
		if (disabled) {
			return;
		}


		// Handle special keys
		if (key.escape) {
			handleEscape();
			return;
		}

		if (key.ctrl && inputChar === 'b') {
			if (hasLargeContent && input.length > 150) {
				setShowFullContent(prev => !prev);
			}
			return;
		}

		if (key.tab && input.startsWith('/')) {
			const commandPrefix = input.slice(1).split(' ')[0];
			handleCommandCompletion(commandPrefix);
			return;
		}

		// Clear UI state on other input
		if (showCompletions) {
			setShowCompletions(false);
			setCompletions([]);
		}
		if (showClearMessage) {
			setShowClearMessage(false);
		}

		// Handle return keys
		if (key.return && key.shift) {
			updateInput(input + '\n');
			return;
		}

		if (key.return) {
			handleSubmit();
			return;
		}

		// Handle navigation
		if (key.upArrow) {
			handleHistoryNavigation('up');
			return;
		}

		if (key.downArrow) {
			handleHistoryNavigation('down');
			return;
		}

		// Handle deletion
		if (key.backspace || key.delete) {
			const newInput = input.slice(0, -1);
			updateInput(newInput);
			return;
		}

		// Handle character input
		if (inputChar) {
			// Normalize line endings and tabs for pasted content
			let normalizedChar = inputChar;
			if (inputChar.includes('\r') || inputChar.includes('\n')) {
				normalizedChar = inputChar.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
			}
			// Convert tabs to 2 spaces for more compact display
			normalizedChar = normalizedChar.replace(/\t/g, '  ');
			updateInput(input + normalizedChar);
		}
	});

	// Render function - NEVER modifies state, only for display
	const renderDisplayContent = () => {
		if (!input) return placeholder;

		if (hasLargeContent && input.length > 150 && !showFullContent) {
			// Count lines properly - handle both \n and \r line endings
			const lineCount = Math.max(
				input.split('\n').length,
				input.split('\r').length,
			);

			return (
				<>
					{`[${input.length} characters, ${lineCount} lines] `}
					<Text color={colors.secondary}>({getExpandKey()} to expand)</Text>
				</>
			);
		}

		return input;
	};

	return (
		<Box flexDirection="column" paddingY={1} width="100%" marginTop={1}>
			<Box flexDirection="column">
				<Text color={disabled ? colors.secondary : colors.primary} bold>
					{disabled
						? 'Please wait, AI is thinking...'
						: 'What would you like me to help with?'}
				</Text>

				<Text
					color={
						disabled
							? colors.secondary
							: input
							? colors.white
							: colors.secondary
					}
				>
					{'>'} {disabled ? '...' : renderDisplayContent()}
					{!disabled && input && isFocused && (
						<Text backgroundColor={colors.white} color={colors.black}>
							{' '}
						</Text>
					)}
				</Text>
				{showClearMessage && (
					<Text color={colors.secondary} dimColor>
						Press escape again to clear
					</Text>
				)}
				{showCompletions && completions.length > 0 && (
					<Box flexDirection="column" marginTop={1}>
						<Text color={colors.secondary}>Available commands:</Text>
						{completions.map((completion, index) => (
							<Text
								key={index}
								color={completion.isCustom ? colors.blue : colors.primary}
							>
								/{completion.name}
							</Text>
						))}
					</Box>
				)}
			</Box>
		</Box>
	);
}
