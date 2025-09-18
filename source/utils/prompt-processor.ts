import {readFileSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {promptPath} from '../config/index.js';
import type {Tool} from '../types/index.js';
import {XMLToolCallParser} from '../tools/xml-parser.js';

/**
 * Process the main prompt template by injecting dynamic tool documentation
 */
export function processPromptTemplate(
	tools: Tool[],
	isNonToolCallingModel = false,
): string {
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
	systemPrompt = injectToolDocumentation(
		systemPrompt,
		tools,
		isNonToolCallingModel,
	);

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
function injectToolDocumentation(
	prompt: string,
	tools: Tool[],
	isNonToolCallingModel = false,
): string {
	if (tools.length === 0) {
		return prompt.replace(
			/<!-- DYNAMIC_TOOLS_SECTION_START -->[\s\S]*?<!-- DYNAMIC_TOOLS_SECTION_END -->/,
			'<!-- DYNAMIC_TOOLS_SECTION_START -->\nNo additional tools are currently available.\n<!-- DYNAMIC_TOOLS_SECTION_END -->',
		);
	}

	// Generate tool documentation
	const toolDocs = generateToolDocumentation(tools, isNonToolCallingModel);

	// Replace the dynamic section
	return prompt.replace(
		/<!-- DYNAMIC_TOOLS_SECTION_START -->[\s\S]*?<!-- DYNAMIC_TOOLS_SECTION_END -->/,
		`<!-- DYNAMIC_TOOLS_SECTION_START -->\n${toolDocs}\n<!-- DYNAMIC_TOOLS_SECTION_END -->`,
	);
}

/**
 * Generate formatted documentation for all available tools
 */
function generateToolDocumentation(
	tools: Tool[],
	isNonToolCallingModel = false,
): string {
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

	// Add concise XML format examples for non-tool-calling models
	if (isNonToolCallingModel && tools.length > 0) {
		sections.push('\n### XML Format Examples\n');
		
		// Show a few key tool examples in XML format
		const exampleTools = tools.slice(0, 3); // Just show first 3 tools as examples
		exampleTools.forEach(tool => {
			const params = tool.function.parameters?.properties || {};
			const paramNames = Object.keys(params).slice(0, 2); // Show max 2 params per example
			
			sections.push(`**${tool.function.name}**:`);
			sections.push('```xml');
			sections.push(`<${tool.function.name}>`);
			paramNames.forEach(paramName => {
				sections.push(`<${paramName}>value</${paramName}>`);
			});
			sections.push(`</${tool.function.name}>`);
			sections.push('```\n');
		});
	}

	// Usage guidelines are handled by the enhancement file

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
	const enhancementsPath = join(
		dirname(promptPath),
		'app',
		'prompts',
		'non-tool-calling-enhancement.md',
	);

	if (existsSync(enhancementsPath)) {
		try {
			const enhancements = readFileSync(enhancementsPath, 'utf-8');
			return systemPrompt + '\n\n' + enhancements;
		} catch (error) {
			console.warn(`Failed to load non-tool-calling enhancements: ${error}`);
		}
	}

	// Simple fallback if file doesn't exist
	return (
		systemPrompt +
		'\n\n**Note**: This model requires XML format for tool calls.'
	);
}
