import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {highlight} from 'cli-highlight';
import React from 'react';
import {Text, Box} from 'ink';
import type {LineChange} from '../../types/index.js';
import {ThemeContext} from '../../hooks/useTheme.js';
import {getColors} from '../../config/index.js';
import {getLanguageFromExtension} from '../../utils/programming-language-helper.js';
import ToolMessage from '../../components/tool-message.js';

// Create a component that will re-render when theme changes
const EditFileFormatter = React.memo(({args, result}: {args: any; result?: string}) => {
	const {colors} = React.useContext(ThemeContext)!;
	const [preview, setPreview] = React.useState<React.ReactElement | null>(null);
	
	React.useEffect(() => {
		const generatePreview = async () => {
			const formattedPreview = await formatEditPreviewInternal(args, result, colors);
			setPreview(formattedPreview);
		};
		generatePreview();
	}, [args, result, colors]);
	
	return preview;
});

async function formatEditPreviewInternal(
	args: any,
	result?: string,
	colors?: any,
): Promise<React.ReactElement> {
	const themeColors = colors || getColors();
	const path = args.path || args.file_path || 'unknown';
	const mode = args.mode || 'insert';
	const lineNumber = Number(args.line_number);
	const endLine = Number(args.end_line) || lineNumber;

	// Validate parsed numbers to prevent NaN display
	const isValidLineNumber = !isNaN(lineNumber) && lineNumber > 0;
	const isValidEndLine = !isNaN(endLine) && endLine > 0;

	// For line-based modes, fail early if line numbers are invalid
	if (mode !== 'find_replace' && (!isValidLineNumber || !isValidEndLine)) {
		// Throw an error to prevent the approval prompt entirely
		throw new Error(
			`Invalid line numbers: line_number=${args.line_number}, end_line=${args.end_line}. Operation cannot proceed.`,
		);
	}

	const content = args.content || '';
	const targetLine = Number(args.target_line);
	const oldText = args.old_text || '';
	const newText = args.new_text || '';
	const replaceAll = args.replace_all || false;

	// Determine if this is a preview (before edit) or result (after edit)
	const isResult = result !== undefined;
	const displayTitle = isResult ? '✓' : '⚒';

	// If this is a result (after edit), show summary and context around the edit
	if (isResult) {
		try {
			// Read the updated file content
			const fileContent = await readFile(resolve(path), 'utf-8');
			const lines = fileContent.split('\n');
			const ext = path.split('.').pop()?.toLowerCase();
			const language = getLanguageFromExtension(ext);

			// Import context calculation functions
			const {calculateActualEditRange} = await import('./context.js');

			// Calculate the actual edit range in the updated file
			const {startLine: actualStartLine, endLine: actualEndLine} =
				calculateActualEditRange(
					mode,
					lineNumber,
					endLine,
					content,
					targetLine,
				);

			// Show context around the edit (10 lines before and after)
			const contextLines = 10;
			const showStart = Math.max(0, actualStartLine - 1 - contextLines);
			const showEnd = Math.min(
				lines.length - 1,
				actualEndLine - 1 + contextLines,
			);

			// Create syntax-highlighted context content
			const contextElements: React.ReactElement[] = [];

			for (let i = showStart; i <= showEnd; i++) {
				const lineNumStr = String(i + 1).padStart(4, ' ');
				const line = lines[i] || '';
				const isInEditRange =
					i + 1 >= actualStartLine && i + 1 <= actualEndLine;

				let displayLine: string;
				try {
					displayLine = highlight(line, {language, theme: 'default'});
				} catch {
					displayLine = line;
				}

				if (isInEditRange) {
					// Use background highlighting for edited lines
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
					// Normal context lines
					contextElements.push(
						<Text key={`context-${i}`} color={themeColors.secondary}>
							{lineNumStr} {displayLine}
						</Text>,
					);
				}
			}

			const messageContent = (
				<Box flexDirection="column">
					<Text color={themeColors.tool}>{displayTitle} edit_file</Text>

					<Box>
						<Text color={themeColors.secondary}>Path: </Text>
						<Text color={themeColors.primary}>{path}</Text>
					</Box>

					<Box>
						<Text color={themeColors.secondary}>Mode: </Text>
						<Text color={themeColors.white}>{mode}</Text>
					</Box>

					{mode === 'find_replace' ? (
						<Box>
							<Text color={themeColors.secondary}>Operation: </Text>
							<Text color={themeColors.white}>
								{replaceAll ? 'Replace all' : 'Replace first'}
							</Text>
						</Box>
					) : (
						<Box>
							<Text color={themeColors.secondary}>Range: </Text>
							<Text color={themeColors.white}>
								{!isValidLineNumber || !isValidEndLine
									? 'invalid line range'
									: lineNumber === endLine
									? `line ${lineNumber}`
									: `lines ${lineNumber}-${endLine}`}
							</Text>
						</Box>
					)}

					{mode === 'move' && targetLine && (
						<Box>
							<Text color={themeColors.secondary}>Target: </Text>
							<Text color={themeColors.white}>line {targetLine}</Text>
						</Box>
					)}

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.success}>✓ Edit completed successfully</Text>
					</Box>

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.secondary}>Context around edit:</Text>
						{contextElements}
					</Box>
				</Box>
			);

			return <ToolMessage message={messageContent} hideBox={true} />;
		} catch (error) {
			// Fallback to simple summary if file reading fails
			const messageContent = (
				<Box flexDirection="column">
					<Text color={themeColors.tool}>{displayTitle} edit_file</Text>

					<Box>
						<Text color={themeColors.secondary}>Path: </Text>
						<Text color={themeColors.primary}>{path}</Text>
					</Box>

					<Box>
						<Text color={themeColors.secondary}>Mode: </Text>
						<Text color={themeColors.white}>{mode}</Text>
					</Box>

					{mode === 'find_replace' ? (
						<Box>
							<Text color={themeColors.secondary}>Operation: </Text>
							<Text color={themeColors.white}>
								{replaceAll ? 'Replace all' : 'Replace first'}
							</Text>
						</Box>
					) : (
						<Box>
							<Text color={themeColors.secondary}>Range: </Text>
							<Text color={themeColors.white}>
								{!isValidLineNumber || !isValidEndLine
									? 'invalid line range'
									: lineNumber === endLine
									? `line ${lineNumber}`
									: `lines ${lineNumber}-${endLine}`}
							</Text>
						</Box>
					)}

					{mode === 'move' && targetLine && (
						<Box>
							<Text color={themeColors.secondary}>Target: </Text>
							<Text color={themeColors.white}>line {targetLine}</Text>
						</Box>
					)}

					<Box flexDirection="column" marginTop={1}>
						<Text color={themeColors.success}>✓ Edit completed successfully</Text>
						<Text color={themeColors.error}>
							Note: Could not display file context
						</Text>
					</Box>
				</Box>
			);

			return <ToolMessage message={messageContent} hideBox={true} />;
		}
	}

	// This is a preview (before edit) - show the detailed diff view
	try {
		const fileContent = await readFile(resolve(path), 'utf-8');
		const lines = fileContent.split('\n');

		const ext = path.split('.').pop()?.toLowerCase();
		const language = getLanguageFromExtension(ext);
		const contextLines = 3;

		let previewContent: React.ReactElement;

		switch (mode) {
			case 'find_replace':
				previewContent = await formatFindReplacePreview({
					fileContent,
					lines,
					oldText,
					newText,
					replaceAll,
					language,
					contextLines,
					isResult: false, // Always false for preview mode
					colors: themeColors,
				});
				break;

			case 'insert':
				previewContent = await formatInsertPreview({
					lines,
					lineNumber,
					content,
					language,
					contextLines,
					isResult: false, // Always false for preview mode
					colors: themeColors,
				});
				break;

			case 'replace':
				previewContent = await formatReplacePreview({
					lines,
					lineNumber,
					endLine,
					content,
					language,
					contextLines,
					isResult: false, // Always false for preview mode
					colors: themeColors,
				});
				break;

			case 'delete':
				previewContent = await formatDeletePreview({
					lines,
					lineNumber,
					endLine,
					language,
					contextLines,
					isResult: false, // Always false for preview mode
					colors: themeColors,
				});
				break;

			case 'move':
				previewContent = await formatMovePreview({
					lines,
					lineNumber,
					endLine,
					targetLine,
					language,
					contextLines,
					isResult: false, // Always false for preview mode
					colors: themeColors,
				});
				break;

			default:
				previewContent = (
					<Text color={themeColors.error}>Unknown edit mode: {mode}</Text>
				);
		}

		const messageContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>{displayTitle} edit_file</Text>

				<Box>
					<Text color={themeColors.secondary}>Path: </Text>
					<Text color={themeColors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={themeColors.secondary}>Mode: </Text>
					<Text color={themeColors.white}>{mode}</Text>
				</Box>

				{mode === 'find_replace' ? (
					<Box>
						<Text color={themeColors.secondary}>Operation: </Text>
						<Text color={themeColors.white}>
							{replaceAll ? 'Replace all' : 'Replace first'}
						</Text>
					</Box>
				) : (
					<Box>
						<Text color={themeColors.secondary}>Range: </Text>
						<Text color={themeColors.white}>
							{!isValidLineNumber || !isValidEndLine
								? 'invalid line range'
								: lineNumber === endLine
								? `line ${lineNumber}`
								: `lines ${lineNumber}-${endLine}`}
						</Text>
					</Box>
				)}

				{mode === 'move' && targetLine && (
					<Box>
						<Text color={themeColors.secondary}>Target: </Text>
						<Text color={themeColors.white}>line {targetLine}</Text>
					</Box>
				)}

				{previewContent}
			</Box>
		);

		return <ToolMessage message={messageContent} hideBox={true} />;
	} catch (error) {
		const errorContent = (
			<Box flexDirection="column">
				<Text color={themeColors.tool}>⚒ edit_file</Text>

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

async function formatFindReplacePreview({
	fileContent,
	lines,
	oldText,
	newText,
	replaceAll,
	language,
	contextLines,
	isResult,
	colors,
}: {
	fileContent: string;
	lines: string[];
	oldText: string;
	newText: string;
	replaceAll: boolean;
	language: string;
	contextLines: number;
	isResult: boolean;
	colors?: any;
}): Promise<React.ReactElement> {
	const themeColors = colors || getColors();

	// Use same logic as handler - check if text exists first
	if (!fileContent.includes(oldText)) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={themeColors.error}>✗ Text not found in file</Text>
				<Box>
					<Text color={themeColors.secondary}>Looking for: </Text>
					<Text color={themeColors.white}>{oldText}</Text>
				</Box>
				<Box>
					<Text color={themeColors.secondary}>Note: </Text>
					<Text color={themeColors.secondary}>
						Operation will fail - text must exist exactly as specified
					</Text>
				</Box>
			</Box>
		);
	}

	// Find all occurrences for diff display
	const occurrences: LineChange[] = [];

	// Handle multiline text by searching in the full file content
	if (oldText.includes('\n')) {
		// For multiline text, find all occurrences in the full content
		let searchFrom = 0;
		while (true) {
			const pos = fileContent.indexOf(oldText, searchFrom);
			if (pos === -1) break;

			// Find which line this occurrence starts on
			const textBeforeMatch = fileContent.substring(0, pos);
			const lineNum = textBeforeMatch.split('\n').length;

			occurrences.push({
				lineNum,
				lineContent: lines[lineNum - 1] || '',
				startPos: pos - textBeforeMatch.lastIndexOf('\n') - 1,
			});

			if (!replaceAll) break;
			searchFrom = pos + oldText.length;
		}
	} else {
		// Original single-line logic
		for (let i = 0; i < lines.length; i++) {
			const lineContent = lines[i];
			if (!lineContent) continue;

			let searchFrom = 0;

			while (true) {
				const pos = lineContent.indexOf(oldText, searchFrom);
				if (pos === -1) break;

				occurrences.push({
					lineNum: i + 1,
					lineContent,
					startPos: pos,
				});

				if (!replaceAll) break;
				searchFrom = pos + oldText.length;
			}
		}
	}

	// Handle single-line occurrences
	if (occurrences.length > 0) {
		const changesToShow = replaceAll ? occurrences : occurrences.slice(0, 1);
		const changeElements: React.ReactElement[] = [];

		for (const occurrence of changesToShow) {
			const {lineNum, lineContent, startPos} = occurrence;

			// Show context around the change
			const startLine = Math.max(0, lineNum - 1 - contextLines);
			const endLine = Math.min(lines.length - 1, lineNum - 1 + contextLines);

			const contextBefore: React.ReactElement[] = [];
			const contextAfter: React.ReactElement[] = [];

			// Show context before
			for (let i = startLine; i < lineNum - 1; i++) {
				const lineNumStr = String(i + 1).padStart(4, ' ');
				const line = lines[i] || '';
				let displayLine: string;
				try {
					displayLine = highlight(line, {language, theme: 'default'});
				} catch {
					displayLine = line;
				}

				contextBefore.push(
					<Text key={`before-${i}`} color={themeColors.secondary} wrap="wrap">
						{lineNumStr} {displayLine}
					</Text>,
				);
			}

			// Show the changed line
			const lineNumStr = String(lineNum).padStart(4, ' ');
			const before = lineContent.substring(0, startPos);
			const after = lineContent.substring(startPos + oldText.length);
			const oldLine = before + oldText + after;
			const newLine = before + newText + after;

			// Show limited context after
			const maxAfterLines = 2;
			const actualEndLine = Math.min(endLine, lineNum - 1 + maxAfterLines);
			for (let i = lineNum; i <= actualEndLine; i++) {
				const lineNumStr = String(i + 1).padStart(4, ' ');
				const line = lines[i] || '';
				let displayLine: string;
				try {
					displayLine = highlight(line, {language, theme: 'default'});
				} catch {
					displayLine = line;
				}

				contextAfter.push(
					<Text key={`after-${i}`} color={themeColors.secondary} wrap="wrap">
						{lineNumStr} {displayLine}
					</Text>,
				);
			}

			changeElements.push(
				<Box key={lineNum} flexDirection="column" marginBottom={1}>
					<Text color={themeColors.secondary}>Line {lineNum}:</Text>
					{contextBefore}
					<Box>
						<Text
							backgroundColor={themeColors.diffRemoved}
							color={themeColors.diffRemovedText}
							wrap="wrap"
						>
							{lineNumStr} - {oldLine}
						</Text>
					</Box>
					<Box>
						<Text
							backgroundColor={themeColors.diffAdded}
							color={themeColors.diffAddedText}
							wrap="wrap"
						>
							{lineNumStr} + {newLine}
						</Text>
					</Box>
					{contextAfter}
				</Box>,
			);
		}

		const statusText = isResult
			? `${changesToShow.length} change${
					changesToShow.length > 1 ? 's' : ''
			  } made`
			: `${changesToShow.length} change${
					changesToShow.length > 1 ? 's' : ''
			  } found`;

		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={themeColors.success}>✓ {statusText}</Text>
				{changeElements}
				{replaceAll && occurrences.length > changesToShow.length && (
					<Text color={themeColors.secondary}>
						... and {occurrences.length - changesToShow.length} more occurrences
					</Text>
				)}
			</Box>
		);
	} else {
		// Handle multiline text
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={themeColors.error}>✗ Could not locate text in file</Text>
				<Box>
					<Text color={themeColors.secondary}>Looking for text starting with: </Text>
					<Text color={themeColors.white}>{oldText.split('\n')[0]}</Text>
				</Box>
			</Box>
		);
	}
}

