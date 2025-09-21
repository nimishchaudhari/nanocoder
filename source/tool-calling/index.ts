/**
 * Tool calling utilities - main exports
 */

export {
	parseToolCallsFromContent,
	cleanContentFromToolCalls,
} from './json-parser.js';
export type {ToolExecutionResult} from '../types/index.js';