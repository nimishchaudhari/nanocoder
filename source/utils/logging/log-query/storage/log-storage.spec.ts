/**
 * Tests for log storage
 */

import test from 'ava';
import {LogStorage} from './log-storage.js';
import type {AggregationOptions, LogEntry, LogQuery} from '../types.js';

// Helper to create test log entry
function createLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
	return {
		timestamp: new Date().toISOString(),
		level: 'info',
		message: 'Test message',
		...overrides,
	};
}

test('LogStorage: constructor creates empty storage', t => {
	const storage = new LogStorage(10);

	t.is(storage.getEntryCount(), 0);
});

test('LogStorage: addEntry adds entry to storage', t => {
	const storage = new LogStorage(10);
	const entry = createLogEntry();

	storage.addEntry(entry);

	t.is(storage.getEntryCount(), 1);
});

test('LogStorage: addEntry multiple entries', t => {
	const storage = new LogStorage(10);

	storage.addEntry(createLogEntry({message: '1'}));
	storage.addEntry(createLogEntry({message: '2'}));
	storage.addEntry(createLogEntry({message: '3'}));

	t.is(storage.getEntryCount(), 3);
});

test('LogStorage: addEntry respects max capacity', t => {
	const storage = new LogStorage(3);

	storage.addEntry(createLogEntry({message: '1'}));
	storage.addEntry(createLogEntry({message: '2'}));
	storage.addEntry(createLogEntry({message: '3'}));
	storage.addEntry(createLogEntry({message: '4'}));

	t.is(storage.getEntryCount(), 3); // Should stay at max
});

test('LogStorage: query returns all entries', t => {
	const storage = new LogStorage(10);

	storage.addEntry(createLogEntry({level: 'error'}));
	storage.addEntry(createLogEntry({level: 'info'}));
	storage.addEntry(createLogEntry({level: 'warn'}));

	const query: LogQuery = {};
	const result = storage.query(query);

	t.is(result.entries.length, 3);
	t.is(result.totalCount, 3);
});

test('LogStorage: query filters by level', t => {
	const storage = new LogStorage(10);

	storage.addEntry(createLogEntry({level: 'error'}));
	storage.addEntry(createLogEntry({level: 'info'}));
	storage.addEntry(createLogEntry({level: 'error'}));

	const query: LogQuery = {levels: ['error']};
	const result = storage.query(query);

	t.is(result.entries.length, 2);
	t.is(result.filteredCount, 2);
	t.is(result.totalCount, 3);
});

test('LogStorage: query applies pagination', t => {
	const storage = new LogStorage(100);

	for (let i = 0; i < 10; i++) {
		storage.addEntry(createLogEntry({message: `Entry ${i}`}));
	}

	const query: LogQuery = {limit: 3, offset: 2};
	const result = storage.query(query);

	t.is(result.entries.length, 3);
	t.is(result.filteredCount, 10);
	t.true(result.hasMore);
});

test('LogStorage: query sorts entries', t => {
	const storage = new LogStorage(10);

	storage.addEntry(createLogEntry({timestamp: '2025-01-03T00:00:00Z'}));
	storage.addEntry(createLogEntry({timestamp: '2025-01-01T00:00:00Z'}));
	storage.addEntry(createLogEntry({timestamp: '2025-01-02T00:00:00Z'}));

	const query: LogQuery = {sortBy: 'timestamp', sortOrder: 'asc'};
	const result = storage.query(query);

	t.is(result.entries[0]?.timestamp, '2025-01-01T00:00:00Z');
	t.is(result.entries[1]?.timestamp, '2025-01-02T00:00:00Z');
	t.is(result.entries[2]?.timestamp, '2025-01-03T00:00:00Z');
});

test('LogStorage: query generates facets', t => {
	const storage = new LogStorage(10);

	storage.addEntry(createLogEntry({level: 'error'}));
	storage.addEntry(createLogEntry({level: 'error'}));
	storage.addEntry(createLogEntry({level: 'info'}));

	const result = storage.query({});

	t.truthy(result.facets);
	t.is(result.facets?.levels.error, 2);
	t.is(result.facets?.levels.info, 1);
});

