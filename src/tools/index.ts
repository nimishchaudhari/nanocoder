import { read_file, write_file, read_many_files } from './file-tools.js';
import { execute_bash } from './bash-tools.js';
import type { ToolHandler, Tool } from '../types/index.js';

export const toolRegistry: Record<string, ToolHandler> = {
  read_file,
  read_many_files,
  write_file,
  execute_bash,
};

export const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The path to the file to read.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_many_files',
      description: 'Read the contents of multiple files. Returns a JSON array of { path, content } in the same order as provided.',
      parameters: {
        type: 'object',
        properties: {
          paths: { type: 'array', items: { type: 'string' }, description: 'Array of file paths to read, in order.' },
        },
        required: ['paths'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Write content to a file (overwrites existing content)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'The path to the file to write.' },
          content: {
            type: 'string',
            description: 'The content to write to the file.',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_bash',
      description: 'Execute a bash command and return its output',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The bash command to execute.',
          },
        },
        required: ['command'],
      },
    },
  },
];

export * from './file-tools.js';
export * from './bash-tools.js';