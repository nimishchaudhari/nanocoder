import { spawn } from "node:child_process";
import { highlight } from 'cli-highlight';
import type { ToolHandler, ToolDefinition } from "../../types/index.js";
import { toolColor, secondaryColor, primaryColor } from "../../ui/colors.js";

const handler: ToolHandler = async (args: {
  command: string;
}): Promise<string> => {
  try {
    return new Promise((resolve, reject) => {
      const proc = spawn("sh", ["-c", args.command]);
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", () => {
        if (stderr) {
          resolve(`STDERR:\n${stderr}\nSTDOUT:\n${stdout}`);
        } else {
          resolve(stdout);
        }
      });

      proc.on("error", (error) => {
        reject(`Error executing command: ${error.message}`);
      });
    });
  } catch (error) {
    return `Error executing command: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
};

const formatter = (args: any): string => {
  const command = args.command || 'unknown';
  let result = `${toolColor('⚒ execute_bash')}\n`;
  result += `${secondaryColor('Command:')} `;
  
  try {
    const highlighted = highlight(command, { language: 'bash', theme: 'default' });
    result += highlighted;
  } catch {
    result += `${primaryColor(command)}`;
  }
  
  return result;
};

export const executeBashTool: ToolDefinition = {
  handler,
  formatter,
  config: {
    type: "function",
    function: {
      name: "execute_bash",
      description: "Execute a bash command and return its output",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute.",
          },
        },
        required: ["command"],
      },
    },
  },
};

