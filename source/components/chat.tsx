import {Box, Text, useInput, useFocus} from 'ink';
import {useState, useEffect} from 'react';
import {colors} from '../config/index.js';
import {promptHistory} from '../prompt-history.js';

interface ChatProps {
	onSubmit?: (message: string) => void;
	placeholder?: string;
}

export default function Chat({
	onSubmit,
	placeholder = 'Type `/` and then press Tab for command suggestions. Use ↑/↓ for history.',
}: ChatProps) {
	const [input, setInput] = useState('');
	const [hasLargeContent, setHasLargeContent] = useState(false);
	const [cursorVisible, setCursorVisible] = useState(true);
	const [showClearMessage, setShowClearMessage] = useState(false);
	const [originalInput, setOriginalInput] = useState(''); // Store input before history navigation
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
			} else {
				// First escape - show clear message
				setShowClearMessage(true);
			}
			return;
		}

		// Hide clear message on any other input
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
				promptHistory.resetIndex(); // Reset history navigation
			}
			return;
		}

		// History navigation with up/down arrows
		if (key.upArrow) {
			// Store original input before starting history navigation
			if (originalInput === '') {
				setOriginalInput(input);
			}
			const previous = promptHistory.getPrevious();
			if (previous !== null) {
				setInput(previous);
				setHasLargeContent(previous.length > 150);
			}
			return;
		}

		if (key.downArrow) {
			const next = promptHistory.getNext();
			if (next !== null) {
				if (next === '') {
					// Reached the end, restore original input
					setInput(originalInput);
					setHasLargeContent(originalInput.length > 150);
					setOriginalInput(''); // Clear stored original
				} else {
					setInput(next);
					setHasLargeContent(next.length > 150);
				}
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
	const getDisplayText = () => {
		if (!input) return placeholder;

		if (hasLargeContent && input.length > 150) {
			// Count lines properly - handle both \n and \r line endings
			const lineCount = Math.max(
				input.split('\n').length,
				input.split('\r').length,
			);

			return `[${input.length} characters, ${lineCount} lines]`;
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
					{'>'} {getDisplayText()}
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
			</Box>
		</Box>
	);
}
