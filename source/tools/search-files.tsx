import {relative} from 'node:path';
import {exec} from 'node:child_process';
import {promisify} from 'node:util';
import React from 'react';

const execAsync = promisify(exec);
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '@/types/index';
import {ThemeContext} from '@/hooks/useTheme';
import ToolMessage from '@/components/tool-message';

interface SearchMatch {
	file: string;
	line?: number;
	content?: string;
	context?: string[];
}

interface SearchResult {
	matches: SearchMatch[];
	truncated: boolean;
	totalMatches: number;
}

/**
 * Search file contents using grep
 */
async function searchFiles(
	query: string,
	cwd: string,
	maxResults: number,
	contextLines: number,
): Promise<SearchResult> {
	try {
		// Use grep for content search
		const {stdout} = await execAsync(
			`grep -rn -i --include="*" --exclude-dir={node_modules,dist,.git,build,coverage} "${query.replace(
				/"/g,
				'\\"',
			)}" . | head -n ${maxResults}`,
			{cwd, maxBuffer: 1024 * 1024},
		);

		const matches: SearchMatch[] = [];
		const lines = stdout.trim().split('\n').filter(Boolean);

		for (const line of lines) {
			const match = line.match(/^\.\/(.+?):(\d+):(.*)$/);
			if (match) {
				matches.push({
					file: match[1],
					line: parseInt(match[2], 10),
					content: match[3].trim(),
				});
			}
		}

		return {
			matches,
			truncated: lines.length >= maxResults,
			totalMatches: matches.length,
		};
	} catch (error: any) {
		// grep returns exit code 1 when no matches found
		if (error.code === 1) {
			return {matches: [], truncated: false, totalMatches: 0};
		}
		throw error;
	}
}

/**
 * List files matching a glob pattern using find
 */
async function listFiles(
	pattern: string,
	cwd: string,
	maxResults: number,
): Promise<SearchResult> {
	try {
		// Convert glob pattern to find-compatible pattern
		// **/*.ts -> -name "*.ts"
		// **/*.{ts,tsx} -> \( -name "*.ts" -o -name "*.tsx" \)
		let findPattern = '';

		if (pattern.includes('{') && pattern.includes('}')) {
			// Handle brace expansion
			const braceMatch = pattern.match(/\{([^}]+)\}/);
			if (braceMatch) {
				const extensions = braceMatch[1].split(',');
				const patterns = extensions.map(ext => `-name "*.${ext}"`).join(' -o ');
				findPattern = `\\( ${patterns} \\)`;
			}
		} else {
			// Simple pattern like **/*.ts
			const ext = pattern.split('*').pop();
			findPattern = `-name "*${ext}"`;
		}

		const {stdout} = await execAsync(
			`find . -type f ${findPattern} -not -path "*/node_modules/*" -not -path "*/dist/*" -not -path "*/.git/*" | head -n ${maxResults}`,
			{cwd, maxBuffer: 1024 * 1024},
		);

		const matches: SearchMatch[] = stdout
			.trim()
			.split('\n')
			.filter(Boolean)
			.map(line => ({file: line.replace(/^\.\//, '')}));

		return {
			matches,
			truncated: matches.length >= maxResults,
			totalMatches: matches.length,
		};
	} catch (error: any) {
		if (error.code === 1) {
			return {matches: [], truncated: false, totalMatches: 0};
		}
		throw error;
	}
}

const handler: ToolHandler = async (args: {
	query?: string;
	pattern?: string;
	maxResults?: number;
	contextLines?: number;
}): Promise<string> => {
	const cwd = process.cwd();
	const maxResults = args.maxResults || 50;
	const contextLines = args.contextLines || 2;

	try {
		let result: SearchResult;

		if (args.query) {
			// Content search
			result = await searchFiles(args.query, cwd, maxResults, contextLines);

			if (result.matches.length === 0) {
				return `No matches found for "${args.query}"`;
			}

			// Format results
			let output = `Found ${result.totalMatches} matches${
				result.truncated ? ` (showing first ${maxResults})` : ''
			}:\n\n`;

			for (const match of result.matches) {
				output += `${match.file}:${match.line}\n`;
				if (match.content) {
					output += `  ${match.content}\n`;
				}
				if (match.context && match.context.length > 1) {
					output += `  Context:\n`;
					for (const line of match.context.slice(0, 3)) {
						output += `    ${line.trim()}\n`;
					}
				}
				output += '\n';
			}

			return output.trim();
		} else if (args.pattern) {
			// File pattern search
			result = await listFiles(args.pattern, cwd, maxResults);

			if (result.matches.length === 0) {
				return `No files found matching pattern "${args.pattern}"`;
			}

			let output = `Found ${result.totalMatches} files${
				result.truncated ? ` (showing first ${maxResults})` : ''
			}:\n\n`;
			output += result.matches.map(m => m.file).join('\n');

			return output;
		} else {
			throw new Error('Either "query" or "pattern" must be provided');
		}
	} catch (error: any) {
		throw new Error(`Search failed: ${error.message}`);
	}
};

const SearchFilesFormatter = React.memo(
	({args, result}: {args: any; result?: string}) => {
		const {colors} = React.useContext(ThemeContext)!;

		// Parse result to get match count
		let matchCount = 0;
		if (result && !result.startsWith('Error:')) {
			const firstLine = result.split('\n')[0];
			const matchFound = firstLine.match(/Found (\d+)/);
			if (matchFound) {
				matchCount = parseInt(matchFound[1], 10);
			}
		}

		const messageContent = (
			<Box flexDirection="column">
				<Text color={colors.tool}>⚒ search_files</Text>

				{args.query && (
					<Box>
						<Text color={colors.secondary}>Query: </Text>
						<Text color={colors.white}>{args.query}</Text>
					</Box>
				)}

				{args.pattern && (
					<Box>
						<Text color={colors.secondary}>Pattern: </Text>
						<Text color={colors.white}>{args.pattern}</Text>
					</Box>
				)}

				<Box>
					<Text color={colors.secondary}>Results: </Text>
					<Text color={colors.white}>{matchCount}</Text>
				</Box>
			</Box>
		);

		return <ToolMessage message={messageContent} hideBox={true} />;
	},
);

const formatter = async (
	args: any,
	result?: string,
): Promise<React.ReactElement> => {
	if (result && result.startsWith('Error:')) {
		return <></>;
	}
	return <SearchFilesFormatter args={args} result={result} />;
};

export const searchFilesTool: ToolDefinition = {
	handler,
	formatter,
	requiresConfirmation: false,
	config: {
		type: 'function',
		function: {
			name: 'search_files',
			description:
				'Search for files by pattern (glob) or search file contents for a query string. Returns file paths and optionally content matches with context. Uses ripgrep if available for fast content search.',
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						description:
							'Search query to find in file contents (case-insensitive). Either query or pattern must be provided.',
					},
					pattern: {
						type: 'string',
						description:
							'Glob pattern to match file names (e.g., "**/*.ts", "src/**/*.tsx"). Either query or pattern must be provided.',
					},
					maxResults: {
						type: 'number',
						description: 'Maximum number of results to return (default: 50)',
					},
					contextLines: {
						type: 'number',
						description:
							'Number of context lines to include around matches (default: 2)',
					},
				},
				required: [],
			},
		},
	},
};