test('LogStorage: aggregate groups by level', t => {
	const storage = new LogStorage(10);

	storage.addEntry(createLogEntry({level: 'error'}));
	storage.addEntry(createLogEntry({level: 'error'}));
	storage.addEntry(createLogEntry({level: 'info'}));

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['count'],
	};

	const result = storage.aggregate(options);

	t.is(result.totalGroups, 2);
	t.is(result.groups.error?.count, 2);
	t.is(result.groups.info?.count, 1);
});

test('LogStorage: aggregate calculates avgDuration', t => {
	const storage = new LogStorage(10);

	storage.addEntry(
		createLogEntry({level: 'info', performance: {duration: 100}}),
	);
	storage.addEntry(
		createLogEntry({level: 'info', performance: {duration: 200}}),
	);
	storage.addEntry(
		createLogEntry({level: 'info', performance: {duration: 300}}),
	);

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['avgDuration'],
	};

	const result = storage.aggregate(options);

	t.is(result.groups.info?.avgDuration, 200);
});

test('LogStorage: clear removes all entries', t => {
	const storage = new LogStorage(10);

	storage.addEntry(createLogEntry());
	storage.addEntry(createLogEntry());
	storage.addEntry(createLogEntry());

	t.is(storage.getEntryCount(), 3);

	storage.clear();

	t.is(storage.getEntryCount(), 0);
	t.deepEqual(storage.query({}).entries, []);
});

test('LogStorage: integration test - full workflow', t => {
	const storage = new LogStorage(100);

	// Add various entries
	storage.addEntry(
		createLogEntry({
			level: 'error',
			message: 'Database error',
			source: 'db-server',
			timestamp: '2025-01-01T10:00:00Z',
			performance: {duration: 1500},
		}),
	);
	storage.addEntry(
		createLogEntry({
			level: 'error',
			message: 'API timeout',
			source: 'api-server',
			timestamp: '2025-01-01T11:00:00Z',
			performance: {duration: 3000},
		}),
	);
	storage.addEntry(
		createLogEntry({
			level: 'info',
			message: 'Request processed',
			source: 'api-server',
			timestamp: '2025-01-01T12:00:00Z',
			performance: {duration: 200},
		}),
	);

	// Query for errors
	const errorQuery: LogQuery = {
		levels: ['error'],
		sortBy: 'duration',
		sortOrder: 'desc',
	};
	const errorResult = storage.query(errorQuery);

	t.is(errorResult.entries.length, 2);
	t.is(errorResult.entries[0]?.message, 'API timeout'); // Longest duration
	t.is(errorResult.entries[1]?.message, 'Database error');

	// Aggregate by source
	const aggOptions: AggregationOptions = {
		groupBy: 'source',
		aggregations: ['count', 'avgDuration'],
	};
	const aggResult = storage.aggregate(aggOptions);

	t.is(aggResult.totalGroups, 2);
	t.is(aggResult.groups['api-server']?.count, 2);
	t.is(aggResult.groups['db-server']?.count, 1);
	t.is(aggResult.groups['api-server']?.avgDuration, 1600); // (3000 + 200) / 2
});

test('LogStorage: handles wraparound in buffer', t => {
	const storage = new LogStorage(3);

	storage.addEntry(createLogEntry({message: '1'}));
	storage.addEntry(createLogEntry({message: '2'}));
	storage.addEntry(createLogEntry({message: '3'}));
	storage.addEntry(createLogEntry({message: '4'})); // Should remove '1'

	const result = storage.query({});

	t.is(result.entries.length, 3);
	t.is(result.totalCount, 3);
	// First entry should be removed
	t.false(result.entries.some(e => e.message === '1'));
	t.true(result.entries.some(e => e.message === '4'));
});
