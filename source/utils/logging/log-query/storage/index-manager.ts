/**
 * Index manager for efficient log entry lookups
 */

import type {LogEntry} from '../types';

/**
 * Manages indexes for log entries
 */
export class IndexManager {
	private indexes: Map<string, Set<string>> = new Map();

	/**
	 * Update indexes when entry is added or removed
	 */
	updateIndexes(entry: LogEntry, add: boolean): void {
		// Update correlation ID index
		if (entry.correlationId) {
			if (!this.indexes.has('correlationId')) {
				this.indexes.set('correlationId', new Set());
			}
			// biome-ignore lint/style/noNonNullAssertion: Index exists after set above
			const index = this.indexes.get('correlationId')!;
			if (add) {
				index.add(entry.correlationId);
			} else {
				index.delete(entry.correlationId);
			}
		}

		// Update source index
		if (entry.source) {
			if (!this.indexes.has('source')) {
				this.indexes.set('source', new Set());
			}
			// biome-ignore lint/style/noNonNullAssertion: Index exists after set above
			const index = this.indexes.get('source')!;
			if (add) {
				index.add(entry.source);
			} else {
				index.delete(entry.source);
			}
		}

		// Update level index
		if (!this.indexes.has('level')) {
			this.indexes.set('level', new Set());
		}
		// biome-ignore lint/style/noNonNullAssertion: Index exists after set above
		const levelIndex = this.indexes.get('level')!;
		if (add) {
			levelIndex.add(entry.level);
		} else {
			levelIndex.delete(entry.level);
		}
	}

	/**
	 * Clear all indexes
	 */
	clear(): void {
		this.indexes.clear();
	}

	/**
	 * Get all values for a specific index
	 */
	getIndexValues(indexName: string): Set<string> | undefined {
		return this.indexes.get(indexName);
	}
}
