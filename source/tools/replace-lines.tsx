import React from 'react';
import {resolve} from 'node:path';
import {readFile, writeFile} from 'node:fs/promises';
import {highlight} from 'cli-highlight';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {ThemeContext} from '../hooks/useTheme.js';
import {getColors} from '../config/index.js';
import {getLanguageFromExtension} from '../utils/programming-language-helper.js';
import ToolMessage from '../components/tool-message.js';

interface ReplaceLinesArgs {
	path: string;
	line_number: number;
	end_line?: number;
	content: string;
}

const handler: ToolHandler = async (args: ReplaceLinesArgs): Promise<string> => {
	const {path, line_number, end_line, content} = args;

	// Validate line numbers
	if (!line_number || line_number < 1) {
		throw new Error(`Invalid line_number: ${line_number}. Must be a positive integer.`);
	}

	const endLine = end_line ?? line_number;
	if (endLine < line_number) {
		throw new Error(`end_line (${endLine}) cannot be less than line_number (${line_number}).`);
	}

	const absPath = resolve(path);
	const fileContent = await readFile(absPath, 'utf-8');
	const lines = fileContent.split('\n');

	// Validate line range is within file bounds
	if (line_number > lines.length) {
		throw new Error(
			`Line number ${line_number} is out of range (file has ${lines.length} lines)`
		);
	}
	if (endLine > lines.length) {
		throw new Error(
			`End line ${endLine} is out of range (file has ${lines.length} lines)`
		);
	}

	// Replace lines
	const replaceLines = content.split('\n');
	const linesToRemove = endLine - line_number + 1;
	const newLines = [...lines];
	newLines.splice(line_number - 1, linesToRemove, ...replaceLines);

	// Write updated content
	const newContent = newLines.join('\n');
	await writeFile(absPath, newContent, 'utf-8');

	// Generate full file contents to show the model the current file state
	let fileContext = '\n\nUpdated file contents:\n';
	for (let i = 0; i < newLines.length; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = newLines[i] || '';
		fileContext += `${lineNumStr}: ${line}\n`;
	}

	const rangeDesc = line_number === endLine ? `line ${line_number}` : `lines ${line_number}-${endLine}`;
	return `Successfully replaced ${rangeDesc} with ${replaceLines.length} line${replaceLines.length > 1 ? 's' : ''}.${fileContext}`;
};

const ReplaceLinesFormatter = React.memo(({args, result}: {args: any; result?: string}) => {
	const {colors} = React.useContext(ThemeContext)!;
	const [preview, setPreview] = React.useState<React.ReactElement | null>(null);

	React.useEffect(() => {
		const generatePreview = async () => {
			const formattedPreview = await formatReplaceLinesPreview(args, result, colors);
			setPreview(formattedPreview);
		};
		generatePreview();
	}, [args, result, colors]);

	return preview;
});

