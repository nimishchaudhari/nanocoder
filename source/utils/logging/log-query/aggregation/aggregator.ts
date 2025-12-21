/**
 * Log entry aggregation engine
 */

import type {AggregationOptions, AggregationResult, LogEntry} from '../types';

/**
 * Get group key for an entry based on groupBy field
 */
export function getGroupKey(entry: LogEntry, groupBy: string): string {
	switch (groupBy) {
		case 'hour':
			return new Date(entry.timestamp).toISOString().substring(0, 13); // YYYY-MM-DDTHH
		case 'day':
			return new Date(entry.timestamp).toISOString().substring(0, 10); // YYYY-MM-DD
		case 'level':
			return entry.level;
		case 'source':
			return entry.source || 'unknown';
		case 'correlationId':
			return entry.correlationId || 'no-correlation';
		case 'errorType':
			return entry.error?.type || 'no-error';
		default:
			return 'unknown';
	}
}

/**
 * Aggregate log entries based on options
 */
export function aggregateLogEntries(
	entries: LogEntry[],
	options: AggregationOptions,
): AggregationResult {
	const startTime = performance.now();

	// Filter by time range if specified
	let filteredEntries = entries;
	if (options.timeRange?.startTime && options.timeRange?.endTime) {
		filteredEntries = entries.filter(entry => {
			const entryTime = new Date(entry.timestamp);
			return (
				// biome-ignore lint/style/noNonNullAssertion: timeRange existence checked in if condition above
				entryTime >= options.timeRange!.startTime &&
				// biome-ignore lint/style/noNonNullAssertion: timeRange existence checked in if condition above
				entryTime <= options.timeRange!.endTime
			);
		});
	}

	// biome-ignore lint/suspicious/noExplicitAny: Dynamic log bindings
	const groups: Record<string, any> = {};

	// Group entries
	for (const entry of filteredEntries) {
		const groupKey = getGroupKey(entry, options.groupBy);

		if (!groups[groupKey]) {
			groups[groupKey] = {
				count: 0,
				durations: [],
				memoryUsages: [],
				errorCount: 0,
				samples: [],
			};
		}

		const group = groups[groupKey];
		group.count++;

		if (entry.performance?.duration) {
			group.durations.push(entry.performance.duration);
		}

		if (entry.performance?.memory) {
			group.memoryUsages.push(entry.performance.memory.heapUsed || 0);
		}

		if (entry.error) {
			group.errorCount++;
		}

		// Keep sample entries for analysis
		if (group.samples.length < 10) {
			group.samples.push(entry);
		}
	}

	// Calculate aggregations
	// biome-ignore lint/suspicious/noExplicitAny: Dynamic log bindings
	const result: Record<string, any> = {};

	for (const [groupKey, group] of Object.entries(groups)) {
		// biome-ignore lint/suspicious/noExplicitAny: Dynamic value type
		const groupResult: any = {count: group.count};

		if (
			options.aggregations.includes('avgDuration') &&
			group.durations.length > 0
		) {
			groupResult.avgDuration =
				group.durations.reduce((sum: number, d: number) => sum + d, 0) /
				group.durations.length;
		}

		if (
			options.aggregations.includes('maxDuration') &&
			group.durations.length > 0
		) {
			groupResult.maxDuration = Math.max(...group.durations);
		}

		if (
			options.aggregations.includes('minDuration') &&
			group.durations.length > 0
		) {
			groupResult.minDuration = Math.min(...group.durations);
		}

		if (options.aggregations.includes('sumDuration')) {
			groupResult.sumDuration = group.durations.reduce(
				(sum: number, d: number) => sum + d,
				0,
			);
		}

		if (options.aggregations.includes('errorRate')) {
			groupResult.errorRate = group.errorCount / group.count;
		}

		if (
			options.aggregations.includes('memoryUsage') &&
			group.memoryUsages.length > 0
		) {
			groupResult.memoryUsage = {
				avgHeapUsed:
					group.memoryUsages.reduce((sum: number, m: number) => sum + m, 0) /
					group.memoryUsages.length,
				maxHeapUsed: Math.max(...group.memoryUsages),
				minHeapUsed: Math.min(...group.memoryUsages),
			};
		}

		if (options.aggregations.includes('count')) {
			groupResult.samples = group.samples;
		}

		result[groupKey] = groupResult;
	}

	const queryTime = performance.now() - startTime;

	return {
		groups: result,
		totalGroups: Object.keys(result).length,
		queryTime,
	};
}
