import {Box, Text, useInput, useFocus} from 'ink';
import {useState, useEffect} from 'react';
import {colors} from '../config/index.js';
import {promptHistory} from '../prompt-history.js';
import {commandRegistry} from '../commands.js';

interface ChatProps {
	onSubmit?: (message: string) => void;
	placeholder?: string;
	customCommands?: string[]; // List of custom command names and aliases
}

export default function UserInput({
	onSubmit,
	placeholder = 'Type `/` and then press Tab for command suggestions. Use ↑/↓ for history.',
	customCommands = [],
}: ChatProps) {
	const [input, setInput] = useState('');
	const [hasLargeContent, setHasLargeContent] = useState(false);
	const [cursorVisible, setCursorVisible] = useState(true);
	const [showClearMessage, setShowClearMessage] = useState(false);
	const [originalInput, setOriginalInput] = useState(''); // Store input before history navigation
	const [showFullContent, setShowFullContent] = useState(false); // Toggle full content display
	const [historyIndex, setHistoryIndex] = useState(-1); // Track our own history index
	const [showCompletions, setShowCompletions] = useState(false);
	const [completions, setCompletions] = useState<
		Array<{name: string; isCustom: boolean}>
	>([]);
	const {isFocused} = useFocus({autoFocus: true});

	// Load history on mount
	useEffect(() => {
		promptHistory.loadHistory();
	}, []);

	// Blinking cursor effect
	useEffect(() => {
		if (!isFocused) return;

		const interval = setInterval(() => {
			setCursorVisible(prev => !prev);
		}, 500); // Blink every 500ms

		return () => clearInterval(interval);
	}, [isFocused]);

	// Show cursor immediately when typing, reset blink timer
	const resetCursorBlink = () => {
		setCursorVisible(true);
	};

	// Get the key combination for expanding content
	const getExpandKey = () => {
		return 'Ctrl+B';
	};

	useInput((inputChar, key) => {
		// Reset cursor blink on any input
		resetCursorBlink();

		// Handle escape key
		if (key.escape) {
			if (showClearMessage) {
				// Second escape - clear everything
				setInput('');
				setHasLargeContent(false);
				setShowClearMessage(false);
				setShowFullContent(false); // Reset full content display
				setHistoryIndex(-1); // Reset history navigation
				setShowCompletions(false); // Reset completions
				setCompletions([]); // Clear completions
			} else {
				// First escape - show clear message
				setShowClearMessage(true);
			}
			return;
		}

		// Handle Ctrl+B to toggle full content display
		if (key.ctrl && inputChar === 'b') {
			if (hasLargeContent && input.length > 150) {
				setShowFullContent(prev => !prev);
			}
			return;
		}

		// Handle Tab for command completion
		if (key.tab) {
			if (input.startsWith('/')) {
				const commandPrefix = input.slice(1).split(' ')[0]; // Remove '/' and get first word

				// Get built-in command completions
				const builtInCompletions =
					commandRegistry.getCompletions(commandPrefix);

				// Get custom command completions
				const customCompletions = customCommands.filter(cmd =>
					cmd.startsWith(commandPrefix),
				);

				// Create completion objects with type info
				const allCompletions = [
					...builtInCompletions.map(cmd => ({name: cmd, isCustom: false})),
					...customCompletions.map(cmd => ({name: cmd, isCustom: true})),
				];

				if (allCompletions.length > 0) {
					setCompletions(allCompletions);
					setShowCompletions(true);
				}
			}
			return;
		}

		// Hide completions and clear message on any other input
		if (showCompletions) {
			setShowCompletions(false);
			setCompletions([]);
		}
		if (showClearMessage) {
			setShowClearMessage(false);
		}

		if (key.return && key.shift) {
			const newInput = input + '\n';
			setInput(newInput);
			return;
		}

		if (key.return) {
			if (input.trim() && onSubmit) {
				const message = input.trim();
				promptHistory.addPrompt(message); // Add to history
				onSubmit(message); // ALWAYS send actual input content
				setInput('');
				setHasLargeContent(false);
				setOriginalInput('');
				setShowFullContent(false); // Reset full content display
				setHistoryIndex(-1); // Reset history navigation
				setShowCompletions(false); // Reset completions
				setCompletions([]); // Clear completions
				promptHistory.resetIndex(); // Reset history navigation
			}
			return;
		}

		// History navigation with up/down arrows
		if (key.upArrow) {
			// Store original input before starting history navigation
			if (historyIndex === -1) {
				setOriginalInput(input);
			}

			const history = promptHistory.getHistory();
			if (history.length > 0) {
				if (historyIndex === -1) {
					// Start from the most recent
					setHistoryIndex(history.length - 1);
					setInput(history[history.length - 1]);
					setHasLargeContent(history[history.length - 1].length > 150);
				} else if (historyIndex > 0) {
					// Go to previous item
					const newIndex = historyIndex - 1;
					setHistoryIndex(newIndex);
					setInput(history[newIndex]);
					setHasLargeContent(history[newIndex].length > 150);
				} else {
					// At beginning (index 0), go to empty
					setHistoryIndex(-2); // Special value for "before beginning"
					setInput('');
					setHasLargeContent(false);
				}
			}
			return;
		}

		if (key.downArrow) {
			const history = promptHistory.getHistory();
			if (historyIndex >= 0 && historyIndex < history.length - 1) {
				// Go to next item in history
				const newIndex = historyIndex + 1;
				setHistoryIndex(newIndex);
				setInput(history[newIndex]);
				setHasLargeContent(history[newIndex].length > 150);
			} else if (historyIndex === history.length - 1) {
				// At end of history, restore original input
				setHistoryIndex(-1);
				setInput(originalInput);
				setHasLargeContent(originalInput.length > 150);
				setOriginalInput('');
			} else if (historyIndex === -2) {
				// From empty, go to first history item
				setHistoryIndex(0);
				setInput(history[0]);
				setHasLargeContent(history[0].length > 150);
			}
			return;
		}

		if (key.backspace) {
			const newInput = input.slice(0, -1);
			setInput(newInput);
			// If content gets small again, turn off large content flag
			if (newInput.length < 100) {
				setHasLargeContent(false);
			}
			return;
		}

		if (key.delete) {
			const newInput = input.slice(0, -1);
			setInput(newInput);
			if (newInput.length < 100) {
				setHasLargeContent(false);
			}
			return;
		}

		// Character input
		if (inputChar) {
			const newInput = input + inputChar;
			setInput(newInput);

			// If content becomes large (paste or lots of typing), mark as large content
			if (newInput.length > 150) {
				setHasLargeContent(true);
			}

			return;
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
		<Box flexDirection="column" paddingY={1} width={100}>
			<Box flexDirection="column">
				<Text color={colors.primary} bold>
					What would you like me to help with?
				</Text>

				<Text color={input ? colors.white : colors.secondary}>
					{'>'} {renderDisplayContent()}
					{input && isFocused && cursorVisible && (
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