async function formatReplaceLinesPreview(
	args: any,
	result?: string,
	colors?: any,
): Promise<React.ReactElement> {
	const themeColors = colors || getColors();
	const {path, line_number, end_line, content} = args;
	const lineNumber = Number(line_number);
	const endLine = Number(end_line) || lineNumber;

	// Validate line numbers
	if (!lineNumber || lineNumber < 1) {
		throw new Error(`Invalid line_number: ${line_number}. Must be a positive integer.`);
	}
	if (endLine < lineNumber) {
		throw new Error(`end_line (${endLine}) cannot be less than line_number (${lineNumber}).`);
	}

	const isResult = result !== undefined;
	const displayTitle = isResult ? '✓' : '⚒';

	try {
		const fileContent = await readFile(resolve(path), 'utf-8');
		const lines = fileContent.split('\n');
		const ext = path.split('.').pop()?.toLowerCase();
		const language = getLanguageFromExtension(ext);

		// For results, show the actual file state after replacement
		if (isResult) {
			const replaceLines = content.split('\n');
			const contextLines = 5;
			const showStart = Math.max(0, lineNumber - 1 - contextLines);
			const showEnd = Math.min(lines.length - 1, lineNumber - 1 + replaceLines.length + contextLines);

			const contextElements: React.ReactElement[] = [];

			for (let i = showStart; i <= showEnd; i++) {
				const lineNumStr = String(i + 1).padStart(4, ' ');
				const line = lines[i] || '';
				const isReplacedLine = i + 1 >= lineNumber && i + 1 < lineNumber + replaceLines.length;

				let displayLine: string;
				try {
					displayLine = highlight(line, {language, theme: 'default'});
				} catch {
					displayLine = line;
				}

				if (isReplacedLine) {
					contextElements.push(
						<Text
							key={`context-${i}`}
							backgroundColor={themeColors.diffAdded}
							color={themeColors.diffAddedText}
							wrap="wrap"
						>
							{lineNumStr} + {displayLine}
						</Text>,
					);
				} else {
					contextElements.push(
						<Text key={`context-${i}`} color={themeColors.secondary}>
							{lineNumStr} {displayLine}
						</Text>,
					);
				}
			}

			const rangeDesc = lineNumber === endLine ? `line ${lineNumber}` : `lines ${lineNumber}-${endLine}`;
			const messageContent = (
				<Box flexDirection="column">
					<Text color={themeColors.tool}>{displayTitle} replace_lines</Text>

					<Box>
						<Text color={themeColors.secondary}>Path: </Text>
						<Text color={themeColors.primary}>{path}</Text>
					</Box>

					<Box>
						<Text color={themeColors.secondary}>Range: </Text>
						<Text color={themeColors.white}>{rangeDesc}</Text>
					</Box>

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.success}>✓ Replace completed successfully</Text>
					</Box>

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.secondary}>Context around replacement:</Text>
						{contextElements}
					</Box>
				</Box>
			);

			return <ToolMessage message={messageContent} hideBox={true} />;
		}

		// Preview mode - show what will be replaced
		if (lineNumber > lines.length || endLine > lines.length) {
			const maxLine = Math.max(lineNumber, endLine);
			throw new Error(
				`Line ${maxLine} is out of range (file has ${lines.length} lines)`
			);
		}

		const replaceLines = content.split('\n');
		const linesToRemove = endLine - lineNumber + 1;
		const contextLines = 3;
		const showStart = Math.max(0, lineNumber - 1 - contextLines);
		const showEnd = Math.min(lines.length - 1, endLine - 1 + contextLines);

		const contextBefore: React.ReactElement[] = [];
		const removedLines: React.ReactElement[] = [];
		const addedLines: React.ReactElement[] = [];
		const contextAfter: React.ReactElement[] = [];

		// Show context before
		for (let i = showStart; i < lineNumber - 1; i++) {
			const lineNumStr = String(i + 1).padStart(4, ' ');
			const line = lines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			contextBefore.push(
				<Text key={`before-${i}`} color={themeColors.secondary}>
					{lineNumStr} {displayLine}
				</Text>,
			);
		}

		// Show removed lines
		for (let i = lineNumber - 1; i < endLine; i++) {
			const lineNumStr = String(i + 1).padStart(4, ' ');
			const line = lines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			removedLines.push(
				<Text
					key={`remove-${i}`}
					backgroundColor={themeColors.diffRemoved}
					color={themeColors.diffRemovedText}
					wrap="wrap"
				>
					{lineNumStr} - {displayLine}
				</Text>,
			);
		}

		// Show added lines
		for (let i = 0; i < replaceLines.length; i++) {
			const lineNumStr = String(lineNumber + i).padStart(4, ' ');
			const line = replaceLines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			addedLines.push(
				<Text
					key={`add-${i}`}
					backgroundColor={themeColors.diffAdded}
					color={themeColors.diffAddedText}
					wrap="wrap"
				>
					{lineNumStr} + {displayLine}
				</Text>,
			);
		}

		// Show context after
		for (let i = endLine; i <= showEnd; i++) {
			const lineNumStr = String(i + replaceLines.length - linesToRemove + 1).padStart(4, ' ');
			const line = lines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			contextAfter.push(
				<Text key={`after-${i}`} color={themeColors.secondary}>
					{lineNumStr} {displayLine}
				</Text>,
			);
		}

		const rangeDesc = lineNumber === endLine ? `line ${lineNumber}` : `lines ${lineNumber}-${endLine}`;
		const messageContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>{displayTitle} replace_lines</Text>

				<Box>
					<Text color={themeColors.secondary}>Path: </Text>
					<Text color={themeColors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={themeColors.secondary}>Range: </Text>
					<Text color={themeColors.white}>{rangeDesc}</Text>
				</Box>

				<Box flexDirection="column" marginTop={1}>
					<Text color={themeColors.success}>
						✓ Replacing {linesToRemove} line{linesToRemove > 1 ? 's' : ''} with{' '}
						{replaceLines.length} line{replaceLines.length > 1 ? 's' : ''}
					</Text>
					<Box flexDirection="column">
						{contextBefore}
						{removedLines}
						{addedLines}
						{contextAfter}
					</Box>
				</Box>
			</Box>
		);

		return <ToolMessage message={messageContent} hideBox={true} />;
	} catch (error) {
		const errorContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>⚒ replace_lines</Text>

				<Box>
					<Text color={themeColors.secondary}>Path: </Text>
					<Text color={themeColors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={themeColors.error}>Error: </Text>
					<Text color={themeColors.error}>
						{error instanceof Error ? error.message : String(error)}
					</Text>
				</Box>
			</Box>
		);

		return <ToolMessage message={errorContent} hideBox={true} />;
	}
}

const formatter = async (args: any, result?: string): Promise<React.ReactElement> => {
	return <ReplaceLinesFormatter args={args} result={result} />;
};

export const replaceLinesTool: ToolDefinition = {
	handler,
	formatter,
	config: {
		type: 'function',
		function: {
			name: 'replace_lines',
			description: 'Replace a range of lines in a file with new content',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The path to the file to edit.',
					},
					line_number: {
						type: 'number',
						description: 'The starting line number (1-based) to replace.',
					},
					end_line: {
						type: 'number',
						description: 'The ending line number for range replacement. If not specified, only replaces line_number.',
					},
					content: {
						type: 'string',
						description: 'The replacement content. Can contain multiple lines separated by \\n.',
					},
				},
				required: ['path', 'line_number', 'content'],
			},
		},
	},
};