import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import React from 'react';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {ThemeContext} from '../hooks/useTheme.js';
import ToolMessage from '../components/tool-message.js';

const handler: ToolHandler = async (args: {path: string}): Promise<string> => {
	const absPath = resolve(args.path);

	try {
		const content = await readFile(absPath, 'utf-8');

		// Check if file is empty (0 tokens)
		if (content.length === 0) {
			throw new Error(`File "${args.path}" exists but is empty (0 tokens)`);
		}

		const lines = content.split('\n');

		// Return content with line numbers for precise editing
		let result = '';
		for (let i = 0; i < lines.length; i++) {
			const lineNum = String(i + 1).padStart(4, ' ');
			result += `${lineNum}: ${lines[i]}\n`;
		}

		return result.slice(0, -1); // Remove trailing newline
	} catch (error: any) {
		// Handle file not found and other filesystem errors
		if (error.code === 'ENOENT') {
			throw new Error(`File "${args.path}" does not exist`);
		}

		// Re-throw other errors (including our empty file error)
		throw error;
	}
};

// Create a component that will re-render when theme changes
const ReadFileFormatter = React.memo(({args}: {args: any}) => {
	const {colors} = React.useContext(ThemeContext)!;
	const path = args.path || args.file_path || 'unknown';
	const [fileInfo, setFileInfo] = React.useState({size: 0, tokens: 0});

	React.useEffect(() => {
		const loadFileInfo = async () => {
			try {
				const content = await readFile(resolve(path), 'utf-8');
				const fileSize = content.length;
				const estimatedTokens = Math.ceil(fileSize / 4);
				setFileInfo({size: fileSize, tokens: estimatedTokens});
			} catch (error) {
				setFileInfo({size: 0, tokens: 0});
			}
		};
		loadFileInfo();
	}, [path]);

	const messageContent = (
		<Box flexDirection="column">
			<Text color={colors.tool}>⚒ read_file</Text>

			<Box>
				<Text color={colors.secondary}>Path: </Text>
				<Text color={colors.white}>{path}</Text>
			</Box>

			<Box>
				<Text color={colors.secondary}>Size: </Text>
				<Text color={colors.white}>
					{fileInfo.size} characters (~{fileInfo.tokens} tokens)
				</Text>
			</Box>

			{(args.offset || args.limit) && (
				<Box marginTop={1}>
					<Text color={colors.secondary}>Range: </Text>
					<Text color={colors.primary}>
						{args.offset && `from line ${args.offset} `}
						{args.limit && `(${args.limit} lines)`}
					</Text>
				</Box>
			)}
		</Box>
	);

	return <ToolMessage message={messageContent} hideBox={true} />;
});

const formatter = async (args: any): Promise<React.ReactElement> => {
	return <ReadFileFormatter args={args} />;
};

export const readFileTool: ToolDefinition = {
	handler,
	formatter,
	requiresConfirmation: false,
	config: {
		type: 'function',
		function: {
			name: 'read_file',
			description:
				'Read the contents of a file with line numbers (use line numbers with edit_file tool for precise editing)',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The path to the file to read.',
					},
				},
				required: ['path'],
			},
		},
	},
};
