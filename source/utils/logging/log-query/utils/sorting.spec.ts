/**
 * Tests for sorting utilities
 */

import test from 'ava';
import {getLevelPriority, getSortValue, sortLogEntries} from './sorting.js';
import type {LogEntry, LogQuery} from '../types.js';

// Helper to create test log entry
function createLogEntry(overrides: Partial<LogEntry>): LogEntry {
	return {
		timestamp: new Date().toISOString(),
		level: 'info',
		message: 'Test message',
		...overrides,
	};
}

test('getLevelPriority: returns correct priorities', t => {
	t.is(getLevelPriority('fatal'), 0);
	t.is(getLevelPriority('error'), 1);
	t.is(getLevelPriority('warn'), 2);
	t.is(getLevelPriority('info'), 3);
	t.is(getLevelPriority('http'), 4);
	t.is(getLevelPriority('debug'), 5);
	t.is(getLevelPriority('trace'), 6);
});

test('getLevelPriority: returns default for unknown level', t => {
	t.is(getLevelPriority('unknown'), 6);
	t.is(getLevelPriority('custom'), 6);
});

test('getSortValue: timestamp returns milliseconds', t => {
	const timestamp = '2025-01-01T12:00:00Z';
	const entry = createLogEntry({timestamp});

	const value = getSortValue(entry, 'timestamp');

	t.is(typeof value, 'number');
	t.is(value, new Date(timestamp).getTime());
});

test('getSortValue: level returns priority number', t => {
	const entry = createLogEntry({level: 'error'});

	const value = getSortValue(entry, 'level');

	t.is(value, 1); // error priority
});

test('getSortValue: duration returns performance duration', t => {
	const entry = createLogEntry({
		performance: {duration: 1500},
	});

	const value = getSortValue(entry, 'duration');

	t.is(value, 1500);
});

test('getSortValue: duration returns 0 when missing', t => {
	const entry = createLogEntry({});

	const value = getSortValue(entry, 'duration');

	t.is(value, 0);
});

test('getSortValue: memory returns heap used', t => {
	const entry = createLogEntry({
		performance: {memory: {heapUsed: 50000000}},
	});

	const value = getSortValue(entry, 'memory');

	t.is(value, 50000000);
});

test('getSortValue: memory returns 0 when missing', t => {
	const entry = createLogEntry({});

	const value = getSortValue(entry, 'memory');

	t.is(value, 0);
});

test('getSortValue: unknown sortBy returns 0', t => {
	const entry = createLogEntry({});

	const value = getSortValue(entry, 'unknown');

	t.is(value, 0);
});

test('sortLogEntries: no sortBy returns original order', t => {
	const entries = [
		createLogEntry({message: '1'}),
		createLogEntry({message: '2'}),
		createLogEntry({message: '3'}),
	];
	const query: LogQuery = {};

	const sorted = sortLogEntries([...entries], query);

	t.deepEqual(sorted, entries);
});

test('sortLogEntries: timestamp ascending', t => {
	const entries = [
		createLogEntry({timestamp: '2025-01-03T00:00:00Z'}),
		createLogEntry({timestamp: '2025-01-01T00:00:00Z'}),
		createLogEntry({timestamp: '2025-01-02T00:00:00Z'}),
	];
	const query: LogQuery = {sortBy: 'timestamp', sortOrder: 'asc'};

	const sorted = sortLogEntries([...entries], query);

	t.is(sorted[0]?.timestamp, '2025-01-01T00:00:00Z');
	t.is(sorted[1]?.timestamp, '2025-01-02T00:00:00Z');
	t.is(sorted[2]?.timestamp, '2025-01-03T00:00:00Z');
});

test('sortLogEntries: timestamp descending', t => {
	const entries = [
		createLogEntry({timestamp: '2025-01-01T00:00:00Z'}),
		createLogEntry({timestamp: '2025-01-03T00:00:00Z'}),
		createLogEntry({timestamp: '2025-01-02T00:00:00Z'}),
	];
	const query: LogQuery = {sortBy: 'timestamp', sortOrder: 'desc'};

	const sorted = sortLogEntries([...entries], query);

	t.is(sorted[0]?.timestamp, '2025-01-03T00:00:00Z');
	t.is(sorted[1]?.timestamp, '2025-01-02T00:00:00Z');
	t.is(sorted[2]?.timestamp, '2025-01-01T00:00:00Z');
});

test('sortLogEntries: level ascending', t => {
	const entries = [
		createLogEntry({level: 'info'}),
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'warn'}),
	];
	const query: LogQuery = {sortBy: 'level', sortOrder: 'asc'};

	const sorted = sortLogEntries([...entries], query);

	t.is(sorted[0]?.level, 'error'); // priority 1
	t.is(sorted[1]?.level, 'warn'); // priority 2
	t.is(sorted[2]?.level, 'info'); // priority 3
});

test('sortLogEntries: duration descending', t => {
	const entries = [
		createLogEntry({performance: {duration: 100}}),
		createLogEntry({performance: {duration: 500}}),
		createLogEntry({performance: {duration: 200}}),
	];
	const query: LogQuery = {sortBy: 'duration', sortOrder: 'desc'};

	const sorted = sortLogEntries([...entries], query);

	t.is(sorted[0]?.performance?.duration, 500);
	t.is(sorted[1]?.performance?.duration, 200);
	t.is(sorted[2]?.performance?.duration, 100);
});

test('sortLogEntries: memory ascending', t => {
	const entries = [
		createLogEntry({performance: {memory: {heapUsed: 3000000}}}),
		createLogEntry({performance: {memory: {heapUsed: 1000000}}}),
		createLogEntry({performance: {memory: {heapUsed: 2000000}}}),
	];
	const query: LogQuery = {sortBy: 'memory', sortOrder: 'asc'};

	const sorted = sortLogEntries([...entries], query);

	t.is(sorted[0]?.performance?.memory?.heapUsed, 1000000);
	t.is(sorted[1]?.performance?.memory?.heapUsed, 2000000);
	t.is(sorted[2]?.performance?.memory?.heapUsed, 3000000);
});
