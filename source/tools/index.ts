import {readFileTool} from './read-file.js';
import {createFileTool} from './create-file.js';
// import { editFileTool } from "./edit-file.js";
// import { readManyFilesTool } from "./read-many-files.js";
import {executeBashTool} from './execute-bash.js';
import React from 'react';
import type {ToolHandler, Tool, ToolDefinition} from '../types/index.js';

export const toolDefinitions: ToolDefinition[] = [
	readFileTool,
	createFileTool,
	// editFileTool,
	// readManyFilesTool,
	executeBashTool,
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
