/**
 * Normalize indentation for display in narrow terminals
 *
 * This utility helps prevent deeply indented code from creating a mess
 * on narrow terminals by:
 * 1. Capping absolute indentation to a maximum level
 * 2. Adding visual indicators for capped indentation
 * 3. Preserving visual indentation for readability
 */

const MAX_DISPLAY_INDENT = 12; // Maximum spaces of indentation to display
const MIN_VISUAL_INDENT = 2; // Minimum indentation to keep for visual clarity

/**
 * Get the indentation level (number of leading spaces) for a line
 */
function getIndentLevel(line: string): number {
	const match = line.match(/^(\s*)/);
	if (!match) return 0;

	// Convert tabs to spaces (assuming 1 tab = 2 spaces for display)
	const indent = match[1].replace(/\t/g, '  ');
	return indent.length;
}

/**
 * Find the minimum indentation across all non-empty lines
 */
function findMinIndent(lines: string[]): number {
	let minIndent = Number.POSITIVE_INFINITY;

	for (const line of lines) {
		// Skip empty or whitespace-only lines
		if (line.trim().length === 0) continue;

		const indent = getIndentLevel(line);
		minIndent = Math.min(minIndent, indent);
	}

	return minIndent === Number.POSITIVE_INFINITY ? 0 : minIndent;
}

/**
 * Normalize a single line by capping indentation while preserving visual structure
 */
function normalizeLine(
	line: string,
	indentToRemove: number,
	maxIndentExceeded: boolean,
): string {
	// Skip empty lines
	if (line.trim().length === 0) return line;

	// Convert tabs to spaces for consistent handling
	const spacedLine = line.replace(/\t/g, '  ');
	const absoluteIndent = getIndentLevel(spacedLine);

	// If any line in the group exceeds max, cap all lines
	if (maxIndentExceeded && absoluteIndent > MAX_DISPLAY_INDENT) {
		const content = spacedLine.trimStart();
		const indicatorCount = Math.min(3, Math.ceil(absoluteIndent / 16));
		const indicator = '»'.repeat(indicatorCount);
		return `${' '.repeat(MAX_DISPLAY_INDENT)}${indicator} ${content}`;
	}

	// Remove only the calculated common indent (preserving visual structure)
	const withoutCommonIndent = spacedLine.slice(indentToRemove);
	return withoutCommonIndent;
}

/**
 * Normalize indentation for an array of lines for display
 *
 * @param lines - Array of lines to normalize
 * @returns Array of lines with normalized indentation
 *
 * @example
 * const lines = [
 *   '                    function foo() {',
 *   '                        return 42;',
 *   '                    }'
 * ];
 * const normalized = normalizeIndentation(lines);
 * // minIndent = 20, removes 18 (keeps 2 for visual clarity)
 * // Result: ['  function foo() {', '      return 42;', '  }']
 */
export function normalizeIndentation(lines: string[]): string[] {
	// Find minimum indentation across all lines
	const minIndent = findMinIndent(lines);

	// If code is already excessively indented, cap everything
	if (minIndent > MAX_DISPLAY_INDENT) {
		return lines.map(line => {
			if (line.trim().length === 0) return line;
			const spacedLine = line.replace(/\t/g, '  ');
			const absoluteIndent = getIndentLevel(spacedLine);
			const content = spacedLine.trimStart();
			const indicatorCount = Math.min(3, Math.ceil(absoluteIndent / 16));
			const indicator = '»'.repeat(indicatorCount);
			return `${' '.repeat(MAX_DISPLAY_INDENT)}${indicator} ${content}`;
		});
	}

	// Calculate how much indentation to remove
	// Keep at least MIN_VISUAL_INDENT for readability
	const indentToRemove = Math.max(0, minIndent - MIN_VISUAL_INDENT);

	// Check if any line exceeds the maximum display indent after removal
	const maxIndentExceeded = lines.some(line => {
		if (line.trim().length === 0) return false;
		const currentIndent = getIndentLevel(line.replace(/\t/g, '  '));
		const afterRemoval = currentIndent - indentToRemove;
		return afterRemoval > MAX_DISPLAY_INDENT;
	});

	// Normalize each line
	return lines.map(line =>
		normalizeLine(line, indentToRemove, maxIndentExceeded),
	);
}

/**
 * Normalize indentation for a string of content
 *
 * @param content - String content to normalize (may contain newlines)
 * @returns String with normalized indentation
 */
export function normalizeIndentationString(content: string): string {
	const lines = content.split('\n');
	const normalized = normalizeIndentation(lines);
	return normalized.join('\n');
}
