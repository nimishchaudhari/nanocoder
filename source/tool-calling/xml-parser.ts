import type {ToolCall} from '@/types/index';

interface ParsedToolCall {
	toolName: string;
	parameters: Record<string, unknown>;
}

/**
 * Parses XML-formatted tool calls from non-function-calling models
 * Expected format: <tool_name><param1>value1</param1><param2>value2</param2></tool_name>
 */
export class XMLToolCallParser {
	private static readonly TOOL_CALL_REGEX = /<(\w+)>(.*?)<\/\1>/gs;
	private static readonly PARAMETER_REGEX = /<(\w+)>(.*?)<\/\1>/g;

	/**
	 * Extracts tool calls from text content containing XML-formatted tool calls
	 */
	static parseToolCalls(content: string): ParsedToolCall[] {
		const toolCalls: ParsedToolCall[] = [];
		let match;

		// Handle content that might be wrapped in markdown code blocks
		let processedContent = content;
		const codeBlockMatch = content.match(/```(?:\w+)?\s*\n?([\s\S]*?)\n?```/);
		if (codeBlockMatch && codeBlockMatch[1]) {
			processedContent = codeBlockMatch[1].trim();
		}

		// Remove <tool_call> wrapper tags if present
		processedContent = processedContent.replace(/<\/?tool_call>/g, '').trim();

		// Find all tool call blocks
		this.TOOL_CALL_REGEX.lastIndex = 0; // Reset regex state
		while ((match = this.TOOL_CALL_REGEX.exec(processedContent)) !== null) {
			const [, toolName, innerXml] = match;

			// Skip if this is a generic "tool_call" tag that slipped through
			if (toolName === 'tool_call') {
				continue;
			}

			const parameters = this.parseParameters(innerXml);

			toolCalls.push({
				toolName,
				parameters,
			});
		}

		return toolCalls;
	}

	/**
	 * Parses parameters from inner XML content
	 */
	private static parseParameters(innerXml: string): Record<string, unknown> {
		const parameters: Record<string, unknown> = {};
		let match;

		// Reset regex state
		this.PARAMETER_REGEX.lastIndex = 0;

		while ((match = this.PARAMETER_REGEX.exec(innerXml)) !== null) {
			const [, paramName, paramValue] = match;

			// Try to parse as JSON for complex objects/arrays
			try {
				parameters[paramName] = JSON.parse(paramValue) as unknown;
			} catch {
				// If not valid JSON, use as string
				parameters[paramName] = paramValue;
			}
		}

		return parameters;
	}

	/**
	 * Converts parsed tool calls to the standard ToolCall format
	 */
	static convertToToolCalls(parsedCalls: ParsedToolCall[]): ToolCall[] {
		return parsedCalls.map((call, index) => ({
			id: `xml_call_${index}`,
			function: {
				name: call.toolName,
				arguments: call.parameters,
			},
		}));
	}

	/**
	 * Removes XML tool call blocks from content, leaving only the text
	 */
	static removeToolCallsFromContent(content: string): string {
		let cleanedContent = content;

		// Remove all markdown code blocks that contain XML tool calls (using global flag)
		cleanedContent = cleanedContent.replace(
			/```(?:\w+)?\s*\n?([\s\S]*?)\n?```/g,
			(match, blockContent: string) => {
				if (blockContent) {
					// Reset regex and check if this block contains XML tool calls
					this.TOOL_CALL_REGEX.lastIndex = 0;
					if (this.TOOL_CALL_REGEX.test(blockContent)) {
						// This code block contains XML tool calls, remove it entirely
						return '';
					}
				}
				// Keep blocks that don't contain XML tool calls
				return match;
			},
		);

		// Remove XML tool calls that aren't in code blocks
		this.TOOL_CALL_REGEX.lastIndex = 0;
		cleanedContent = cleanedContent.replace(this.TOOL_CALL_REGEX, '').trim();

		// Remove any <tool_call> wrapper tags that may be left behind
		cleanedContent = cleanedContent.replace(/<\/?tool_call>/g, '').trim();

		// Clean up extra whitespace and empty lines
		cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

		return cleanedContent;
	}

	/**
	 * Checks if content contains XML-formatted tool calls
	 */
	static hasToolCalls(content: string): boolean {
		// Handle content that might be wrapped in markdown code blocks
		let processedContent = content;
		const codeBlockMatch = content.match(/```(?:\w+)?\s*\n?([\s\S]*?)\n?```/);
		if (codeBlockMatch && codeBlockMatch[1]) {
			processedContent = codeBlockMatch[1].trim();
		}

		this.TOOL_CALL_REGEX.lastIndex = 0;
		const result = this.TOOL_CALL_REGEX.test(processedContent);

		return result;
	}

	/**
	 * Detects malformed XML tool call attempts and returns error details
	 * Returns null if no malformed tool calls detected
	 */
	static detectMalformedToolCall(
		content: string,
	): {error: string; examples: string} | null {
		// Common malformed patterns
		const patterns = [
			{
				// <function=name> syntax
				regex: /<function=(\w+)>/,
				error: 'Invalid syntax: <function=name> is not supported',
				hint: (match: string) => {
					const toolName = match.match(/<function=(\w+)>/)?.[1];
					return `Use <${toolName}> instead of <function=${toolName}>`;
				},
			},
			{
				// <parameter=name> syntax
				regex: /<parameter=(\w+)>/,
				error: 'Invalid syntax: <parameter=name> is not supported',
				hint: (match: string) => {
					const paramName = match.match(/<parameter=(\w+)>/)?.[1];
					return `Use <${paramName}>value</${paramName}> instead of <parameter=${paramName}>value</parameter>`;
				},
			},
			{
				// Generic closing </parameter> without proper name
				regex: /<parameter=\w+>[\s\S]*?<\/parameter>/,
				error:
					'Invalid parameter syntax: parameters must use named tags, not generic <parameter> wrapper',
				hint: () => 'Use <param_name>value</param_name> format',
			},
			{
				// Generic closing </function> when <function=name> was used
				regex: /<function=\w+>[\s\S]*?<\/function>/,
				error:
					'Invalid function syntax: use simple named tags, not <function=name> wrapper',
				hint: () => 'Use <tool_name><param>value</param></tool_name> format',
			},
		];

		for (const pattern of patterns) {
			const match = content.match(pattern.regex);
			if (match) {
				const hint = pattern.hint(match[0]);
				return {
					error: pattern.error,
					examples: this.getCorrectFormatExamples(hint),
				};
			}
		}

		return null;
	}

	/**
	 * Generates correct format examples for error messages
	 */
	private static getCorrectFormatExamples(specificHint: string): string {
		return `${specificHint}

Correct format:
<tool_name>
  <param>value</param>
</tool_name>`;
	}
}
