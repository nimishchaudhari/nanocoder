import {resolve} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {highlight} from 'cli-highlight';
import React from 'react';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {ThemeContext} from '../hooks/useTheme.js';
import {getLanguageFromExtension} from '../utils/programming-language-helper.js';
import ToolMessage from '../components/tool-message.js';

const handler: ToolHandler = async (args: {
	path: string;
	content: string;
}): Promise<string> => {
	const absPath = resolve(args.path);
	await writeFile(absPath, args.content, 'utf-8');
	return 'File written successfully';
};

// Create a component that will re-render when theme changes
const CreateFileFormatter = React.memo(({args}: {args: any}) => {
	const {colors} = React.useContext(ThemeContext)!;
	const path = args.path || args.file_path || 'unknown';
	const newContent = args.content || '';
	const lineCount = newContent.split('\n').length;
	const charCount = newContent.length;

	// Estimate tokens (rough approximation: ~4 characters per token)
	const estimatedTokens = Math.ceil(charCount / 4);

	const messageContent = (
		<Box flexDirection="column">
			<Text color={colors.tool}>⚒ create_file</Text>

			<Box>
				<Text color={colors.secondary}>Path: </Text>
				<Text color={colors.white}>{path}</Text>
			</Box>
			<Box>
				<Text color={colors.secondary}>Size: </Text>
				<Text color={colors.white}>
					{lineCount} lines, {charCount} characters (~{estimatedTokens} tokens)
				</Text>
			</Box>

			{newContent.length > 0 ? (
				<Box flexDirection="column" marginTop={1}>
					<Text color={colors.white}>File content:</Text>
					{newContent.split('\n').map((line: string, i: number) => {
						const lineNumStr = String(i + 1).padStart(4, ' ');
						const ext = path.split('.').pop()?.toLowerCase();
						const language = getLanguageFromExtension(ext);

						try {
							const highlighted = highlight(line, {language, theme: 'default'});
							return (
								<Box key={i}>
									<Text color={colors.secondary}>{lineNumStr}  </Text>
									<Text wrap="wrap">{highlighted}</Text>
								</Box>
							);
						} catch {
							return (
								<Box key={i}>
									<Text color={colors.secondary}>{lineNumStr}  </Text>
									<Text wrap="wrap">{line}</Text>
								</Box>
							);
						}
					})}
				</Box>
			) : (
				<Box marginTop={1}>
					<Text color={colors.secondary}>File will be empty</Text>
				</Box>
			)}
		</Box>
	);

	return <ToolMessage message={messageContent} hideBox={true} />;
});

const formatter = async (args: any): Promise<React.ReactElement> => {
	return <CreateFileFormatter args={args} />;
};

export const createFileTool: ToolDefinition = {
	handler,
	formatter,
	config: {
		type: 'function',
		function: {
			name: 'create_file',
			description:
				'Create a new file with the specified content (overwrites if file exists)',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The path to the file to write.',
					},
					content: {
						type: 'string',
						description: 'The content to write to the file.',
					},
				},
				required: ['path', 'content'],
			},
		},
	},
};
