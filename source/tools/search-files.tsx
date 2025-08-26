import {readdir, readFile, stat} from 'node:fs/promises';
import {join, resolve, relative} from 'node:path';
import React from 'react';
import {Text, Box} from 'ink';
import type {ToolHandler, ToolDefinition} from '../types/index.js';
import {colors} from '../config/index.js';
import ToolMessage from '../components/tool-message.js';

// Simple glob pattern matcher for basic patterns
function simpleGlobMatch(pattern: string, text: string): boolean {
	// Convert glob pattern to regex
	let regexPattern = pattern
		.replace(/\./g, '\\.')
		.replace(/\*/g, '.*')
		.replace(/\?/g, '.');
	
	// Handle ** for directory traversal
	regexPattern = regexPattern.replace(/\*\*\//g, '(.*/)?');
	
	const regex = new RegExp(`^${regexPattern}$`, 'i');
	return regex.test(text);
}

interface SearchArgs {
	pattern?: string;           // File name/glob pattern
	content?: string;          // Search in file contents  
	path?: string;             // Path contains substring
	exclude?: string[];        // Patterns to exclude
	limit?: number;            // Max results (default 50)
	context_lines?: number;    // Lines around content matches (default 3)
	base_path?: string;        // Base directory to search (default: cwd)
}

interface SearchResult {
	type: 'file' | 'content';
	file_path: string;
	relative_path: string;
	line_number?: number;
	content_match?: string;
	context_lines?: string[];
}

const DEFAULT_EXCLUDES = [
	'**/node_modules/**',
	'**/.git/**',
	'**/dist/**',
	'**/build/**',
	'**/.next/**',
	'**/.nuxt/**',
	'**/coverage/**',
	'**/*.log',
	'**/tmp/**',
	'**/temp/**'
];

const handler: ToolHandler = async (args: SearchArgs): Promise<string> => {
	const basePath = resolve(args.base_path || process.cwd());
	const limit = args.limit || 50;
	const contextLines = args.context_lines || 3;
	const excludePatterns = [...DEFAULT_EXCLUDES, ...(args.exclude || [])];
	
	const results: SearchResult[] = [];

	async function searchRecursive(dir: string): Promise<void> {
		if (results.length >= limit) return;
		
		try {
			const entries = await readdir(dir, {withFileTypes: true});
			
			for (const entry of entries) {
				if (results.length >= limit) break;
				
				const fullPath = join(dir, entry.name);
				const relativePath = relative(basePath, fullPath);
				
				// Check exclusions
				const shouldExclude = excludePatterns.some(pattern => 
					simpleGlobMatch(pattern, relativePath) || simpleGlobMatch(pattern, fullPath)
				);
				
				if (shouldExclude) continue;
				
				if (entry.isDirectory()) {
					await searchRecursive(fullPath);
				} else if (entry.isFile()) {
					let matchFound = false;
					
					// File name pattern matching
					if (args.pattern && simpleGlobMatch(args.pattern, entry.name)) {
						results.push({
							type: 'file',
							file_path: fullPath,
							relative_path: relativePath
						});
						matchFound = true;
					}
					
					// Path substring matching
					if (!matchFound && args.path && relativePath.toLowerCase().includes(args.path.toLowerCase())) {
						results.push({
							type: 'file',
							file_path: fullPath,
							relative_path: relativePath
						});
						matchFound = true;
					}
					
					// Content searching
					if (args.content && !matchFound) {
						try {
							// Only search text files
							const fileStats = await stat(fullPath);
							if (fileStats.size > 1024 * 1024) continue; // Skip files > 1MB
							
							const content = await readFile(fullPath, 'utf-8');
							const lines = content.split('\n');
							const regex = new RegExp(args.content, 'gi');
							
							for (let i = 0; i < lines.length; i++) {
								if (results.length >= limit) break;
								
								if (regex.test(lines[i])) {
									const contextStart = Math.max(0, i - contextLines);
									const contextEnd = Math.min(lines.length - 1, i + contextLines);
									const contextArray = [];
									
									for (let j = contextStart; j <= contextEnd; j++) {
										const marker = j === i ? '>' : ' ';
										contextArray.push(`${marker} ${j + 1}: ${lines[j]}`);
									}
									
									results.push({
										type: 'content',
										file_path: fullPath,
										relative_path: relativePath,
										line_number: i + 1,
										content_match: lines[i],
										context_lines: contextArray
									});
								}
							}
						} catch (error) {
							// Skip files we can't read (binary, permissions, etc.)
							continue;
						}
					}
				}
			}
		} catch (error) {
			// Skip directories we can't read
			return;
		}
	}

	await searchRecursive(basePath);
	
	if (results.length === 0) {
		return 'No matches found.';
	}
	
	let output = `Found ${results.length} match${results.length === 1 ? '' : 'es'}${results.length >= limit ? ` (limited to ${limit})` : ''}:\n\n`;
	
	for (const result of results) {
		if (result.type === 'file') {
			output += `📁 ${result.relative_path}\n`;
		} else if (result.type === 'content') {
			output += `🔍 ${result.relative_path}:${result.line_number}\n`;
			output += `   Match: ${result.content_match?.trim()}\n`;
			if (result.context_lines && result.context_lines.length > 1) {
				output += '   Context:\n';
				for (const line of result.context_lines) {
					output += `   ${line}\n`;
				}
			}
			output += '\n';
		}
	}
	
	return output.trim();
};

const formatter = async (args: SearchArgs): Promise<React.ReactElement> => {
	const searchTypes = [];
	if (args.pattern) searchTypes.push(`pattern: ${args.pattern}`);
	if (args.content) searchTypes.push(`content: ${args.content}`);
	if (args.path) searchTypes.push(`path: ${args.path}`);
	
	const searchDescription = searchTypes.length > 0 
		? searchTypes.join(', ') 
		: 'all files';

	const messageContent = (
		<Box flexDirection="column">
			<Text color={colors.tool}>🔎 search_files</Text>
			
			<Box>
				<Text color={colors.secondary}>Search: </Text>
				<Text color={colors.white}>{searchDescription}</Text>
			</Box>

			<Box>
				<Text color={colors.secondary}>Base: </Text>
				<Text color={colors.white}>{args.base_path || 'current directory'}</Text>
			</Box>

			{args.limit && (
				<Box>
					<Text color={colors.secondary}>Limit: </Text>
					<Text color={colors.primary}>{args.limit} results</Text>
				</Box>
			)}
			
			{args.exclude && args.exclude.length > 0 && (
				<Box>
					<Text color={colors.secondary}>Excluding: </Text>
					<Text color={colors.primary}>{args.exclude.join(', ')}</Text>
				</Box>
			)}
		</Box>
	);

	return <ToolMessage message={messageContent} hideBox={true} />;
};

export const searchFilesTool: ToolDefinition = {
	handler,
	formatter,
	config: {
		type: 'function',
		function: {
			name: 'search_files',
			description: 'Search for files by name patterns, content, or path. Provides structured file discovery without bash commands.',
			parameters: {
				type: 'object',
				properties: {
					pattern: {
						type: 'string',
						description: 'Glob pattern for file names (e.g., "*.js", "**/*.tsx", "test*")'
					},
					content: {
						type: 'string',
						description: 'Search for this text/regex within file contents'
					},
					path: {
						type: 'string', 
						description: 'Find files whose path contains this substring'
					},
					exclude: {
						type: 'array',
						items: {type: 'string'},
						description: 'Additional glob patterns to exclude (beyond defaults like node_modules)'
					},
					limit: {
						type: 'number',
						description: 'Maximum number of results to return (default: 50)',
						default: 50
					},
					context_lines: {
						type: 'number',
						description: 'Number of context lines around content matches (default: 3)',
						default: 3
					},
					base_path: {
						type: 'string',
						description: 'Base directory to search from (default: current working directory)'
					}
				},
				required: []
			}
		}
	}
};