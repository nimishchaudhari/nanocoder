import fs from 'fs/promises';
import {logError} from '@/utils/message-queue';
import {getClosestConfigFile} from '@/config/index';

const HISTORY_FILE = getClosestConfigFile('.nano-coder-history');
const MAX_HISTORY_SIZE = 100;
const ENTRY_SEPARATOR = '\n---ENTRY_SEPARATOR---\n';

class PromptHistory {
	private history: string[] = [];
	private currentIndex: number = -1;

	async loadHistory(): Promise<void> {
		try {
			const content = await fs.readFile(HISTORY_FILE, 'utf8');
			if (content.includes(ENTRY_SEPARATOR)) {
				// New format with separator
				this.history = content
					.split(ENTRY_SEPARATOR)
					.filter(entry => entry.trim() !== '');
			} else {
				// Legacy format - assume single lines only
				this.history = content.split('\n').filter(line => line.trim() !== '');
			}
			this.currentIndex = -1;
		} catch {
			// File doesn't exist yet, start with empty history
			this.history = [];
			this.currentIndex = -1;
		}
	}

	async saveHistory(): Promise<void> {
		try {
			await fs.writeFile(
				HISTORY_FILE,
				this.history.join(ENTRY_SEPARATOR),
				'utf8',
			);
		} catch (error) {
			// Silently fail to avoid disrupting the user experience
			logError(`Failed to save prompt history: ${error}`);
		}
	}

	addPrompt(prompt: string): void {
		const trimmed = prompt.trim();
		if (!trimmed) return;

		// Remove duplicate if it exists
		const existingIndex = this.history.indexOf(trimmed);
		if (existingIndex !== -1) {
			this.history.splice(existingIndex, 1);
		}

		// Add to the end
		this.history.push(trimmed);

		// Keep only the last MAX_HISTORY_SIZE entries
		if (this.history.length > MAX_HISTORY_SIZE) {
			this.history = this.history.slice(-MAX_HISTORY_SIZE);
		}

		this.currentIndex = -1;
		this.saveHistory(); // Fire and forget
	}

	getPrevious(): string | null {
		if (this.history.length === 0) return null;

		if (this.currentIndex === -1) {
			this.currentIndex = this.history.length - 1;
		} else if (this.currentIndex > 0) {
			this.currentIndex--;
		}

		return this.history[this.currentIndex] ?? null;
	}

	getNext(): string | null {
		if (this.history.length === 0 || this.currentIndex === -1) return null;

		if (this.currentIndex < this.history.length - 1) {
			this.currentIndex++;
			return this.history[this.currentIndex] ?? null;
		} else {
			this.currentIndex = -1;
			return '';
		}
	}

	resetIndex(): void {
		this.currentIndex = -1;
	}

	getHistory(): string[] {
		return [...this.history];
	}
}

export const promptHistory = new PromptHistory();
