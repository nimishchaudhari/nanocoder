/**
 * Tests for helper functions
 */

import test from 'ava';
import {logQueries} from './helpers.js';
import {globalLogStorage} from '../storage/log-storage.js';
import type {LogEntry} from '../types.js';

// Helper to create test log entry
function createLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
	return {
		timestamp: new Date().toISOString(),
		level: 'info',
		message: 'Test message',
		...overrides,
	};
}

// Clear storage before each test
test.beforeEach(() => {
	globalLogStorage.clear();
});

test('logQueries.errors: returns error and fatal logs', t => {
	globalLogStorage.addEntry(createLogEntry({level: 'error'}));
	globalLogStorage.addEntry(createLogEntry({level: 'fatal'}));
	globalLogStorage.addEntry(createLogEntry({level: 'info'}));
	globalLogStorage.addEntry(createLogEntry({level: 'error'}));

	const result = logQueries.errors();

	t.is(result.entries.length, 3); // 2 errors + 1 fatal
	t.true(
		result.entries.every(
			e => e.level === 'error' || e.level === 'fatal',
		),
	);
});

test('logQueries.errors: respects custom limit', t => {
	for (let i = 0; i < 10; i++) {
		globalLogStorage.addEntry(createLogEntry({level: 'error'}));
	}

	const result = logQueries.errors(5);

	t.is(result.entries.length, 5);
});

test('logQueries.byCorrelation: filters by correlation ID', t => {
	globalLogStorage.addEntry(createLogEntry({correlationId: 'corr-1'}));
	globalLogStorage.addEntry(createLogEntry({correlationId: 'corr-2'}));
	globalLogStorage.addEntry(createLogEntry({correlationId: 'corr-1'}));

	const result = logQueries.byCorrelation('corr-1');

	t.is(result.entries.length, 2);
	t.true(result.entries.every(e => e.correlationId === 'corr-1'));
});

test('logQueries.byCorrelation: sorts ascending by timestamp', t => {
	globalLogStorage.addEntry(
		createLogEntry({
			correlationId: 'corr-1',
			timestamp: '2025-01-01T12:00:00Z',
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			correlationId: 'corr-1',
			timestamp: '2025-01-01T10:00:00Z',
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			correlationId: 'corr-1',
			timestamp: '2025-01-01T11:00:00Z',
		}),
	);

	const result = logQueries.byCorrelation('corr-1');

	t.is(result.entries[0]?.timestamp, '2025-01-01T10:00:00Z');
	t.is(result.entries[1]?.timestamp, '2025-01-01T11:00:00Z');
	t.is(result.entries[2]?.timestamp, '2025-01-01T12:00:00Z');
});

test('logQueries.bySource: filters by source', t => {
	globalLogStorage.addEntry(createLogEntry({source: 'api-server'}));
	globalLogStorage.addEntry(createLogEntry({source: 'db-server'}));
	globalLogStorage.addEntry(createLogEntry({source: 'api-server'}));

	const result = logQueries.bySource('api-server');

	t.is(result.entries.length, 2);
	t.true(result.entries.every(e => e.source === 'api-server'));
});

test('logQueries.byTag: filters by tag', t => {
	globalLogStorage.addEntry(createLogEntry({tags: ['critical', 'database']}));
	globalLogStorage.addEntry(createLogEntry({tags: ['info']}));
	globalLogStorage.addEntry(createLogEntry({tags: ['critical']}));

	const result = logQueries.byTag('critical');

	t.is(result.entries.length, 2);
	t.true(result.entries.every(e => e.tags?.includes('critical')));
});

test('logQueries.byTag: requires entries to have tags', t => {
	globalLogStorage.addEntry(createLogEntry({tags: ['critical']}));
	globalLogStorage.addEntry(createLogEntry({})); // No tags

	const result = logQueries.byTag('critical');

	t.is(result.entries.length, 1); // Entry without tags excluded
});

test('logQueries.slowRequests: filters by duration and message', t => {
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'Handled request',
			performance: {duration: 1500},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'Handled request',
			performance: {duration: 500},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'Other operation',
			performance: {duration: 2000},
		}),
	);

	const result = logQueries.slowRequests(1000);

	t.is(result.entries.length, 1); // Only first entry (duration >= 1000 AND message contains "request")
	t.is(result.entries[0]?.performance?.duration, 1500);
});

test('logQueries.slowRequests: uses default duration threshold', t => {
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'Handled request',
			performance: {duration: 1500},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'Handled request',
			performance: {duration: 500},
		}),
	);

	const result = logQueries.slowRequests(); // Default 1000ms

	t.is(result.entries.length, 1);
});

test('logQueries.slowRequests: sorts by duration descending', t => {
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'request 1',
			performance: {duration: 1500},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'request 2',
			performance: {duration: 3000},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			message: 'request 3',
			performance: {duration: 2000},
		}),
	);

	const result = logQueries.slowRequests(1000);

	t.is(result.entries[0]?.performance?.duration, 3000);
	t.is(result.entries[1]?.performance?.duration, 2000);
	t.is(result.entries[2]?.performance?.duration, 1500);
});

test('logQueries.memoryIntensive: filters by memory threshold', t => {
	const threshold = 50 * 1024 * 1024; // 50MB

	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 60 * 1024 * 1024}},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 40 * 1024 * 1024}},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 70 * 1024 * 1024}},
		}),
	);

	const result = logQueries.memoryIntensive(threshold);

	t.is(result.entries.length, 2); // Only entries above threshold
	t.true(
		result.entries.every(
			e => (e.performance?.memory?.heapUsed || 0) >= threshold,
		),
	);
});

test('logQueries.memoryIntensive: uses default threshold', t => {
	const defaultThreshold = 50 * 1024 * 1024;

	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 60 * 1024 * 1024}},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 40 * 1024 * 1024}},
		}),
	);

	const result = logQueries.memoryIntensive();

	t.is(result.entries.length, 1);
	t.true((result.entries[0]?.performance?.memory?.heapUsed || 0) >= defaultThreshold);
});

test('logQueries.memoryIntensive: sorts by memory descending', t => {
	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 60 * 1024 * 1024}},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 80 * 1024 * 1024}},
		}),
	);
	globalLogStorage.addEntry(
		createLogEntry({
			performance: {memory: {heapUsed: 70 * 1024 * 1024}},
		}),
	);

	const result = logQueries.memoryIntensive(50 * 1024 * 1024);

	t.is(result.entries[0]?.performance?.memory?.heapUsed, 80 * 1024 * 1024);
	t.is(result.entries[1]?.performance?.memory?.heapUsed, 70 * 1024 * 1024);
	t.is(result.entries[2]?.performance?.memory?.heapUsed, 60 * 1024 * 1024);
});
