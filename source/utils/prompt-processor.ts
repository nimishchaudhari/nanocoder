import {readFileSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {promptPath} from '../config/index.js';
import type {Tool} from '../types/index.js';

/**
 * Process the main prompt template by injecting dynamic tool documentation
 */
export function processPromptTemplate(tools: Tool[], isNonToolCallingModel = false): string {
	let systemPrompt = 'You are a helpful AI assistant.'; // fallback

	// Load base prompt
	if (existsSync(promptPath)) {
		try {
			systemPrompt = readFileSync(promptPath, 'utf-8');
		} catch (error) {
			console.warn(`Failed to load system prompt from ${promptPath}: ${error}`);
		}
	}

	// Inject dynamic tool documentation
	systemPrompt = injectToolDocumentation(systemPrompt, tools);

	// Add model-specific enhancements for non-tool-calling models
	if (isNonToolCallingModel) {
		systemPrompt = addNonToolCallingModelEnhancements(systemPrompt);
	}

	// Check for AGENTS.md in current working directory and append it
	const agentsPath = join(process.cwd(), 'AGENTS.md');
	if (existsSync(agentsPath)) {
		try {
			const agentsContent = readFileSync(agentsPath, 'utf-8');
			systemPrompt += `\n\nAdditional Context...\n\n${agentsContent}`;
		} catch (error) {
			console.warn(`Failed to load AGENTS.md from ${agentsPath}: ${error}`);
		}
	}

	return systemPrompt;
}

/**
 * Inject dynamic tool documentation into the prompt template
 */
function injectToolDocumentation(prompt: string, tools: Tool[]): string {
	if (tools.length === 0) {
		return prompt.replace(
			/<!-- DYNAMIC_TOOLS_SECTION_START -->[\s\S]*?<!-- DYNAMIC_TOOLS_SECTION_END -->/,
			'<!-- DYNAMIC_TOOLS_SECTION_START -->\nNo additional tools are currently available.\n<!-- DYNAMIC_TOOLS_SECTION_END -->',
		);
	}

	// Generate tool documentation
	const toolDocs = generateToolDocumentation(tools);

	// Replace the dynamic section
	return prompt.replace(
		/<!-- DYNAMIC_TOOLS_SECTION_START -->[\s\S]*?<!-- DYNAMIC_TOOLS_SECTION_END -->/,
		`<!-- DYNAMIC_TOOLS_SECTION_START -->\n${toolDocs}\n<!-- DYNAMIC_TOOLS_SECTION_END -->`,
	);
}

/**
 * Generate formatted documentation for all available tools
 */
function generateToolDocumentation(tools: Tool[]): string {
	const sections = ['## Available Tools\n'];

	// Group tools by category (built-in vs MCP)
	const builtInTools = tools.filter(tool => !tool.function.name.includes('__'));
	const mcpTools = tools.filter(tool => tool.function.name.includes('__'));

	if (builtInTools.length > 0) {
		sections.push('### Built-in Tools\n');
		builtInTools.forEach(tool => {
			sections.push(formatToolDocumentation(tool));
		});
	}

	if (mcpTools.length > 0) {
		sections.push('\n### MCP Tools\n');
		mcpTools.forEach(tool => {
			sections.push(formatToolDocumentation(tool));
		});
	}

	sections.push('\n### Tool Usage Guidelines\n');
	sections.push('- Use tools to gather information and perform actions');
	sections.push('- Always continue your task after tool execution');
	sections.push("- Don't repeat the same tool call unnecessarily");
	sections.push('- Use tool results to inform your next actions');

	return sections.join('\n');
}

/**
 * Format documentation for a single tool
 */
function formatToolDocumentation(tool: Tool): string {
	const {name, description, parameters} = tool.function;

	let doc = `#### ${name}\n`;
	doc += `${description}\n\n`;

	if (parameters.properties && Object.keys(parameters.properties).length > 0) {
		doc += '**Parameters:**\n';
		Object.entries(parameters.properties).forEach(
			([paramName, schema]: [string, any]) => {
				const required = parameters.required?.includes(paramName)
					? ' (required)'
					: ' (optional)';
				const description =
					schema.description || schema.type || 'No description';
				doc += `- \`${paramName}\`${required}: ${description}\n`;
			},
		);
		doc += '\n';
	}

	return doc;
}

/**
 * Add specialized instructions for non-tool-calling models
 */
function addNonToolCallingModelEnhancements(systemPrompt: string): string {
	const enhancementsPath = join(dirname(promptPath), 'app', 'prompts', 'non-tool-calling-enhancement.md');
	
	if (existsSync(enhancementsPath)) {
		try {
			const enhancements = readFileSync(enhancementsPath, 'utf-8');
			return systemPrompt + '\n\n' + enhancements;
		} catch (error) {
			console.warn(`Failed to load non-tool-calling enhancements: ${error}`);
		}
	}
	
	// Fallback inline enhancements if file doesn't exist
	return systemPrompt + `

## Enhanced Tool Usage Instructions

**CRITICAL**: After using any tool, you MUST continue working toward the original task. Tool execution is not a stopping point.

### Tool Call Format
Use exactly this JSON format:
\`\`\`json
{
  "name": "tool_name",
  "arguments": {
    "parameter": "value"
  }
}
\`\`\`

### Continuation Rules
- **Always explain** what you plan to do before using a tool
- **Use tool results** to inform your next action
- **Keep working** until the original task is complete
- **Try different approaches** if something isn't working
- **Don't repeat** the same tool call with identical parameters

### Progress Mindset
Remember the user's original request and work systematically toward completing it. Each tool execution should move you closer to the goal.`;
}
