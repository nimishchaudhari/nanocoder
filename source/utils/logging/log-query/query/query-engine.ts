/**
 * Query engine for executing log queries
 */

import {generateFacets} from '../aggregation/facet-generator';
import type {LogEntry, LogQuery, QueryResult} from '../types';
import {sortLogEntries} from '../utils/sorting';
import {matchesQuery} from './filter-predicates';

/**
 * Execute a query against log entries
 */
export function executeQuery(
	entries: LogEntry[],
	query: LogQuery,
	totalCount: number,
): QueryResult {
	const startTime = performance.now();

	// Filter entries
	const filteredEntries = entries.filter(entry => matchesQuery(entry, query));

	// Apply sorting
	const sortedEntries = sortLogEntries(filteredEntries, query);

	// Apply pagination
	const offset = query.offset || 0;
	const limit = query.limit || 100;
	const paginatedEntries = sortedEntries.slice(offset, offset + limit);

	const queryTime = performance.now() - startTime;

	// Generate facets
	const filteredCount = filteredEntries.length;
	const facets = generateFacets(filteredEntries);

	return {
		entries: paginatedEntries,
		totalCount,
		filteredCount,
		queryTime,
		hasMore: offset + limit < filteredEntries.length,
		facets,
	};
}
