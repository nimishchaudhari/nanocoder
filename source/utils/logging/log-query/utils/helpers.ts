/**
 * Helper functions for common log query operations
 */

import {createLogQuery} from '../query/query-builder.js';

/**
 * Quick query functions for common use cases
 */
export const logQueries = {
	/**
	 * Get all error logs
	 */
	errors: (limit?: number) =>
		createLogQuery()
			.levels('error', 'fatal')
			.sortBy('timestamp', 'desc')
			.limit(limit || 100)
			.execute(),

	/**
	 * Get logs by correlation ID
	 */
	byCorrelation: (correlationId: string, limit?: number) =>
		createLogQuery()
			.correlationIds(correlationId)
			.sortBy('timestamp', 'asc')
			.limit(limit || 100)
			.execute(),

	/**
	 * Get logs by source
	 */
	bySource: (source: string, limit?: number) =>
		createLogQuery()
			.sources(source)
			.sortBy('timestamp', 'desc')
			.limit(limit || 100)
			.execute(),

	/**
	 * Get logs with specific tag
	 */
	byTag: (tag: string, limit?: number) =>
		createLogQuery()
			.tags(tag)
			.hasTags()
			.sortBy('timestamp', 'desc')
			.limit(limit || 100)
			.execute(),

	/**
	 * Get slow requests
	 */
	slowRequests: (minDuration: number = 1000, limit?: number) =>
		createLogQuery()
			.messageContains('request')
			.durationMin(minDuration)
			.sortBy('duration', 'desc')
			.limit(limit || 50)
			.execute(),

	/**
	 * Get memory-intensive operations
	 */
	memoryIntensive: (minMemory: number = 50 * 1024 * 1024, limit?: number) =>
		createLogQuery()
			.memoryThreshold(minMemory)
			.sortBy('memory', 'desc')
			.limit(limit || 50)
			.execute(),
};
