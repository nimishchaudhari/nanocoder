/**
 * Filter predicates for matching log entries against queries
 */

import type {LogEntry, LogQuery} from '../types';

/**
 * Check if a log entry matches the given query filters
 */
export function matchesQuery(entry: LogEntry, query: LogQuery): boolean {
	// Time range filtering
	if (query.startTime && new Date(entry.timestamp) < query.startTime)
		return false;
	if (query.endTime && new Date(entry.timestamp) > query.endTime) return false;

	// Level filtering
	if (query.levels && !query.levels.includes(entry.level)) return false;
	if (query.excludeLevels && query.excludeLevels.includes(entry.level))
		return false;

	// Message filtering
	if (query.messageContains && !entry.message.includes(query.messageContains))
		return false;
	if (query.messageRegex && !query.messageRegex.test(entry.message))
		return false;
	if (
		query.messageStartsWith &&
		!entry.message.startsWith(query.messageStartsWith)
	)
		return false;
	if (query.messageEndsWith && !entry.message.endsWith(query.messageEndsWith))
		return false;

	// Correlation and request filtering
	if (query.correlationIds) {
		if (!entry.correlationId) return false;
		if (!query.correlationIds.includes(entry.correlationId)) return false;
	}
	if (
		query.requestIds &&
		entry.requestId &&
		!query.requestIds.includes(entry.requestId)
	)
		return false;
	if (query.userIds && entry.userId && !query.userIds.includes(entry.userId))
		return false;
	if (
		query.sessionIds &&
		entry.sessionId &&
		!query.sessionIds.includes(entry.sessionId)
	)
		return false;

	// Source filtering
	if (query.sources) {
		if (!entry.source) return false;
		if (!query.sources.includes(entry.source)) return false;
	}
	if (
		query.excludeSources &&
		entry.source &&
		query.excludeSources.includes(entry.source)
	)
		return false;

	// Tag filtering
	if (query.hasTags && (!entry.tags || entry.tags.length === 0)) return false;
	if (query.tags && entry.tags) {
		const hasAnyTag = query.tags.some(tag => entry.tags?.includes(tag));
		if (!hasAnyTag) return false;
	}
	if (query.excludeTags && entry.tags) {
		const hasExcludedTag = query.excludeTags.some(tag =>
			entry.tags?.includes(tag),
		);
		if (hasExcludedTag) return false;
	}

	// Metadata filtering
	if (
		query.metadataKey &&
		(!entry.metadata || !(query.metadataKey in entry.metadata))
	)
		return false;
	if (query.metadataKey && query.metadataValue !== undefined) {
		if (entry.metadata?.[query.metadataKey] !== query.metadataValue)
			return false;
	}
	if (
		query.metadataExists &&
		(!entry.metadata || !(query.metadataExists in entry.metadata))
	)
		return false;

	// Performance filtering
	if (
		query.durationMin &&
		entry.performance?.duration &&
		entry.performance.duration < query.durationMin
	)
		return false;
	if (
		query.durationMax &&
		entry.performance?.duration &&
		entry.performance.duration > query.durationMax
	)
		return false;
	if (
		query.memoryThreshold &&
		entry.performance?.memory?.heapUsed &&
		entry.performance.memory.heapUsed < query.memoryThreshold
	)
		return false;

	// Error filtering
	if (query.hasErrors !== undefined) {
		const hasError = !!entry.error;
		if (hasError !== query.hasErrors) return false;
	}
	if (
		query.errorTypes &&
		entry.error &&
		!query.errorTypes.includes(entry.error.type || '')
	)
		return false;

	// Request filtering
	if (
		query.requestMethods &&
		entry.request?.method &&
		!query.requestMethods.includes(entry.request.method)
	)
		return false;
	if (
		query.requestStatusCodes &&
		entry.request?.statusCode &&
		!query.requestStatusCodes.includes(entry.request.statusCode)
	)
		return false;
	if (
		query.requestDurationMin &&
		entry.request?.duration &&
		entry.request.duration < query.requestDurationMin
	)
		return false;
	if (
		query.requestDurationMax &&
		entry.request?.duration &&
		entry.request.duration > query.requestDurationMax
	)
		return false;

	return true;
}
