import {readFileTool} from '@/tools/read-file';
import {createFileTool} from '@/tools/create-file';
import {insertLinesTool} from '@/tools/insert-lines';
import {replaceLinesTool} from '@/tools/replace-lines';
import {deleteLinesTool} from '@/tools/delete-lines';
import {readManyFilesTool} from '@/tools/read-many-files';
import {executeBashTool} from '@/tools/execute-bash';
import {webSearchTool} from '@/tools/web-search';
import {fetchUrlTool} from '@/tools/fetch-url';
import {searchFilesTool} from '@/tools/search-files';
import React from 'react';
import type {ToolHandler, Tool, ToolDefinition} from '@/types/index';

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
