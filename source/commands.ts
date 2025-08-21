import {Command} from './types/index.js';

export class CommandRegistry {
	private commands = new Map<string, Command>();

	register(command: Command | Command[]): void {
		if (Array.isArray(command)) {
			command.forEach(cmd => this.register(cmd));
			return;
		}
		this.commands.set(command.name, command);
	}

	get(name: string): Command | undefined {
		return this.commands.get(name);
	}

	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	getCompletions(prefix: string): string[] {
		return Array.from(this.commands.keys())
			.filter(name => name.startsWith(prefix))
			.sort();
	}

	async execute(input: string): Promise<void | string> {
		const parts = input.trim().split(/\s+/);
		const commandName = parts[0];
		if (!commandName) {
			return 'Invalid command. Type /help for available commands.';
		}

		const args = parts.slice(1);

		const command = this.get(commandName);
		if (!command) {
			console.error(
				`Unknown command: ${commandName}. Type /help for available commands.`,
			);
			return;
		}

		return await command.handler(args);
	}
}

export const commandRegistry = new CommandRegistry();
