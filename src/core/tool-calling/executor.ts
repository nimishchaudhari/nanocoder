import inquirer from "inquirer";
import { processToolUse } from "../message-handler.js";
import { displayToolCall } from "../../ui/output.js";
import type { ToolCall, ToolResult } from "../../types/index.js";
import { errorColor, successColor } from "../../ui/colors.js";

export interface ToolExecutionResult {
  executed: boolean;
  results: ToolResult[];
}

export async function promptToolApproval(toolCall: ToolCall): Promise<boolean> {
  const { action } = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: `⚒ ${toolCall.function.name}(${JSON.stringify(
        toolCall.function.arguments,
        null
      )})`,
      choices: [
        { name: `${successColor("✓ Yes, execute")}`, value: "execute" },
        {
          name: `${errorColor("⨯ No, tell agent what to do differently")}`,
          value: "cancel",
        },
      ],
      default: "execute",
    },
  ]);

  return action === "execute";
}

export async function executeToolCall(
  toolCall: ToolCall
): Promise<ToolResult | null> {
  const shouldExecute = await promptToolApproval(toolCall);

  if (shouldExecute) {
    const toolResult = await processToolUse(toolCall);
    displayToolCall(toolCall, toolResult);
    return toolResult;
  } else {
    console.log(
      errorColor("Tool execution cancelled. Returning to user input...")
    );
    console.log();
    return null;
  }
}

export async function executeToolCalls(
  toolCalls: ToolCall[]
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
