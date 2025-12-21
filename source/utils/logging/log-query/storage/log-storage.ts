/**
 * In-memory log storage for querying
 */

import {MAX_LOG_ENTRIES} from '@/constants';
import {aggregateLogEntries} from '../aggregation/aggregator';
import {executeQuery} from '../query/query-engine';
import type {
	AggregationOptions,
	AggregationResult,
	LogEntry,
	LogQuery,
	QueryResult,
} from '../types';
import {CircularBuffer} from './circular-buffer';
import {IndexManager} from './index-manager';

/**
 * In-memory log storage for querying (in production, this would connect to a log database)
 */
export class LogStorage {
	private buffer: CircularBuffer;
	private indexManager: IndexManager;

	constructor(maxEntries: number = MAX_LOG_ENTRIES) {
		this.buffer = new CircularBuffer(maxEntries);
		this.indexManager = new IndexManager();
	}

	/**
	 * Add a log entry - O(1) instead of O(n)
	 */
	addEntry(entry: LogEntry): void {
		// Add to circular buffer and get removed entry if any
		const removed = this.buffer.add(entry);

		// Update indexes
		if (removed) {
			this.indexManager.updateIndexes(removed, false);
		}
		this.indexManager.updateIndexes(entry, true);
	}

	/**
	 * Query log entries
	 */
	query(query: LogQuery): QueryResult {
		const entries = this.buffer.getAll();
		const totalCount = this.buffer.getCount();
		return executeQuery(entries, query, totalCount);
	}

	/**
	 * Aggregate log entries
	 */
	aggregate(options: AggregationOptions): AggregationResult {
		const entries = this.buffer.getAll();
		return aggregateLogEntries(entries, options);
	}

	/**
	 * Get entry count
	 */
	getEntryCount(): number {
		return this.buffer.getCount();
	}

	/**
	 * Clear all entries
	 */
	clear(): void {
		this.buffer.clear();
		this.indexManager.clear();
	}
}

/**
 * Global log storage instance
 */
export const globalLogStorage = new LogStorage();
