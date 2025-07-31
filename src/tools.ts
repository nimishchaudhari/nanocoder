import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

export async function read_file(args: { path: string }): Promise<string> {
  try {
    const content = await readFile(resolve(args.path), 'utf-8');
    return content;
  } catch (error) {
    return `Error reading file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

export async function write_file(args: {
  path: string;
  content: string;
}): Promise<string> {
  try {
    const absPath = resolve(args.path);
    await writeFile(absPath, args.content, 'utf-8');
    return "File written successfully";
  } catch (error) {
    return `Error writing file: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

export async function execute_bash(args: { command: string }): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      const proc = spawn('sh', ['-c', args.command]);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (stderr) {
          resolve(`STDERR:\n${stderr}\nSTDOUT:\n${stdout}`);
        } else {
          resolve(stdout);
        }
      });

      proc.on('error', (error) => {
        reject(`Error executing command: ${error.message}`);
      });
    });
  } catch (error) {
    return `Error executing command: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

type ToolHandler = (input: any) => Promise<string>;

export const toolRegistry: Record<string, ToolHandler> = {
  read_file,
  write_file,
  execute_bash,
};

export const tools: any[] = [
  {
    name: "read_file",
    description: "Read the contents of a file",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path to the file to read." },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write content to a file (overwrites existing content)",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "The path to the file to write." },
        content: {
          type: "string",
          description: "The content to write to the file.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "execute_bash",
    description: "Execute a bash command and return its output",
    input_schema: {
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
];
