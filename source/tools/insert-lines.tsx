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

interface InsertLinesArgs {
	path: string;
	line_number: number;
	content: string;
}

const handler: ToolHandler = async (args: InsertLinesArgs): Promise<string> => {
	const {path, line_number, content} = args;

	// Validate line number
	if (!line_number || line_number < 1) {
		throw new Error(`Invalid line_number: ${line_number}. Must be a positive integer.`);
	}

	const absPath = resolve(path);
	const fileContent = await readFile(absPath, 'utf-8');
	const lines = fileContent.split('\n');

	// Validate line number is within range
	if (line_number > lines.length + 1) {
		throw new Error(
			`Line number ${line_number} is out of range (file has ${lines.length} lines)`
		);
	}

	// Insert new lines
	const insertLines = content.split('\n');
	const newLines = [...lines];
	newLines.splice(line_number - 1, 0, ...insertLines);

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

	return `Successfully inserted ${insertLines.length} line${insertLines.length > 1 ? 's' : ''} at line ${line_number}.${fileContext}`;
};

const InsertLinesFormatter = React.memo(({args, result}: {args: any; result?: string}) => {
	const {colors} = React.useContext(ThemeContext)!;
	const [preview, setPreview] = React.useState<React.ReactElement | null>(null);

	React.useEffect(() => {
		const generatePreview = async () => {
			const formattedPreview = await formatInsertLinesPreview(args, result, colors);
			setPreview(formattedPreview);
		};
		generatePreview();
	}, [args, result, colors]);

	return preview;
});

async function formatInsertLinesPreview(
	args: any,
	result?: string,
	colors?: any,
): Promise<React.ReactElement> {
	const themeColors = colors || getColors();
	const {path, line_number, content} = args;
	const lineNumber = Number(line_number);

	// Validate line number
	if (!lineNumber || lineNumber < 1) {
		throw new Error(`Invalid line_number: ${line_number}. Must be a positive integer.`);
	}

	const isResult = result !== undefined;
	const displayTitle = isResult ? '✓' : '⚒';

	try {
		const fileContent = await readFile(resolve(path), 'utf-8');
		const lines = fileContent.split('\n');
		const ext = path.split('.').pop()?.toLowerCase();
		const language = getLanguageFromExtension(ext);

		// For results, show the actual file state after insertion
		if (isResult) {
			const insertLines = content.split('\n');
			const contextLines = 5;
			const showStart = Math.max(0, lineNumber - 1 - contextLines);
			const showEnd = Math.min(lines.length - 1, lineNumber - 1 + insertLines.length + contextLines);

			const contextElements: React.ReactElement[] = [];

			for (let i = showStart; i <= showEnd; i++) {
				const lineNumStr = String(i + 1).padStart(4, ' ');
				const line = lines[i] || '';
				const isInsertedLine = i + 1 >= lineNumber && i + 1 < lineNumber + insertLines.length;

				let displayLine: string;
				try {
					displayLine = highlight(line, {language, theme: 'default'});
				} catch {
					displayLine = line;
				}

				if (isInsertedLine) {
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

			const messageContent = (
				<Box flexDirection="column">
					<Text color={themeColors.tool}>{displayTitle} insert_lines</Text>

					<Box>
						<Text color={themeColors.secondary}>Path: </Text>
						<Text color={themeColors.primary}>{path}</Text>
					</Box>

					<Box>
						<Text color={themeColors.secondary}>Line: </Text>
						<Text color={themeColors.white}>{lineNumber}</Text>
					</Box>

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.success}>✓ Insert completed successfully</Text>
					</Box>

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.secondary}>Context around insertion:</Text>
						{contextElements}
					</Box>
				</Box>
			);

			return <ToolMessage message={messageContent} hideBox={true} />;
		}

		// Preview mode - show what will be inserted
		if (lineNumber > lines.length + 1) {
			throw new Error(
				`Line number ${lineNumber} is out of range (file has ${lines.length} lines)`
			);
		}

		const insertLines = content.split('\n');
		const contextLines = 3;
		const showStart = Math.max(0, lineNumber - 1 - contextLines);
		const showEnd = Math.min(lines.length - 1, lineNumber - 1 + contextLines);

		const contextBefore: React.ReactElement[] = [];
		const insertedLines: React.ReactElement[] = [];
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

		// Show inserted lines
		for (let i = 0; i < insertLines.length; i++) {
			const lineNumStr = String(lineNumber + i).padStart(4, ' ');
			const line = insertLines[i] || '';
			let displayLine: string;
			try {
				displayLine = highlight(line, {language, theme: 'default'});
			} catch {
				displayLine = line;
			}

			insertedLines.push(
				<Text
					key={`insert-${i}`}
					backgroundColor={themeColors.diffAdded}
					color={themeColors.diffAddedText}
					wrap="wrap"
				>
					{lineNumStr} + {displayLine}
				</Text>,
			);
		}

		// Show context after
		for (let i = lineNumber - 1; i <= showEnd; i++) {
			const lineNumStr = String(i + insertLines.length + 1).padStart(4, ' ');
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

		const messageContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>{displayTitle} insert_lines</Text>

				<Box>
					<Text color={themeColors.secondary}>Path: </Text>
					<Text color={themeColors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={themeColors.secondary}>Line: </Text>
					<Text color={themeColors.white}>{lineNumber}</Text>
				</Box>

				<Box flexDirection="column" marginTop={1}>
					<Text color={themeColors.success}>
						✓ Inserting {insertLines.length} line{insertLines.length > 1 ? 's' : ''}
					</Text>
					<Box flexDirection="column">
						{contextBefore}
						{insertedLines}
						{contextAfter}
					</Box>
				</Box>
			</Box>
		);

		return <ToolMessage message={messageContent} hideBox={true} />;
	} catch (error) {
		const errorContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>⚒ insert_lines</Text>

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
	return <InsertLinesFormatter args={args} result={result} />;
};

export const insertLinesTool: ToolDefinition = {
	handler,
	formatter,
	config: {
		type: 'function',
		function: {
			name: 'insert_lines',
			description: 'Insert new lines at a specific line number in a file',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The path to the file to edit.',
					},
					line_number: {
						type: 'number',
						description: 'The line number (1-based) where content should be inserted.',
					},
					content: {
						type: 'string',
						description: 'The content to insert. Can contain multiple lines separated by \\n.',
					},
				},
				required: ['path', 'line_number', 'content'],
			},
		},
	},
};