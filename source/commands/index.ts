
export * from '@/commands/exit';
export * from '@/commands/help';
export * from '@/commands/clear';
export * from '@/commands/model';
export * from '@/commands/provider';
export * from '@/commands/mcp';
export * from '@/commands/custom-commands';
export * from '@/commands/init';
export * from '@/commands/theme';
export * from '@/commands/export';
export * from '@/commands/update';
export * from '@/commands/recommendations';
export * from '@/commands/status';
export * from '@/commands/setup-config';
export * from '@/commands/resume';
export * from '@/commands/streaming';

import { Command } from 'commander';
import { resumeCommand } from '../session/resume-command';

export function registerCommands(program: Command): void {
  // Existing commands would be here
  program
    .command('resume')
    .description('Resume a previous session')
    .action(resumeCommand);
  // Other commands...
}