async function formatInsertPreview({
	lines,
	lineNumber,
	content,
	language,
	contextLines,
	isResult,
	colors,
}: {
	lines: string[];
	lineNumber: number;
	content: string;
	language: string;
	contextLines: number;
	isResult: boolean;
	colors?: any;
}): Promise<React.ReactElement> {
	const themeColors = colors || getColors();

	if (!lineNumber || lineNumber < 1 || lineNumber > lines.length + 1) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={themeColors.error}>
					✗ Line number {lineNumber} is out of range (file has {lines.length}{' '}
					lines)
				</Text>
			</Box>
		);
	}

	const newLines = content.split('\n');
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
	for (let i = 0; i < newLines.length; i++) {
		const lineNumStr = String(lineNumber + i).padStart(4, ' ');
		const line = newLines[i] || '';
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
		const lineNumStr = String(i + newLines.length + 1).padStart(4, ' ');
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

	const actionText = isResult ? 'Inserted' : 'Inserting';

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={themeColors.success}>
				✓ {actionText} {newLines.length} line{newLines.length > 1 ? 's' : ''}
			</Text>
			<Box flexDirection="column">
				{contextBefore}
				{insertedLines}
				{contextAfter}
			</Box>
		</Box>
	);
}

async function formatReplacePreview({
	lines,
	lineNumber,
	endLine,
	content,
	language,
	contextLines,
	isResult,
	colors,
}: {
	lines: string[];
	lineNumber: number;
	endLine: number;
	content: string;
	language: string;
	contextLines: number;
	isResult: boolean;
	colors?: any;
}): Promise<React.ReactElement> {
	const themeColors = colors || getColors();

	const newLines = content.split('\n');
	const linesToRemove = endLine - lineNumber + 1;
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
	for (let i = 0; i < newLines.length; i++) {
		const lineNumStr = String(lineNumber + i).padStart(4, ' ');
		const line = newLines[i] || '';
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
		const lineNumStr = String(i + newLines.length - linesToRemove + 1).padStart(
			4,
			' ',
		);
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

	const actionText = isResult ? 'Replaced' : 'Replacing';

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={themeColors.success}>
				✓ {actionText} {linesToRemove} line{linesToRemove > 1 ? 's' : ''} with{' '}
				{newLines.length} line{newLines.length > 1 ? 's' : ''}
			</Text>
			<Box flexDirection="column">
				{contextBefore}
				{removedLines}
				{addedLines}
				{contextAfter}
			</Box>
		</Box>
	);
}

