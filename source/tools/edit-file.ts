import React from 'react';
import type {ToolHandler, ToolDefinition, EditArgs} from '../types/index.js';
import {executeEdit} from './edit-file/handlers.js';
import {formatEditPreview} from './edit-file/formatter.js';

const handler: ToolHandler = async (args: EditArgs): Promise<string> => {
	// Early validation to prevent execution with invalid parameters
	if (args.mode !== 'find_replace') {
		// Check if line_number is provided and valid
		if (args.line_number === undefined || args.line_number === null) {
			throw new Error(`line_number is required for mode "${args.mode}"`);
		}
		
		const lineNumber = Number(args.line_number);
		if (isNaN(lineNumber) || lineNumber < 1) {
			throw new Error(`Invalid line_number: ${args.line_number}. Must be a positive integer.`);
		}
		
		// Check end_line if provided
		if (args.end_line !== undefined && args.end_line !== null) {
			const endLine = Number(args.end_line);
			if (isNaN(endLine) || endLine < 1) {
				throw new Error(`Invalid end_line: ${args.end_line}. Must be a positive integer.`);
			}
		}
		
		// Check target_line for move operations
		if (args.mode === 'move') {
			if (args.target_line === undefined || args.target_line === null) {
				throw new Error(`target_line is required for move mode`);
			}
			const targetLine = Number(args.target_line);
			if (isNaN(targetLine) || targetLine < 1) {
				throw new Error(`Invalid target_line: ${args.target_line}. Must be a positive integer.`);
			}
		}
	}
	
	return await executeEdit(args);
};

const formatter = async (args: any, result?: string): Promise<React.ReactElement> => {
	return await formatEditPreview(args, result);
};

export const editFileTool: ToolDefinition = {
	handler,
	formatter,
	config: {
		type: 'function',
		function: {
			name: 'edit_file',
			description:
				'Edit specific lines in a file (insert, replace, delete, or move lines by line number)',
			parameters: {
				type: 'object',
				properties: {
					path: {
						type: 'string',
						description: 'The path to the file to edit.',
					},
					mode: {
						type: 'string',
						enum: ['insert', 'replace', 'delete', 'move', 'find_replace'],
						description:
							"The editing operation: 'insert' adds lines, 'replace' replaces line range, 'delete' removes lines, 'move' relocates lines, 'find_replace' finds and replaces text content.",
					},
					line_number: {
						type: 'number',
						description:
							'The starting line number (1-based). Required for insert, replace, delete, move modes.',
					},
					end_line: {
						type: 'number',
						description:
							'The ending line number for range operations (replace, delete, move). If not specified, only affects line_number.',
					},
					content: {
						type: 'string',
						description:
							'The content for insert/replace operations. Can contain multiple lines separated by \\n.',
					},
					target_line: {
						type: 'number',
						description: 'The target line number for move operations.',
					},
					old_text: {
						type: 'string',
						description:
							'The text to find and replace (for find_replace mode only).',
					},
					new_text: {
						type: 'string',
						description: 'The replacement text (for find_replace mode only).',
					},
					replace_all: {
						type: 'boolean',
						description:
							'Whether to replace all occurrences or just the first one (for find_replace mode only). Default: false.',
						default: false,
					},
				},
				required: ['path', 'mode'],
			},
		},
	},
};

// Re-export types for convenience
export type {
	EditMode,
	EditArgs,
	EditResult,
	LineChange,
	ValidationResult,
} from '../types/index.js';
export {validateEditArgs, validateLineNumbers} from './edit-file/validation.js';
export {
	generatePostEditContext,
	calculateActualEditRange,
} from './edit-file/context.js';
export {
	executeEdit,
	handleFindReplace,
	handleLineBasedEdit,
} from './edit-file/handlers.js';
export {formatEditPreview} from './edit-file/formatter.js';
