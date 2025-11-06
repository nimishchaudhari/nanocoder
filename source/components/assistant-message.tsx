import {Text, Box} from 'ink';
import {memo, useMemo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import type {AssistantMessageProps, Colors} from '@/types/index';
import chalk from 'chalk';
import {highlight} from 'cli-highlight';
import Table from 'cli-table3';

// Decode HTML entities
export function decodeHtmlEntities(text: string): string {
	const entities: Record<string, string> = {
		'&nbsp;': ' ',
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&apos;': "'",
		'&copy;': '©',
		'&reg;': '®',
		'&trade;': '™',
		'&euro;': '€',
		'&pound;': '£',
		'&yen;': '¥',
		'&cent;': '¢',
		'&sect;': '§',
		'&deg;': '°',
		'&plusmn;': '±',
		'&times;': '×',
		'&divide;': '÷',
		'&ndash;': '–',
		'&mdash;': '—',
		'&lsquo;': '\u2018',
		'&rsquo;': '\u2019',
		'&ldquo;': '\u201C',
		'&rdquo;': '\u201D',
		'&hellip;': '…',
		'&bull;': '•',
	};

	let result = text;
	// Replace named entities
	for (const [entity, char] of Object.entries(entities)) {
		result = result.replace(new RegExp(entity, 'g'), char);
	}
	// Replace numeric entities (e.g., &#160; or &#xA0;)
	result = result.replace(/&#(\d+);/g, (_match, code: string) =>
		String.fromCharCode(parseInt(code, 10)),
	);
	result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_match, code: string) =>
		String.fromCharCode(parseInt(code, 16)),
	);
	return result;
}

// Strip markdown formatting from text (for width calculations)
function stripMarkdown(text: string): string {
	let result = text;
	// Remove inline code
	result = result.replace(/`([^`]+)`/g, '$1');
	// Remove bold
	result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
	result = result.replace(/__([^_]+)__/g, '$1');
	// Remove italic
	result = result.replace(/\*([^*]+)\*/g, '$1');
	result = result.replace(/_([^_]+)_/g, '$1');
	// Remove links
	result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
	return result;
}

// Parse markdown tables using cli-table3
export function parseMarkdownTable(
	tableText: string,
	themeColors: Colors,
): string {
	const lines = tableText.trim().split('\n');
	if (lines.length < 2) return tableText;

	// Extract rows
	const rows = lines.map(line =>
		line
			.split('|')
			.map(cell => cell.trim())
			.filter(cell => cell.length > 0),
	);

	// Check if second row is separator (e.g., |---|---|)
	const separatorRow = rows[1];
	const isSeparator = separatorRow?.every(cell => /^:?-+:?$/.test(cell));
	if (!isSeparator || rows.length < 3) return tableText;

	// Extract header and data rows - strip markdown for proper width calculation
	const header = rows[0].map(cell => stripMarkdown(cell));
	const dataRows = rows.slice(2).map(row => row.map(cell => stripMarkdown(cell)));

	// Calculate column widths properly
	const terminalWidth = process.stdout.columns || 120;
	const numCols = header.length;

	// Get max content width for each column
	const contentWidths = header.map((_, colIdx) => {
		let maxWidth = header[colIdx].length;
		for (const row of dataRows) {
			if (row[colIdx]) {
				maxWidth = Math.max(maxWidth, row[colIdx].length);
			}
		}
		return maxWidth;
	});

	// Calculate available width (accounting for borders and padding)
	const borderWidth = numCols + 1; // vertical bars
	const paddingWidth = numCols * 2; // 1 space on each side of each column
	const availableWidth = terminalWidth - borderWidth - paddingWidth;

	// Distribute width proportionally
	const totalContentWidth = contentWidths.reduce((a, b) => a + b, 0);
	const colWidths = contentWidths.map(width =>
		Math.max(10, Math.floor((width / totalContentWidth) * availableWidth))
	);

	// Create table with cli-table3 - full borders, proper alignment
	const table = new Table({
		head: header.map(cell => chalk.hex(themeColors.primary).bold(cell)),
		colWidths: colWidths,
		style: {
			head: [], // Don't apply default styles, we're using chalk
			border: ['gray'], // Subtle border color
			'padding-left': 1,
			'padding-right': 1,
		},
		chars: {
			top: '─',
			'top-mid': '┬',
			'top-left': '┌',
			'top-right': '┐',
			bottom: '─',
			'bottom-mid': '┴',
			'bottom-left': '└',
			'bottom-right': '┘',
			left: '│',
			'left-mid': '├',
			mid: '─',
			'mid-mid': '┼',
			right: '│',
			'right-mid': '┤',
			middle: '│',
		},
		wordWrap: true,
		wrapOnWordBoundary: true,
	});

	// Add data rows - don't style them, let cli-table3 handle layout
	for (const row of dataRows) {
		table.push(row);
	}

	return table.toString();
}

// Basic markdown parser for terminal
export function parseMarkdown(text: string, themeColors: Colors): string {
	// First decode HTML entities
	let result = decodeHtmlEntities(text);

	// Parse tables before other markdown elements
	result = result.replace(
		/(?:^|\n)((?:\|.+\|\n)+)/gm,
		(_match, tableText: string) => {
			return '\n' + parseMarkdownTable(tableText, themeColors) + '\n';
		},
	);

	// Code blocks (```language\ncode\n```)
	result = result.replace(
		/```(\w+)?\n([\s\S]*?)```/g,
		(_match, lang: string | undefined, code: string) => {
			try {
				const codeStr = String(code).trim();
				// Apply syntax highlighting with detected language
				const highlighted = highlight(codeStr, {
					language: lang || 'plaintext',
					theme: 'default',
				});
				return highlighted;
			} catch {
				// Fallback to plain colored text if highlighting fails
				return chalk.hex(themeColors.tool)(String(code).trim());
			}
		},
	);

	// Inline code (`code`)
	result = result.replace(/`([^`]+)`/g, (_match, code: string) => {
		return chalk.hex(themeColors.tool)(String(code).trim());
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