async function formatDeletePreview({
	lines,
	lineNumber,
	endLine,
	language,
	contextLines,
	isResult,
	colors,
}: {
	lines: string[];
	lineNumber: number;
	endLine: number;
	language: string;
	contextLines: number;
	isResult: boolean;
	colors?: any;
}): Promise<React.ReactElement> {
	const themeColors = colors || getColors();

	const linesToRemove = endLine - lineNumber + 1;
	const showStart = Math.max(0, lineNumber - 1 - contextLines);
	const showEnd = Math.min(lines.length - 1, endLine - 1 + contextLines);

	const contextBefore: React.ReactElement[] = [];
	const deletedLines: React.ReactElement[] = [];
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

	// Show deleted lines
	for (let i = lineNumber - 1; i < endLine; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, {language, theme: 'default'});
		} catch {
			displayLine = line;
		}

		deletedLines.push(
			<Text
				key={`delete-${i}`}
				backgroundColor={themeColors.diffRemoved}
				color={themeColors.diffRemovedText}
				wrap="wrap"
			>
				{lineNumStr} - {displayLine}
			</Text>,
		);
	}

	// Show context after
	for (let i = endLine; i <= showEnd; i++) {
		const lineNumStr = String(i - linesToRemove + 1).padStart(4, ' ');
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

	const actionText = isResult ? 'Deleted' : 'Deleting';

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={themeColors.success}>
				✓ {actionText} {linesToRemove} line{linesToRemove > 1 ? 's' : ''}
			</Text>
			<Box flexDirection="column">
				{contextBefore}
				{deletedLines}
				{contextAfter}
			</Box>
		</Box>
	);
}

