import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import {highlight} from 'cli-highlight';
import React from 'react';
import {Text, Box} from 'ink';
import type {EditArgs, LineChange} from './types.js';
import {colors} from '../../config/index.js';
import {getLanguageFromExtension} from '../../utils/programming-language-helper.js';
import ToolMessage from '../../components/tool-message.js';


export async function formatEditPreview(args: any): Promise<React.ReactElement> {
	const path = args.path || args.file_path || 'unknown';
	const mode = args.mode || 'insert';
	const lineNumber = Number(args.line_number);
	const endLine = Number(args.end_line) || lineNumber;
	const content = args.content || '';
	const targetLine = Number(args.target_line);
	const oldText = args.old_text || '';
	const newText = args.new_text || '';
	const replaceAll = args.replace_all || false;


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
				});
				break;

			case 'insert':
				previewContent = await formatInsertPreview({
					lines,
					lineNumber,
					content,
					language,
					contextLines,
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
				});
				break;

			case 'delete':
				previewContent = await formatDeletePreview({
					lines,
					lineNumber,
					endLine,
					language,
					contextLines,
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
				});
				break;

			default:
				previewContent = <Text color={colors.error}>Unknown edit mode: {mode}</Text>;
		}

		const messageContent = (
			<Box flexDirection="column">
				<Text color={colors.tool}>⚒ edit_file</Text>
				
				<Box>
					<Text color={colors.secondary}>Path: </Text>
					<Text color={colors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={colors.secondary}>Mode: </Text>
					<Text color={colors.white}>{mode}</Text>
				</Box>

				{mode === 'find_replace' ? (
					<Box>
						<Text color={colors.secondary}>Operation: </Text>
						<Text color={colors.white}>{replaceAll ? 'Replace all' : 'Replace first'}</Text>
					</Box>
				) : (
					<Box>
						<Text color={colors.secondary}>Range: </Text>
						<Text color={colors.white}>
							{lineNumber === endLine ? `line ${lineNumber}` : `lines ${lineNumber}-${endLine}`}
						</Text>
					</Box>
				)}

				{mode === 'move' && targetLine && (
					<Box>
						<Text color={colors.secondary}>Target: </Text>
						<Text color={colors.white}>line {targetLine}</Text>
					</Box>
				)}

				{previewContent}
			</Box>
		);

		return <ToolMessage message={messageContent} hideBox={true} />;
	} catch (error) {
		const errorContent = (
			<Box flexDirection="column">
				<Text color={colors.tool}>⚒ edit_file</Text>
				
				<Box>
					<Text color={colors.secondary}>Path: </Text>
					<Text color={colors.primary}>{path}</Text>
				</Box>

				<Box>
					<Text color={colors.error}>Error: </Text>
					<Text color={colors.error}>
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
}: {
	fileContent: string;
	lines: string[];
	oldText: string;
	newText: string;
	replaceAll: boolean;
	language: string;
	contextLines: number;
}): Promise<React.ReactElement> {
	// Use same logic as handler - check if text exists first
	if (!fileContent.includes(oldText)) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={colors.error}>✗ Text not found in file</Text>
				<Box>
					<Text color={colors.secondary}>Looking for: </Text>
					<Text color={colors.white}>{oldText}</Text>
				</Box>
				<Box>
					<Text color={colors.secondary}>Note: </Text>
					<Text color={colors.secondary}>Operation will fail - text must exist exactly as specified</Text>
				</Box>
			</Box>
		);
	}

	// Find all occurrences for diff display
	const occurrences: LineChange[] = [];

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
					displayLine = highlight(line, { language, theme: 'default' });
				} catch {
					displayLine = line;
				}
				
				contextBefore.push(
					<Box key={`before-${i}`}>
						<Text color={colors.secondary}>{lineNumStr}  </Text>
						<Text wrap="wrap">{displayLine}</Text>
					</Box>
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
					displayLine = highlight(line, { language, theme: 'default' });
				} catch {
					displayLine = line;
				}
				
				contextAfter.push(
					<Box key={`after-${i}`}>
						<Text color={colors.secondary}>{lineNumStr}  </Text>
						<Text wrap="wrap">{displayLine}</Text>
					</Box>
				);
			}
			
			changeElements.push(
				<Box key={lineNum} flexDirection="column" marginBottom={1}>
					<Text color={colors.secondary}>Line {lineNum}:</Text>
					{contextBefore}
					<Box>
						<Text backgroundColor="red" color="white" wrap="wrap">{lineNumStr}  - {oldLine}</Text>
					</Box>
					<Box>
						<Text backgroundColor="green" color="white" wrap="wrap">{lineNumStr}  + {newLine}</Text>
					</Box>
					{contextAfter}
				</Box>
			);
		}

		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={colors.success}>
					✓ {changesToShow.length} change{changesToShow.length > 1 ? 's' : ''} found
				</Text>
				{changeElements}
				{replaceAll && occurrences.length > changesToShow.length && (
					<Text color={colors.secondary}>
						... and {occurrences.length - changesToShow.length} more occurrences
					</Text>
				)}
			</Box>
		);
	} else {
		// Handle multiline text
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={colors.error}>✗ Could not locate text in file</Text>
				<Box>
					<Text color={colors.secondary}>Looking for text starting with: </Text>
					<Text color={colors.white}>{oldText.split('\n')[0]}</Text>
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
}: {
	lines: string[];
	lineNumber: number;
	content: string;
	language: string;
	contextLines: number;
}): Promise<React.ReactElement> {
	if (!lineNumber || lineNumber < 1 || lineNumber > lines.length + 1) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={colors.error}>
					✗ Line number {lineNumber} is out of range (file has {lines.length} lines)
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
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		contextBefore.push(
			<Box key={`before-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text>{displayLine}</Text>
			</Box>
		);
	}

	// Show inserted lines
	for (let i = 0; i < newLines.length; i++) {
		const lineNumStr = String(lineNumber + i).padStart(4, ' ');
		const line = newLines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		insertedLines.push(
			<Box key={`insert-${i}`}>
				<Text backgroundColor="green" color="white" wrap="wrap">{lineNumStr}  + {displayLine}</Text>
			</Box>
		);
	}

	// Show context after
	for (let i = lineNumber - 1; i <= showEnd; i++) {
		const lineNumStr = String(i + newLines.length + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		contextAfter.push(
			<Box key={`after-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text>{displayLine}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={colors.success}>
				✓ Inserting {newLines.length} line{newLines.length > 1 ? 's' : ''}
			</Text>
			{contextBefore}
			{insertedLines}
			{contextAfter}
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
}: {
	lines: string[];
	lineNumber: number;
	endLine: number;
	content: string;
	language: string;
	contextLines: number;
}): Promise<React.ReactElement> {
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
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		contextBefore.push(
			<Box key={`before-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text>{displayLine}</Text>
			</Box>
		);
	}

	// Show removed lines
	for (let i = lineNumber - 1; i < endLine; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		removedLines.push(
			<Box key={`remove-${i}`}>
				<Text backgroundColor="red" color="white" wrap="wrap">{lineNumStr}  - {displayLine}</Text>
			</Box>
		);
	}

	// Show added lines
	for (let i = 0; i < newLines.length; i++) {
		const lineNumStr = String(lineNumber + i).padStart(4, ' ');
		const line = newLines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		addedLines.push(
			<Box key={`add-${i}`}>
				<Text backgroundColor="green" color="white" wrap="wrap">{lineNumStr}  + {displayLine}</Text>
			</Box>
		);
	}

	// Show context after
	for (let i = endLine; i <= showEnd; i++) {
		const lineNumStr = String(i + newLines.length - linesToRemove + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		contextAfter.push(
			<Box key={`after-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text>{displayLine}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={colors.success}>
				✓ Replacing {linesToRemove} line{linesToRemove > 1 ? 's' : ''} with{' '}
				{newLines.length} line{newLines.length > 1 ? 's' : ''}
			</Text>
			{contextBefore}
			{removedLines}
			{addedLines}
			{contextAfter}
		</Box>
	);
}

async function formatDeletePreview({
	lines,
	lineNumber,
	endLine,
	language,
	contextLines,
}: {
	lines: string[];
	lineNumber: number;
	endLine: number;
	language: string;
	contextLines: number;
}): Promise<React.ReactElement> {
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
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		contextBefore.push(
			<Box key={`before-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text>{displayLine}</Text>
			</Box>
		);
	}

	// Show deleted lines
	for (let i = lineNumber - 1; i < endLine; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		deletedLines.push(
			<Box key={`delete-${i}`}>
				<Text backgroundColor="red" color="white" wrap="wrap">{lineNumStr}  - {displayLine}</Text>
			</Box>
		);
	}

	// Show context after
	for (let i = endLine; i <= showEnd; i++) {
		const lineNumStr = String(i - linesToRemove + 1).padStart(4, ' ');
		const line = lines[i] || '';
		let displayLine: string;
		try {
			displayLine = highlight(line, { language, theme: 'default' });
		} catch {
			displayLine = line;
		}

		contextAfter.push(
			<Box key={`after-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text>{displayLine}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={colors.success}>
				✓ Deleting {linesToRemove} line{linesToRemove > 1 ? 's' : ''}
			</Text>
			{contextBefore}
			{deletedLines}
			{contextAfter}
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
}: {
	lines: string[];
	lineNumber: number;
	endLine: number;
	targetLine: number;
	language: string;
	contextLines: number;
}): Promise<React.ReactElement> {
	if (!targetLine || targetLine < 1 || targetLine > lines.length + 1) {
		return (
			<Box flexDirection="column" marginTop={1}>
				<Text color={colors.error}>✗ Target line {targetLine} is invalid</Text>
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
		sourceSection.push(
			<Box key={`src-before-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text wrap="wrap">{line}</Text>
			</Box>
		);
	}

	for (let i = lineNumber - 1; i < endLine; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		sourceSection.push(
			<Box key={`src-move-${i}`}>
				<Text backgroundColor="red" color="white" wrap="wrap">{lineNumStr}  - {line}</Text>
			</Box>
		);
	}

	for (let i = endLine; i <= sourceEnd; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		sourceSection.push(
			<Box key={`src-after-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text wrap="wrap">{line}</Text>
			</Box>
		);
	}

	// Build target section
	for (let i = targetStart; i < targetLine - 1; i++) {
		const lineNumStr = String(i + 1).padStart(4, ' ');
		const line = lines[i] || '';
		targetSection.push(
			<Box key={`tgt-before-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text wrap="wrap">{line}</Text>
			</Box>
		);
	}

	for (let i = lineNumber - 1; i < endLine; i++) {
		const lineNumStr = String(targetLine + (i - lineNumber + 1)).padStart(4, ' ');
		const line = lines[i] || '';
		targetSection.push(
			<Box key={`tgt-move-${i}`}>
				<Text backgroundColor="green" color="white" wrap="wrap">{lineNumStr}  + {line}</Text>
			</Box>
		);
	}

	for (let i = targetLine - 1; i <= targetEnd; i++) {
		const lineNumStr = String(i + linesToMove + 1).padStart(4, ' ');
		const line = lines[i] || '';
		targetSection.push(
			<Box key={`tgt-after-${i}`}>
				<Text color={colors.secondary}>{lineNumStr}  </Text>
				<Text wrap="wrap">{line}</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={colors.success}>
				✓ Moving {linesToMove} line{linesToMove > 1 ? 's' : ''} to line {targetLine}
			</Text>
			<Box marginTop={1}>
				<Text color={colors.secondary}>From:</Text>
				{sourceSection}
			</Box>
			<Box marginTop={1}>
				<Text color={colors.secondary}>To:</Text>
				{targetSection}
			</Box>
		</Box>
	);
}
