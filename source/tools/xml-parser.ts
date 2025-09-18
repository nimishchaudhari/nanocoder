import type { ToolCall } from '../types/index.js';

export interface ParsedToolCall {
	toolName: string;
	parameters: Record<string, any>;
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

		// Find all tool call blocks
		while ((match = this.TOOL_CALL_REGEX.exec(content)) !== null) {
			const [, toolName, innerXml] = match;
			const parameters = this.parseParameters(innerXml);
			
			toolCalls.push({
				toolName,
				parameters
			});
		}

		return toolCalls;
	}

	/**
	 * Parses parameters from inner XML content
	 */
	private static parseParameters(innerXml: string): Record<string, any> {
		const parameters: Record<string, any> = {};
		let match;

		// Reset regex state
		this.PARAMETER_REGEX.lastIndex = 0;

		while ((match = this.PARAMETER_REGEX.exec(innerXml)) !== null) {
			const [, paramName, paramValue] = match;
			
			// Try to parse as JSON for complex objects/arrays
			try {
				parameters[paramName] = JSON.parse(paramValue);
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
				arguments: call.parameters
			}
		}));
	}

	/**
	 * Removes XML tool call blocks from content, leaving only the text
	 */
	static removeToolCallsFromContent(content: string): string {
		return content.replace(this.TOOL_CALL_REGEX, '').trim();
	}

	/**
	 * Checks if content contains XML-formatted tool calls
	 */
	static hasToolCalls(content: string): boolean {
		this.TOOL_CALL_REGEX.lastIndex = 0;
		return this.TOOL_CALL_REGEX.test(content);
	}

	/**
	 * Generates XML format instructions for tool calls
	 */
	static generateToolCallInstructions(availableTools: Array<{name: string; description: string; parameters: any}>): string {
		const toolDescriptions = availableTools.map(tool => {
			const params = tool.parameters?.properties || {};
			const required = tool.parameters?.required || [];
			
			const paramDescriptions = Object.entries(params).map(([name, schema]: [string, any]) => {
				const isRequired = required.includes(name);
				const type = schema.type || 'string';
				const description = schema.description || '';
				return `  <${name}>${isRequired ? '[REQUIRED]' : '[OPTIONAL]'} ${type} - ${description}</${name}>`;
			}).join('\n');

			return `<${tool.name}>\n${paramDescriptions}\n</${tool.name}>`;
		}).join('\n\n');

		return `When you need to use tools, format your tool calls using XML tags like this:

Available tools:
${toolDescriptions}

Example usage:
<read_file>
<file_path>/path/to/file.txt</file_path>
</read_file>

<bash_execute>
<command>ls -la</command>
</bash_execute>

Important:
- Use only one tool at a time per message
- Wait for the tool result before proceeding
- Parameter values should be plain text (not JSON unless specifically required)
- Close all XML tags properly
- Tool names and parameter names are case-sensitive`;
	}
}