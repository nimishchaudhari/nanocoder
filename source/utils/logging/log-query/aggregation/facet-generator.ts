/**
 * Facet generation for query results
 */

import type {LogEntry} from '../types';

/**
 * Generate facets (counts by category) for filtered log entries
 */
export function generateFacets(entries: LogEntry[]) {
	const facets = {
		levels: {} as Record<string, number>,
		sources: {} as Record<string, number>,
		tags: {} as Record<string, number>,
		errorTypes: {} as Record<string, number>,
		hours: {} as Record<string, number>,
	};

	for (const entry of entries) {
		// Level facet
		facets.levels[entry.level] = (facets.levels[entry.level] || 0) + 1;

		// Source facet
		if (entry.source) {
			facets.sources[entry.source] = (facets.sources[entry.source] || 0) + 1;
		}

		// Tags facet
		if (entry.tags) {
			for (const tag of entry.tags) {
				facets.tags[tag] = (facets.tags[tag] || 0) + 1;
			}
		}

		// Error type facet
		if (entry.error?.type) {
			facets.errorTypes[entry.error.type] =
				(facets.errorTypes[entry.error.type] || 0) + 1;
		}

		// Hour facet
		const hour = new Date(entry.timestamp).toISOString().substring(0, 13);
		facets.hours[hour] = (facets.hours[hour] || 0) + 1;
	}

	return facets;
}
