import {readFileSync, existsSync} from 'fs';
import {join} from 'path';
import {promptPath} from '../config/index.js';
import type {Tool} from '../types/index.js';

/**
 * Process the main prompt template by injecting dynamic tool documentation
 */
export function processPromptTemplate(tools: Tool[]): string {
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
			'No additional tools are currently available.',
		);
	}

	// Generate tool documentation
	const toolDocs = generateToolDocumentation(tools);

	// Replace the dynamic section
	return prompt.replace(
		/<!-- DYNAMIC_TOOLS_SECTION_START -->[\s\S]*?<!-- DYNAMIC_TOOLS_SECTION_END -->/,
		toolDocs,
	);
}

/**
 * Generate formatted documentation for all available tools
 */
function generateToolDocumentation(tools: Tool[]): string {
	const sections = ['Available Tools\n'];

	// Group tools by category (built-in vs MCP)
	const builtInTools = tools.filter(tool => !tool.function.name.includes('__'));
	const mcpTools = tools.filter(tool => tool.function.name.includes('__'));

	if (builtInTools.length > 0) {
		sections.push('Built-in Tools:\n');
		builtInTools.forEach(tool => {
			sections.push(formatToolDocumentation(tool));
		});
	}

	if (mcpTools.length > 0) {
		sections.push('\nMCP Tools:\n');
		mcpTools.forEach(tool => {
			sections.push(formatToolDocumentation(tool));
		});
	}

	// Add XML format examples for all models
	if (tools.length > 0) {
		sections.push('\nXML Format Examples:\n');

		// Show tool examples in XML format
		tools.forEach(tool => {
			const params = tool.function.parameters?.properties || {};
			const paramNames = Object.keys(params).slice(0, 2); // Show max 2 params per example

			sections.push(`${tool.function.name}:`);
			sections.push('```xml');
			sections.push(`<${tool.function.name}>`);
			paramNames.forEach(paramName => {
				sections.push(`<${paramName}>value</${paramName}>`);
			});
			sections.push(`</${tool.function.name}>`);
			sections.push('```\n');
		});
	}

	return sections.join('\n');
}

/**
 * Format documentation for a single tool
 */
function formatToolDocumentation(tool: Tool): string {
	const {name, description, parameters} = tool.function;

	let doc = `${name}: ${description}\n`;

	if (parameters.properties && Object.keys(parameters.properties).length > 0) {
		doc += 'Parameters:\n';
		Object.entries(parameters.properties).forEach(
			([paramName, schema]: [string, any]) => {
				const required = parameters.required?.includes(paramName)
					? ' (required)'
					: ' (optional)';
				const description =
					schema.description || schema.type || 'No description';
				doc += `- ${paramName}${required}: ${description}\n`;
			},
		);
		doc += '\n';
	}

	return doc;
}
