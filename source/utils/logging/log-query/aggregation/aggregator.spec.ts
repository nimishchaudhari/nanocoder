/**
 * Tests for aggregator
 */

import test from 'ava';
import {aggregateLogEntries, getGroupKey} from './aggregator.js';
import type {AggregationOptions, LogEntry} from '../types.js';

// Helper to create test log entry
function createLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
	return {
		timestamp: new Date().toISOString(),
		level: 'info',
		message: 'Test message',
		...overrides,
	};
}

test('getGroupKey: hour grouping', t => {
	const entry = createLogEntry({timestamp: '2025-01-15T14:30:45Z'});

	const key = getGroupKey(entry, 'hour');

	t.is(key, '2025-01-15T14');
});

test('getGroupKey: day grouping', t => {
	const entry = createLogEntry({timestamp: '2025-01-15T14:30:45Z'});

	const key = getGroupKey(entry, 'day');

	t.is(key, '2025-01-15');
});

test('getGroupKey: level grouping', t => {
	const entry = createLogEntry({level: 'error'});

	const key = getGroupKey(entry, 'level');

	t.is(key, 'error');
});

test('getGroupKey: source grouping', t => {
	const entry = createLogEntry({source: 'api-server'});

	const key = getGroupKey(entry, 'source');

	t.is(key, 'api-server');
});

test('getGroupKey: source grouping - missing source', t => {
	const entry = createLogEntry({});

	const key = getGroupKey(entry, 'source');

	t.is(key, 'unknown');
});

test('getGroupKey: correlationId grouping', t => {
	const entry = createLogEntry({correlationId: 'corr-123'});

	const key = getGroupKey(entry, 'correlationId');

	t.is(key, 'corr-123');
});

test('getGroupKey: correlationId grouping - missing', t => {
	const entry = createLogEntry({});

	const key = getGroupKey(entry, 'correlationId');

	t.is(key, 'no-correlation');
});

test('getGroupKey: errorType grouping', t => {
	const entry = createLogEntry({error: {type: 'ValidationError'}});

	const key = getGroupKey(entry, 'errorType');

	t.is(key, 'ValidationError');
});

test('getGroupKey: errorType grouping - missing error', t => {
	const entry = createLogEntry({});

	const key = getGroupKey(entry, 'errorType');

	t.is(key, 'no-error');
});

test('aggregateLogEntries: count aggregation', t => {
	const entries = [
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'info'}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['count'],
	};

	const result = aggregateLogEntries(entries, options);

	t.is(result.totalGroups, 2);
	t.is(result.groups.error?.count, 2);
	t.is(result.groups.info?.count, 1);
	t.truthy(result.queryTime);
});

test('aggregateLogEntries: avgDuration aggregation', t => {
	const entries = [
		createLogEntry({level: 'info', performance: {duration: 100}}),
		createLogEntry({level: 'info', performance: {duration: 200}}),
		createLogEntry({level: 'info', performance: {duration: 300}}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['avgDuration'],
	};

	const result = aggregateLogEntries(entries, options);

	t.is(result.groups.info?.avgDuration, 200);
});

test('aggregateLogEntries: maxDuration and minDuration', t => {
	const entries = [
		createLogEntry({level: 'info', performance: {duration: 100}}),
		createLogEntry({level: 'info', performance: {duration: 500}}),
		createLogEntry({level: 'info', performance: {duration: 200}}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['maxDuration', 'minDuration'],
	};

	const result = aggregateLogEntries(entries, options);

	t.is(result.groups.info?.maxDuration, 500);
	t.is(result.groups.info?.minDuration, 100);
});

test('aggregateLogEntries: sumDuration aggregation', t => {
	const entries = [
		createLogEntry({level: 'info', performance: {duration: 100}}),
		createLogEntry({level: 'info', performance: {duration: 200}}),
		createLogEntry({level: 'info', performance: {duration: 300}}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['sumDuration'],
	};

	const result = aggregateLogEntries(entries, options);

	t.is(result.groups.info?.sumDuration, 600);
});

test('aggregateLogEntries: errorRate aggregation', t => {
	const entries = [
		createLogEntry({level: 'info', error: {message: 'Error 1'}}),
		createLogEntry({level: 'info'}),
		createLogEntry({level: 'info', error: {message: 'Error 2'}}),
		createLogEntry({level: 'info'}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['errorRate'],
	};

	const result = aggregateLogEntries(entries, options);

	t.is(result.groups.info?.errorRate, 0.5); // 2 errors out of 4
});

test('aggregateLogEntries: memoryUsage aggregation', t => {
	const entries = [
		createLogEntry({
			level: 'info',
			performance: {memory: {heapUsed: 1000000}},
		}),
		createLogEntry({
			level: 'info',
			performance: {memory: {heapUsed: 3000000}},
		}),
		createLogEntry({
			level: 'info',
			performance: {memory: {heapUsed: 2000000}},
		}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['memoryUsage'],
	};

	const result = aggregateLogEntries(entries, options);

	t.truthy(result.groups.info?.memoryUsage);
	t.is(result.groups.info?.memoryUsage?.avgHeapUsed, 2000000);
	t.is(result.groups.info?.memoryUsage?.maxHeapUsed, 3000000);
	t.is(result.groups.info?.memoryUsage?.minHeapUsed, 1000000);
});

test('aggregateLogEntries: time range filter', t => {
	const entries = [
		createLogEntry({
			timestamp: '2025-01-01T00:00:00Z',
			level: 'info',
		}),
		createLogEntry({
			timestamp: '2025-01-02T00:00:00Z',
			level: 'info',
		}),
		createLogEntry({
			timestamp: '2025-01-03T00:00:00Z',
			level: 'info',
		}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['count'],
		timeRange: {
			startTime: new Date('2025-01-02T00:00:00Z'),
			endTime: new Date('2025-01-02T23:59:59Z'),
		},
	};

	const result = aggregateLogEntries(entries, options);

	t.is(result.groups.info?.count, 1); // Only the middle entry
});

test('aggregateLogEntries: multiple groups', t => {
	const entries = [
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'warn'}),
		createLogEntry({level: 'info'}),
		createLogEntry({level: 'info'}),
		createLogEntry({level: 'info'}),
	];

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['count'],
	};

	const result = aggregateLogEntries(entries, options);

	t.is(result.totalGroups, 3);
	t.is(result.groups.error?.count, 2);
	t.is(result.groups.warn?.count, 1);
	t.is(result.groups.info?.count, 3);
});

test('aggregateLogEntries: samples included', t => {
	const entries = Array.from({length: 15}, (_, i) =>
		createLogEntry({level: 'info', message: `Message ${i}`}),
	);

	const options: AggregationOptions = {
		groupBy: 'level',
		aggregations: ['count'],
	};

	const result = aggregateLogEntries(entries, options);

	t.truthy(result.groups.info?.samples);
	t.is(result.groups.info?.samples?.length, 10); // Max 10 samples
});
