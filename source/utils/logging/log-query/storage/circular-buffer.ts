/**
 * Circular buffer implementation for efficient log storage
 */

import type {LogEntry} from '../types';

/**
 * Circular buffer for storing log entries with O(1) add/remove
 */
export class CircularBuffer {
	private entries: (LogEntry | undefined)[];
	private head: number = 0; // Index of oldest entry
	private tail: number = 0; // Index where next entry goes
	private count: number = 0; // Current number of entries
	private maxEntries: number;

	constructor(maxEntries: number) {
		this.maxEntries = maxEntries;
		this.entries = new Array(maxEntries); // Pre-allocate array
	}

	/**
	 * Add entry to buffer - O(1) operation
	 * Returns the removed entry if buffer was full, undefined otherwise
	 */
	add(entry: LogEntry): LogEntry | undefined {
		let removed: LogEntry | undefined;

		// If buffer is full, remove oldest entry
		if (this.count === this.maxEntries) {
			removed = this.entries[this.head];
			// Advance head (oldest entry pointer)
			this.head = (this.head + 1) % this.maxEntries;
		} else {
			this.count++;
		}

		// Write new entry at tail position - O(1)
		this.entries[this.tail] = entry;
		this.tail = (this.tail + 1) % this.maxEntries;

		return removed;
	}

	/**
	 * Get all entries as array (oldest to newest)
	 */
	getAll(): LogEntry[] {
		const result: LogEntry[] = [];
		for (let i = 0; i < this.count; i++) {
			const entry = this.entries[(this.head + i) % this.maxEntries];
			if (entry) {
				result.push(entry);
			}
		}
		return result;
	}

	/**
	 * Get current count of entries
	 */
	getCount(): number {
		return this.count;
	}

	/**
	 * Clear all entries
	 */
	clear(): void {
		this.entries = new Array(this.maxEntries);
		this.head = 0;
		this.tail = 0;
		this.count = 0;
	}
}
