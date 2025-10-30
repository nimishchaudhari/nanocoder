import {Text, Box} from 'ink';
import {memo, useMemo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import type {AssistantMessageProps, Colors} from '@/types/index';
import chalk from 'chalk';
import {highlight} from 'cli-highlight';

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

// Wrap text to a maximum width
export function wrapText(text: string, maxWidth: number): string[] {
	if (text.length <= maxWidth) return [text];

	const words = text.split(' ');
	const lines: string[] = [];
	let currentLine = '';

	for (const word of words) {
		if (currentLine.length === 0) {
			currentLine = word;
		} else if (currentLine.length + 1 + word.length <= maxWidth) {
			currentLine += ' ' + word;
		} else {
			lines.push(currentLine);
			currentLine = word;
		}
	}

	if (currentLine.length > 0) {
		lines.push(currentLine);
	}

	return lines;
}

// Parse markdown tables
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

	// Get column count from header
	const columnCount = rows[0].length;

	// Normalize all rows to have same column count
	const normalizedRows = rows.map(row => {
		const normalized = [...row];
		while (normalized.length < columnCount) {
			normalized.push('');
		}
		return normalized.slice(0, columnCount);
	});

	// Calculate reasonable column widths
	// Max width per column based on terminal width (assume ~120 chars total)
	const terminalWidth = process.stdout.columns || 120;
	const reservedWidth = columnCount * 3 + 1; // For separators │
	const availableWidth = terminalWidth - reservedWidth;
	const maxColWidth = Math.floor(availableWidth / columnCount);

	// Calculate actual column widths (capped at maxColWidth)
	const columnWidths: number[] = [];
	for (let col = 0; col < columnCount; col++) {
		let maxWidth = 0;
		for (let row = 0; row < normalizedRows.length; row++) {
			if (row === 1) continue; // Skip separator row
			const cellText = normalizedRows[row][col] || '';
			// Strip ANSI codes for width calculation
			// eslint-disable-next-line no-control-regex
			const plainText = cellText.replace(/\x1b\[[0-9;]*m/g, '');
			maxWidth = Math.max(maxWidth, plainText.length);
		}
		// Cap at reasonable width to prevent overflow
		columnWidths.push(Math.min(maxWidth, maxColWidth));
	}

	// Wrap cell content that exceeds column width
	const wrappedRows = normalizedRows.map((row, rowIndex) => {
		if (rowIndex === 1) return row; // Skip separator row

		const cellLines: string[][] = row.map((cell, colIndex) => {
			// Strip ANSI codes for length check
			// eslint-disable-next-line no-control-regex
			const plainText = cell.replace(/\x1b\[[0-9;]*m/g, '');
			if (plainText.length <= columnWidths[colIndex]) {
				return [cell];
			}
			return wrapText(cell, columnWidths[colIndex]);
		});

		// Get max line count for this row
		const maxLines = Math.max(...cellLines.map(lines => lines.length));

		// Create multi-line row
		const rowLines: string[][] = [];
		for (let lineIdx = 0; lineIdx < maxLines; lineIdx++) {
			const lineCells = cellLines.map(
				lines => lines[lineIdx] || '', // Empty if this cell doesn't have that many lines
			);
			rowLines.push(lineCells);
		}

		return rowLines;
	});

	// Build table with proper alignment
	const result: string[] = [];
	const headerRow = wrappedRows[0];
	const dataRows = wrappedRows.slice(2);

	// Header with bold styling
	if (Array.isArray(headerRow[0])) {
		// Multi-line header
		for (const headerLine of headerRow as string[][]) {
			const headerCells = headerLine.map((cell, i) => {
				const paddedCell = cell.padEnd(columnWidths[i], ' ');
				return chalk.hex(themeColors.primary).bold(paddedCell);
			});
			result.push(headerCells.join(' │ '));
		}
	} else {
		// Single-line header
		const headerCells = (headerRow as string[]).map((cell, i) => {
			const paddedCell = cell.padEnd(columnWidths[i], ' ');
			return chalk.hex(themeColors.primary).bold(paddedCell);
		});
		result.push(headerCells.join(' │ '));
	}

	// Separator line
	const separatorParts = columnWidths.map(width => '─'.repeat(width));
	const separator = separatorParts.join('─┼─');
	result.push(chalk.hex(themeColors.secondary)(separator));

	// Data rows with proper padding
	for (const row of dataRows) {
		if (Array.isArray(row[0])) {
			// Multi-line row
			for (const rowLine of row as string[][]) {
				const cells = rowLine.map((cell, i) => {
					const paddedCell = cell.padEnd(columnWidths[i], ' ');
					return chalk.hex(themeColors.white)(paddedCell);
				});
				result.push(cells.join(' │ '));
			}
		} else {
			// Single-line row
			const cells = (row as string[]).map((cell, i) => {
				const paddedCell = cell.padEnd(columnWidths[i], ' ');
				return chalk.hex(themeColors.white)(paddedCell);
			});
			result.push(cells.join(' │ '));
		}
	}

	return result.join('\n');
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
