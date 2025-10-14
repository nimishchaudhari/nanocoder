import {Text, Box} from 'ink';
import {memo, useMemo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import type {AssistantMessageProps} from '@/types/index';
import chalk from 'chalk';
import {highlight} from 'cli-highlight';

// Basic markdown parser for terminal
export function parseMarkdown(text: string, themeColors: any): string {
	let result = text;

	// Code blocks (```language\ncode\n```)
	result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
		try {
			// Apply syntax highlighting with detected language
			const highlighted = highlight(code.trim(), {
				language: lang || 'plaintext',
				theme: 'default',
			});
			return highlighted;
		} catch {
			// Fallback to plain colored text if highlighting fails
			return chalk.hex(themeColors.tool)(code.trim());
		}
	});

	// Inline code (`code`)
	result = result.replace(/`([^`]+)`/g, (_match, code) => {
		return chalk.hex(themeColors.tool)(code);
	});

	// Bold (**text** or __text__)
	result = result.replace(/\*\*([^*]+)\*\*/g, (_match, text) => {
		return chalk.hex(themeColors.white).bold(text);
	});
	result = result.replace(/__([^_]+)__/g, (_match, text) => {
		return chalk.hex(themeColors.white).bold(text);
	});

	// Italic (*text* or _text_)
	result = result.replace(/\*([^*]+)\*/g, (_match, text) => {
		return chalk.hex(themeColors.white).italic(text);
	});
	result = result.replace(/_([^_]+)_/g, (_match, text) => {
		return chalk.hex(themeColors.white).italic(text);
	});

	// Headings (# Heading)
	result = result.replace(/^(#{1,6})\s+(.+)$/gm, (_match, _hashes, text) => {
		return chalk.hex(themeColors.primary).bold(text);
	});

	// Links [text](url)
	result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
		return (
			chalk.hex(themeColors.info).underline(text) +
			' ' +
			chalk.hex(themeColors.secondary)(`(${url})`)
		);
	});

	// Blockquotes (> text)
	result = result.replace(/^>\s+(.+)$/gm, (_match, text) => {
		return chalk.hex(themeColors.secondary).italic(`> ${text}`);
	});

	// List items (- item or * item or 1. item)
	result = result.replace(/^[\s]*[-*]\s+(.+)$/gm, (_match, text) => {
		return chalk.hex(themeColors.white)(`• ${text}`);
	});
	result = result.replace(/^[\s]*\d+\.\s+(.+)$/gm, (_match, text) => {
		return chalk.hex(themeColors.white)(text);
	});

	return result;
}

export default memo(function AssistantMessage({
	message,
	model,
}: AssistantMessageProps) {
	const {colors} = useTheme();

	// Render markdown to terminal-formatted text with theme colors
	const renderedMessage = useMemo(() => {
		try {
			return parseMarkdown(message, colors);
		} catch {
			// Fallback to plain text if markdown parsing fails
			return message;
		}
	}, [message, colors]);

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box marginBottom={1}>
				<Text color={colors.primary} bold>
					{model}:
				</Text>
			</Box>
			<Text>{renderedMessage}</Text>
		</Box>
	);
});
