/**
 * Tests for query engine
 */

import test from 'ava';
import {executeQuery} from './query-engine.js';
import type {LogEntry, LogQuery} from '../types.js';

// Helper to create test log entry
function createLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
	return {
		timestamp: new Date().toISOString(),
		level: 'info',
		message: 'Test message',
		...overrides,
	};
}

test('executeQuery: returns all entries when no filters', t => {
	const entries = [
		createLogEntry({message: 'Entry 1'}),
		createLogEntry({message: 'Entry 2'}),
		createLogEntry({message: 'Entry 3'}),
	];
	const query: LogQuery = {};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries.length, 3);
	t.is(result.totalCount, 3);
	t.is(result.filteredCount, 3);
	t.false(result.hasMore);
});

test('executeQuery: filters by level', t => {
	const entries = [
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'info'}),
		createLogEntry({level: 'error'}),
	];
	const query: LogQuery = {levels: ['error']};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries.length, 2);
	t.is(result.filteredCount, 2);
	t.is(result.entries[0]?.level, 'error');
	t.is(result.entries[1]?.level, 'error');
});

test('executeQuery: applies pagination', t => {
	const entries = Array.from({length: 10}, (_, i) =>
		createLogEntry({message: `Entry ${i}`}),
	);
	const query: LogQuery = {limit: 3, offset: 2};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries.length, 3);
	t.is(result.filteredCount, 10);
	t.true(result.hasMore);
	t.is(result.entries[0]?.message, 'Entry 2');
	t.is(result.entries[1]?.message, 'Entry 3');
	t.is(result.entries[2]?.message, 'Entry 4');
});

test('executeQuery: hasMore is false when all entries returned', t => {
	const entries = Array.from({length: 5}, (_, i) =>
		createLogEntry({message: `Entry ${i}`}),
	);
	const query: LogQuery = {limit: 10};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries.length, 5);
	t.false(result.hasMore);
});

test('executeQuery: hasMore is true when more entries available', t => {
	const entries = Array.from({length: 10}, (_, i) =>
		createLogEntry({message: `Entry ${i}`}),
	);
	const query: LogQuery = {limit: 5};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries.length, 5);
	t.true(result.hasMore);
});

test('executeQuery: sorts entries', t => {
	const entries = [
		createLogEntry({timestamp: '2025-01-03T00:00:00Z'}),
		createLogEntry({timestamp: '2025-01-01T00:00:00Z'}),
		createLogEntry({timestamp: '2025-01-02T00:00:00Z'}),
	];
	const query: LogQuery = {sortBy: 'timestamp', sortOrder: 'asc'};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries[0]?.timestamp, '2025-01-01T00:00:00Z');
	t.is(result.entries[1]?.timestamp, '2025-01-02T00:00:00Z');
	t.is(result.entries[2]?.timestamp, '2025-01-03T00:00:00Z');
});

test('executeQuery: generates facets', t => {
	const entries = [
		createLogEntry({level: 'error', source: 'api'}),
		createLogEntry({level: 'error', source: 'db'}),
		createLogEntry({level: 'info', source: 'api'}),
	];
	const query: LogQuery = {};

	const result = executeQuery(entries, query, entries.length);

	t.truthy(result.facets);
	t.is(result.facets?.levels.error, 2);
	t.is(result.facets?.levels.info, 1);
	t.is(result.facets?.sources.api, 2);
	t.is(result.facets?.sources.db, 1);
});

test('executeQuery: facets reflect filtered results', t => {
	const entries = [
		createLogEntry({level: 'error', source: 'api'}),
		createLogEntry({level: 'error', source: 'db'}),
		createLogEntry({level: 'info', source: 'api'}),
	];
	const query: LogQuery = {levels: ['error']};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.facets?.levels.error, 2);
	t.is(result.facets?.levels.info, undefined); // Filtered out
	t.is(result.facets?.sources.api, 1);
	t.is(result.facets?.sources.db, 1);
});

test('executeQuery: measures query time', t => {
	const entries = Array.from({length: 100}, (_, i) =>
		createLogEntry({message: `Entry ${i}`}),
	);
	const query: LogQuery = {};

	const result = executeQuery(entries, query, entries.length);

	t.truthy(result.queryTime);
	t.true(result.queryTime >= 0);
});

test('executeQuery: combines filter, sort, and pagination', t => {
	const entries = [
		createLogEntry({
			level: 'error',
			timestamp: '2025-01-03T00:00:00Z',
			message: 'Error 3',
		}),
		createLogEntry({
			level: 'error',
			timestamp: '2025-01-01T00:00:00Z',
			message: 'Error 1',
		}),
		createLogEntry({
			level: 'info',
			timestamp: '2025-01-02T00:00:00Z',
			message: 'Info 2',
		}),
		createLogEntry({
			level: 'error',
			timestamp: '2025-01-02T00:00:00Z',
			message: 'Error 2',
		}),
	];
	const query: LogQuery = {
		levels: ['error'],
		sortBy: 'timestamp',
		sortOrder: 'asc',
		limit: 2,
	};

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries.length, 2);
	t.is(result.entries[0]?.message, 'Error 1');
	t.is(result.entries[1]?.message, 'Error 2');
	t.is(result.filteredCount, 3); // Total errors
	t.true(result.hasMore); // Third error not included
});

test('executeQuery: default limit is 100', t => {
	const entries = Array.from({length: 150}, (_, i) =>
		createLogEntry({message: `Entry ${i}`}),
	);
	const query: LogQuery = {}; // No limit specified

	const result = executeQuery(entries, query, entries.length);

	t.is(result.entries.length, 100); // Default limit
	t.true(result.hasMore);
});

test('executeQuery: totalCount reflects storage size', t => {
	const entries = [
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'info'}),
	];
	const query: LogQuery = {levels: ['error']};
	const totalCount = 1000; // Storage has 1000 total entries

	const result = executeQuery(entries, query, totalCount);

	t.is(result.filteredCount, 1); // Filtered results
	t.is(result.totalCount, 1000); // Total in storage
});
