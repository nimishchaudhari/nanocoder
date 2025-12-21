/**
 * Sorting utilities for log entries
 */

import type {LogEntry, LogQuery} from '../types.js';

/**
 * Get numeric value for sorting a log entry
 */
// biome-ignore lint/suspicious/noExplicitAny: Dynamic sort value type
export function getSortValue(entry: LogEntry, sortBy: string): any {
	switch (sortBy) {
		case 'timestamp':
			return new Date(entry.timestamp).getTime();
		case 'level':
			return getLevelPriority(entry.level);
		case 'duration':
			return entry.performance?.duration || 0;
		case 'memory':
			return entry.performance?.memory?.heapUsed || 0;
		default:
			return 0;
	}
}

/**
 * Get numeric priority for log level (for sorting)
 */
export function getLevelPriority(level: string): number {
	const priorities: Record<string, number> = {
		fatal: 0,
		error: 1,
		warn: 2,
		info: 3,
		http: 4,
		debug: 5,
		trace: 6,
	};
	return priorities[level] ?? 6;
}

/**
 * Sort log entries based on query parameters
 */
export function sortLogEntries(
	entries: LogEntry[],
	query: LogQuery,
): LogEntry[] {
	if (!query.sortBy) {
		return entries;
	}

	return entries.sort((a, b) => {
		// biome-ignore lint/style/noNonNullAssertion: sortBy guaranteed to exist in this block
		const aValue = getSortValue(a, query.sortBy!);
		// biome-ignore lint/style/noNonNullAssertion: sortBy guaranteed to exist in this block
		const bValue = getSortValue(b, query.sortBy!);
		const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
		return query.sortOrder === 'desc' ? -comparison : comparison;
	});
}
