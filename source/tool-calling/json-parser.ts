import type {ToolCall} from '@/types/index';
import {logError} from '@/utils/message-queue';
import {XMLToolCallParser} from '@/tool-calling/xml-parser';

// XML validation functions removed - XMLToolCallParser handles XML parsing

export function parseToolCallsFromContent(content: string): ToolCall[] {
	const extractedCalls: ToolCall[] = [];
	let trimmedContent = content.trim();

	// First, try the new XML parser for cleaner XML tool call parsing
	if (XMLToolCallParser.hasToolCalls(content)) {
		const parsedCalls = XMLToolCallParser.parseToolCalls(content);
		const convertedCalls = XMLToolCallParser.convertToToolCalls(parsedCalls);
		extractedCalls.push(...convertedCalls);

		// If XML parser found tool calls, return them (don't continue with legacy parsers)
		if (convertedCalls.length > 0) {
			const uniqueCalls = deduplicateToolCalls(extractedCalls);
			return uniqueCalls;
		}
	}

	// Handle markdown code blocks
	const codeBlockMatch = trimmedContent.match(
		/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/,
	);
	if (codeBlockMatch && codeBlockMatch[1]) {
		trimmedContent = codeBlockMatch[1].trim();
	}

	// Try to parse entire content as single JSON tool call
	if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
		// Skip empty or nearly empty JSON objects
		if (trimmedContent === '{}' || trimmedContent.replace(/\s/g, '') === '{}') {
			return extractedCalls;
		}

		try {
			const parsed = JSON.parse(trimmedContent);

			if (parsed.name && parsed.arguments !== undefined) {
				const toolCall = {
					id: `call_${Date.now()}`,
					function: {
						name: parsed.name || '',
						arguments: parsed.arguments || {},
					},
				};
				extractedCalls.push(toolCall);
				return extractedCalls;
			}
		} catch (e) {
			logError('Tool call failed to parse from JSON code block.');
		}
	}

	// Look for standalone JSON blocks in the content (multiline without code blocks)
	const jsonBlockRegex =
		/\{\s*\n\s*"name":\s*"([^"]+)",\s*\n\s*"arguments":\s*\{[\s\S]*?\}\s*\n\s*\}/g;
	let jsonMatch;
	while ((jsonMatch = jsonBlockRegex.exec(content)) !== null) {
		try {
			const parsed = JSON.parse(jsonMatch[0]);
			if (parsed.name && parsed.arguments !== undefined) {
				const toolCall = {
					id: `call_${Date.now()}_${extractedCalls.length}`,
					function: {
						name: parsed.name || '',
						arguments: parsed.arguments || {},
					},
				};
				extractedCalls.push(toolCall);
			}
		} catch (e) {
			logError('Tool call failed to parse from JSON block.');
		}
	}

	// XML parsing is now handled by XMLToolCallParser

	// All XML parsing is now handled by XMLToolCallParser

	// Look for embedded tool calls using regex patterns
	const toolCallPatterns = [
		/\{"name":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]*\})\}/g,
		/\{"name":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]+\})\}/g,
		/\{"name":\s*"([^"]+)",\s*"arguments":\s*"([^"]+)"\}/g,
	];

	for (const pattern of toolCallPatterns) {
		let match;
		while ((match = pattern.exec(content)) !== null) {
			const [, name, argsStr] = match;
			try {
				let args;
				if (argsStr && argsStr.startsWith('{')) {
					args = JSON.parse(argsStr || '{}');
				} else {
					args = argsStr || '';
				}
				extractedCalls.push({
					id: `call_${Date.now()}_${extractedCalls.length}`,
					function: {
						name: name || '',
						arguments: args as {[key: string]: any},
					},
				});
			} catch (e) {
				logError('Tool call failed to parse from content.');
			}
		}
	}

	// Deduplicate identical tool calls
	const uniqueCalls = deduplicateToolCalls(extractedCalls);

	return uniqueCalls;
}

function deduplicateToolCalls(toolCalls: ToolCall[]): ToolCall[] {
	const seen = new Set<string>();
	const unique: ToolCall[] = [];

	for (const call of toolCalls) {
		// Create a hash of the function name and arguments for comparison
		const hash = `${call.function.name}:${JSON.stringify(
			call.function.arguments,
		)}`;

		if (!seen.has(hash)) {
			seen.add(hash);
			unique.push(call);
		} else {
		}
	}

	return unique;
}

/**
 * Cleans content by removing tool call JSON blocks
 */
export function cleanContentFromToolCalls(
	content: string,
	toolCalls: ToolCall[],
): string {
	if (toolCalls.length === 0) return content;

	let cleanedContent = content;

	// Use the new XML parser to clean XML tool calls
	if (XMLToolCallParser.hasToolCalls(cleanedContent)) {
		cleanedContent =
			XMLToolCallParser.removeToolCallsFromContent(cleanedContent);
	}

	// XML cleaning is handled by XMLToolCallParser.removeToolCallsFromContent above

	// Handle markdown code blocks that contain only tool calls
	const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
	cleanedContent = cleanedContent.replace(
		codeBlockRegex,
		(match, blockContent) => {
			const trimmedBlock = blockContent.trim();

			// Check if this block contains a tool call that we parsed
			try {
				const parsed = JSON.parse(trimmedBlock);
				if (parsed.name && parsed.arguments !== undefined) {
					// This code block contains only a tool call, remove the entire block
					return '';
				}
			} catch (e) {
				// Not valid JSON, keep the code block
			}

			// Keep the code block as-is if it doesn't contain a tool call
			return match;
		},
	);

	// XML tool call cleaning is handled by XMLToolCallParser above

	// Remove JSON blocks that were parsed as tool calls (for non-code-block cases)
	const toolCallPatterns = [
		/\{\s*\n\s*"name":\s*"([^"]+)",\s*\n\s*"arguments":\s*\{[\s\S]*?\}\s*\n\s*\}/g, // Multiline JSON blocks
		/\{"name":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]*\})\}/g,
		/\{"name":\s*"([^"]+)",\s*"arguments":\s*(\{[^}]+\})\}/g,
		/\{"name":\s*"([^"]+)",\s*"arguments":\s*"([^"]+)"\}/g,
	];

	for (const pattern of toolCallPatterns) {
		cleanedContent = cleanedContent.replace(pattern, '').trim();
	}

	// Clean up extra whitespace and newlines
	cleanedContent = cleanedContent
		.replace(/\n\s*\n\s*\n/g, '\n\n') // Reduce multiple newlines to double
		.replace(/^\s*\n+|\n+\s*$/g, '') // Remove leading/trailing newlines
		.trim();

	return cleanedContent;
}
