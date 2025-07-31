import { spawn } from 'node:child_process';
import type { ToolHandler } from '../types/index.js';

export const execute_bash: ToolHandler = async (args: { command: string }): Promise<string> => {
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
};