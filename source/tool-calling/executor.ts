import {processToolUse} from '../message-handler.js';
import {logInfo} from '../utils/message-queue.js';
import type {
	ToolCall,
	ToolResult,
	ToolExecutionResult,
} from '../types/index.js';

export async function executeToolCall(
	toolCall: ToolCall,
): Promise<ToolResult | null> {
	const shouldExecute = confirm('Execute this tool? ' + toolCall);

	if (shouldExecute) {
		const toolResult = await processToolUse(toolCall);
		return toolResult;
	} else {
		logInfo('Tool execution cancelled. Returning to user input...');
		return null;
	}
}

export async function executeToolCalls(
	toolCalls: ToolCall[],
): Promise<ToolExecutionResult> {
	const results: ToolResult[] = [];
	let allToolsExecuted = true;

	for (const toolCall of toolCalls) {
		const result = await executeToolCall(toolCall);

		if (result) {
			results.push(result);
		} else {
			allToolsExecuted = false;
			break;
		}
	}

	return {
		executed: allToolsExecuted,
		results,
	};
}
