import {readFileTool} from './read-file.js';
import {createFileTool} from './create-file.js';
import {insertLinesTool} from './insert-lines.js';
import {replaceLinesTool} from './replace-lines.js';
import {deleteLinesTool} from './delete-lines.js';
import {readManyFilesTool} from './read-many-files.js';
import {executeBashTool} from './execute-bash.js';
import {webSearchTool} from './web-search.js';
import {fetchUrlTool} from './fetch-url.js';
import {searchFilesTool} from './search-files.js';
import React from 'react';
import type {ToolHandler, Tool, ToolDefinition} from '../types/index.js';

export const toolDefinitions: ToolDefinition[] = [
	readFileTool,
	createFileTool,
	insertLinesTool,
	replaceLinesTool,
	deleteLinesTool,
	readManyFilesTool,
	executeBashTool,
	webSearchTool,
	fetchUrlTool,
	searchFilesTool,
];

export const toolRegistry: Record<string, ToolHandler> = Object.fromEntries(
	toolDefinitions.map(def => [def.config.function.name, def.handler]),
);

export const tools: Tool[] = toolDefinitions.map(def => def.config);

// Export formatter registry for the UI
export const toolFormatters: Record<
	string,
	(
		args: any,
	) =>
		| string
		| Promise<string>
		| React.ReactElement
		| Promise<React.ReactElement>
> = Object.fromEntries(
	toolDefinitions
		.filter(def => def.formatter)
		.map(def => [def.config.function.name, def.formatter!]),
);

// Export validator registry
export const toolValidators: Record<
	string,
	(args: any) => Promise<{valid: true} | {valid: false; error: string}>
> = Object.fromEntries(
	toolDefinitions
		.filter(def => def.validator)
		.map(def => [def.config.function.name, def.validator!]),
);
