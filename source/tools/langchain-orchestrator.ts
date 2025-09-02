import type {ToolManager} from './tool-manager.js';
import {PromptTemplate} from '@langchain/core/prompts';
import {RunnableSequence} from '@langchain/core/runnables';
import {BaseChatModel} from '@langchain/core/language_models/chat_models';

export interface WorkflowStep {
	tool: string;
	args: Record<string, any>;
	reasoning?: string;
}

export interface WorkflowPlan {
	steps: WorkflowStep[];
	goal: string;
}

export interface WorkflowResult {
	plan: WorkflowPlan;
	results: Array<{
		step: WorkflowStep;
		result: any;
		formatted?: string | React.ReactElement;
		error?: string;
		approved?: boolean;
		skipped?: boolean;
	}>;
	success: boolean;
}

export interface ApprovalCallback {
	(step: WorkflowStep, stepIndex: number, totalSteps: number): Promise<
		'approve' | 'decline' | 'skip'
	>;
}

/**
 * LangChain-powered tool orchestration layer that works with existing ToolManager
 * Provides intelligent tool sequencing, workflow planning, and multi-step automation
 */
export class LangChainToolOrchestrator {
	private toolManager: ToolManager;
	private chatModel: BaseChatModel | null = null;

	constructor(toolManager: ToolManager) {
		this.toolManager = toolManager;
	}

	/**
	 * Set the chat model for AI-powered planning
	 */
	setChatModel(chatModel: BaseChatModel): void {
		this.chatModel = chatModel;
	}

	/**
	 * Plan a workflow for a complex task
	 */
	async planWorkflow(task: string, context?: string[]): Promise<WorkflowPlan> {
		if (!this.chatModel) {
			// Fallback to simple single-step planning without AI
			return this.createSimplePlan(task);
		}

		const availableTools = this.toolManager.getAllTools();
		const toolDescriptions = availableTools
			.map(tool => `${tool.function.name}: ${tool.function.description}`)
			.join('\n');

		const planningPrompt = PromptTemplate.fromTemplate(`
You are a coding workflow planner. Break down the following task into a sequence of tool calls.

Available tools:
{tools}

Task: {task}
Context: {context}

Create a step-by-step plan using the available tools. Respond with a JSON object:
{{
  "goal": "description of the overall goal",
  "steps": [
    {{
      "tool": "tool_name",
      "args": {{"arg1": "value1"}},
      "reasoning": "why this step is needed"
    }}
  ]
}}

Keep the plan focused and practical. Only use tools that exist in the list above.
`);

		const chain = RunnableSequence.from([planningPrompt, this.chatModel]);

		try {
			const result = await chain.invoke({
				tools: toolDescriptions,
				task: task,
				context: context?.join('\n') || 'No additional context',
			});

			const response = typeof result.content === 'string' ? result.content : '';
			return this.parsePlanFromResponse(response, task);
		} catch (error) {
			console.warn(
				'AI planning failed, falling back to simple planning:',
				error,
			);
			return this.createSimplePlan(task);
		}
	}

	/**
	 * Execute a planned workflow with optional approval callback
	 */
	async executeWorkflow(
		plan: WorkflowPlan,
		onProgress?: (step: number, total: number, result: any) => void,
		onApproval?: ApprovalCallback,
	): Promise<WorkflowResult> {
		const results: WorkflowResult['results'] = [];
		let success = true;

		for (let i = 0; i < plan.steps.length; i++) {
			const step = plan.steps[i];

			try {
				// Request approval if callback provided
				let approved = true;
				let skipped = false;

				if (onApproval) {
					const decision = await onApproval(step, i, plan.steps.length);
					approved = decision === 'approve';
					skipped = decision === 'skip';

					if (decision === 'decline') {
						success = false;
						results.push({
							step,
							result: null,
							approved: false,
							error: 'User declined execution',
						});
						break; // Stop workflow on decline
					}

					if (skipped) {
						results.push({
							step,
							result: null,
							approved: true,
							skipped: true,
						});
						continue; // Skip this step but continue workflow
					}
				}

				// Get the tool handler from existing ToolManager
				const handler = this.toolManager.getToolHandler(step.tool);
				if (!handler) {
					throw new Error(`Tool ${step.tool} not found`);
				}

				// Execute the tool (using YOUR existing handlers)
				const result = await handler(step.args);

				// Format the result using existing formatters
				const formatter = this.toolManager.getToolFormatter(step.tool);
				const formatted = formatter
					? await formatter(step.args, result)
					: undefined;

				const stepResult = {
					step,
					result,
					formatted,
					approved,
				};

				results.push(stepResult);

				// Notify progress
				if (onProgress) {
					onProgress(i + 1, plan.steps.length, stepResult);
				}
			} catch (error: any) {
				success = false;
				results.push({
					step,
					result: null,
					error: error.message,
				});

				// Continue with remaining steps even if one fails
				console.error(`Step ${i + 1} failed:`, error);
			}
		}

		return {
			plan,
			results,
			success,
		};
	}

	/**
	 * Execute a complete task workflow from planning to execution
	 */
	async executeTask(
		task: string,
		context?: string[],
		onProgress?: (step: number, total: number, result: any) => void,
		onApproval?: ApprovalCallback,
	): Promise<WorkflowResult> {
		const plan = await this.planWorkflow(task, context);
		return this.executeWorkflow(plan, onProgress, onApproval);
	}

	/**
	 * Fallback planning without AI
	 */
	private createSimplePlan(task: string): WorkflowPlan {
		const taskLower = task.toLowerCase();

		// Simple heuristics for common tasks
		if (taskLower.includes('read') && taskLower.includes('file')) {
			const filePathMatch =
				task.match(/(['"`])(.*?)\1/) || task.match(/(\S+\.[\w]+)/);
			const filePath = filePathMatch
				? filePathMatch[filePathMatch.length - 1]
				: '';

			return {
				goal: `Read file: ${filePath}`,
				steps: [
					{
						tool: 'read_file',
						args: {file_path: filePath},
						reasoning: 'Read the requested file',
					},
				],
			};
		}

		// Default: single bash command
		return {
			goal: `Execute: ${task}`,
			steps: [
				{
					tool: 'execute_bash',
					args: {command: task},
					reasoning: 'Execute the requested command',
				},
			],
		};
	}

	/**
	 * Parse AI response into workflow plan
	 */
	private parsePlanFromResponse(
		response: string,
		fallbackTask: string,
	): WorkflowPlan {
		try {
			// Extract JSON from response
			const jsonMatch = response.match(/\{[\s\S]*\}/);
			if (!jsonMatch) {
				throw new Error('No JSON found in response');
			}

			const parsed = JSON.parse(jsonMatch[0]);

			// Validate structure
			if (!parsed.steps || !Array.isArray(parsed.steps)) {
				throw new Error('Invalid plan structure');
			}

			// Validate that all tools exist
			const availableToolNames = this.toolManager
				.getAllTools()
				.map(t => t.function.name);
			const invalidTools = parsed.steps.filter(
				(step: any) => !availableToolNames.includes(step.tool),
			);

			if (invalidTools.length > 0) {
				console.warn(
					'Plan contains invalid tools:',
					invalidTools.map((t: any) => t.tool),
				);
				// Filter out invalid tools
				parsed.steps = parsed.steps.filter((step: any) =>
					availableToolNames.includes(step.tool),
				);
			}

			return {
				goal: parsed.goal || fallbackTask,
				steps: parsed.steps,
			};
		} catch (error) {
			console.warn('Failed to parse AI plan response, using fallback:', error);
			return this.createSimplePlan(fallbackTask);
		}
	}
}