async function formatMovePreview({
	lines,
	lineNumber,
	endLine,
	targetLine,
	language,
	contextLines,
	isResult,
	colors,
}: {
	lines: string[];
	lineNumber: number;
	endLine: number;
	targetLine: number;
	language: string;
	contextLines: number;
	isResult: boolean;
	colors?: any;
}): Promise<React.ReactElement> {
	const themeColors = colors || getColors();

	if (!targetLine || targetLine < 1 || targetLine > lines.length + 1) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={themeColors.error}>✗ Target line {targetLine} is invalid</Text>
			</Box>
		);
	}

	const linesToMove = endLine - lineNumber + 1;
	const sourceStart = Math.max(0, lineNumber - 1 - contextLines);
	const sourceEnd = Math.min(lines.length - 1, endLine - 1 + contextLines);
	const targetStart = Math.max(0, targetLine - 1 - contextLines);
	const targetEnd = Math.min(lines.length - 1, targetLine - 1 + contextLines);

	const sourceSection: React.ReactElement[] = [];
	const targetSection: React.ReactElement[] = [];

	// Build source section
	for (let i = sourceStart; i < lineNumber - 1; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, {language, theme: 'default'});
		} catch {
			displayLine = line;
		}
		sourceSection.push(
			<Text key={`src-before-${i}`} color={themeColors.secondary} wrap="wrap">
				{lineNumStr} {displayLine}
			</Text>,
		);
	}

	for (let i = lineNumber - 1; i < endLine; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, {language, theme: 'default'});
		} catch {
			displayLine = line;
		}
		sourceSection.push(
			<Text
				key={`src-move-${i}`}
				backgroundColor={themeColors.diffRemoved}
				color={themeColors.diffRemovedText}
				wrap="wrap"
			>
				{lineNumStr} - {displayLine}
			</Text>,
		);
	}

	for (let i = endLine; i <= sourceEnd; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, {language, theme: 'default'});
		} catch {
			displayLine = line;
		}
		sourceSection.push(
			<Text key={`src-after-${i}`} color={themeColors.secondary} wrap="wrap">
				{lineNumStr} {displayLine}
			</Text>,
		);
	}

	// Build target section
	for (let i = targetStart; i < targetLine - 1; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, {language, theme: 'default'});
		} catch {
			displayLine = line;
		}
		targetSection.push(
			<Text key={`tgt-before-${i}`} color={themeColors.secondary} wrap="wrap">
				{lineNumStr} {displayLine}
			</Text>,
		);
	}

	for (let i = lineNumber - 1; i < endLine; i++) {
		const lineNumStr = String(targetLine + (i - lineNumber + 1)).padStart(
			4,
			' ',
		);
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, {language, theme: 'default'});
		} catch {
			displayLine = line;
		}
		targetSection.push(
			<Text
				key={`tgt-move-${i}`}
				backgroundColor={themeColors.diffAdded}
				color={themeColors.diffAddedText}
				wrap="wrap"
			>
				{lineNumStr} + {displayLine}
			</Text>,
		);
	}

	for (let i = targetLine - 1; i <= targetEnd; i++) {
		const lineNumStr = String(i + linesToMove + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, {language, theme: 'default'});
		} catch {
			displayLine = line;
		}
		targetSection.push(
			<Text key={`tgt-after-${i}`} color={themeColors.secondary} wrap="wrap">
				{lineNumStr} {displayLine}
			</Text>,
		);
	}

	const actionText = isResult ? 'Moved' : 'Moving';

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={themeColors.success}>
				✓ {actionText} {linesToMove} line{linesToMove > 1 ? 's' : ''} to line{' '}
				{targetLine}
			</Text>
			<Box marginTop={1}>
				<Text color={themeColors.secondary}>From:</Text>
				{sourceSection}
			</Box>
			<Box marginTop={1}>
				<Text color={themeColors.secondary}>To:</Text>
				{targetSection}
			</Box>
		</Box>
	);
}

export async function formatEditPreview(args: any, result?: string): Promise<React.ReactElement> {
	return <EditFileFormatter args={args} result={result} />;
}
