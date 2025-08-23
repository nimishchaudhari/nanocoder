/**
 * Tool calling utilities - main exports
 */

export {
	parseToolCallsFromContent,
	cleanContentFromToolCalls,
} from './parser.js';
export {executeToolCalls, executeToolCall} from './executor.js';
export type {ToolExecutionResult} from '../types/index.js';
