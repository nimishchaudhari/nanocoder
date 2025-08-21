import {Box, Text, useInput, useFocus} from 'ink';
import {useState} from 'react';
import {colors} from '../config/index.js';

interface ChatProps {
	onSubmit?: (message: string) => void;
	placeholder?: string;
}

export default function Chat({
	onSubmit,
	placeholder = 'Type your message...',
}: ChatProps) {
	const [input, setInput] = useState('');
	const [beforePasteContent, setBeforePasteContent] = useState('');
	const [hasPastedContent, setHasPastedContent] = useState(false);
	const {isFocused} = useFocus({autoFocus: true});

	useInput((inputChar, key) => {
		if (key.return && key.shift) {
			const newInput = input + '\n';
			setInput(newInput);
			// If we're typing normally, update the "before paste" marker
			if (!hasPastedContent) {
				setBeforePasteContent(newInput);
			}
			return;
		}

		if (key.return) {
			if (input.trim() && onSubmit) {
				onSubmit(input.trim()); // ALWAYS send actual input content
				setInput('');
				setBeforePasteContent('');
				setHasPastedContent(false);
			}
			return;
		}

		if (key.backspace) {
			const newInput = input.slice(0, -1);
			setInput(newInput);
			// If we backspace past the paste point, reset
			if (newInput.length <= beforePasteContent.length) {
				setBeforePasteContent(newInput);
				setHasPastedContent(false);
			}
			return;
		}

		if (key.delete) {
			const newInput = input.slice(0, -1);
			setInput(newInput);
			if (newInput.length <= beforePasteContent.length) {
				setBeforePasteContent(newInput);
				setHasPastedContent(false);
			}
			return;
		}

		// Character input
		if (inputChar) {
			const newInput = input + inputChar;
			setInput(newInput);
			
			// Detect paste: if we get a lot of characters at once
			if (inputChar.length > 10) {
				// This is a paste operation
				setBeforePasteContent(input); // Save what we had before
				setHasPastedContent(true);
			} else if (!hasPastedContent) {
				// Normal typing - update our "before paste" marker
				setBeforePasteContent(newInput);
			}
			// If hasPastedContent is true and this is normal typing, 
			// we're typing after paste - don't update beforePasteContent
			
			return;
		}
	});

	// Render function - NEVER modifies state, only for display
	const getDisplayText = () => {
		if (!input) return placeholder;
		
		if (hasPastedContent && input.length > beforePasteContent.length) {
			const pastedPortion = input.slice(beforePasteContent.length);
			const lineCount = pastedPortion.split('\n').length;
			return `${beforePasteContent}[pasted ${pastedPortion.length} chars, ${lineCount} lines]`;
		}
		
		return input;
	};

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={isFocused ? colors.primary : colors.secondary}
			paddingX={2}
			paddingY={1}
			width={75}
		>
			<Box marginBottom={1}>
				<Text color={colors.secondary} bold>
					💬 Chat Input (Enter to send, Shift+Enter for new line)
				</Text>
			</Box>
			<Box flexDirection="column" minHeight={3}>
				<Text color={input ? colors.white : colors.secondary}>
					{getDisplayText()}
					{input && isFocused && (
						<Text backgroundColor={colors.white} color={colors.black}>
							{' '}
						</Text>
					)}
				</Text>
			</Box>
		</Box>
	);
}