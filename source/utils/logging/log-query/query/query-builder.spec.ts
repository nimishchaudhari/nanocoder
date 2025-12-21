/**
 * Tests for query builder
 */

import test from 'ava';
import {LogQueryBuilder, createLogQuery} from './query-builder.js';

test('LogQueryBuilder: creates empty query', t => {
	const builder = new LogQueryBuilder();

	const query = builder.toJSON();

	t.deepEqual(query, {});
});

test('createLogQuery: creates new builder', t => {
	const builder = createLogQuery();

	t.true(builder instanceof LogQueryBuilder);
});

test('LogQueryBuilder: timeRange sets time filters', t => {
	const start = new Date('2025-01-01T00:00:00Z');
	const end = new Date('2025-01-02T00:00:00Z');

	const query = createLogQuery().timeRange(start, end).toJSON();

	t.is(query.startTime, start);
	t.is(query.endTime, end);
});

test('LogQueryBuilder: levels sets level filter', t => {
	const query = createLogQuery().levels('error', 'warn').toJSON();

	t.deepEqual(query.levels, ['error', 'warn']);
});

test('LogQueryBuilder: excludeLevels sets exclude filter', t => {
	const query = createLogQuery().excludeLevels('debug', 'trace').toJSON();

	t.deepEqual(query.excludeLevels, ['debug', 'trace']);
});

test('LogQueryBuilder: messageContains sets message filter', t => {
	const query = createLogQuery().messageContains('error').toJSON();

	t.is(query.messageContains, 'error');
});

test('LogQueryBuilder: messageRegex sets regex filter', t => {
	const regex = /error.*/i;
	const query = createLogQuery().messageRegex(regex).toJSON();

	t.is(query.messageRegex, regex);
});

test('LogQueryBuilder: correlationIds sets correlation filter', t => {
	const query = createLogQuery().correlationIds('corr-1', 'corr-2').toJSON();

	t.deepEqual(query.correlationIds, ['corr-1', 'corr-2']);
});

test('LogQueryBuilder: sources sets source filter', t => {
	const query = createLogQuery().sources('api', 'db').toJSON();

	t.deepEqual(query.sources, ['api', 'db']);
});

test('LogQueryBuilder: tags sets tag filter', t => {
	const query = createLogQuery().tags('critical', 'security').toJSON();

	t.deepEqual(query.tags, ['critical', 'security']);
});

test('LogQueryBuilder: hasTags sets hasTags flag', t => {
	const query = createLogQuery().hasTags().toJSON();

	t.true(query.hasTags);
});

test('LogQueryBuilder: limit sets pagination limit', t => {
	const query = createLogQuery().limit(50).toJSON();

	t.is(query.limit, 50);
});

test('LogQueryBuilder: offset sets pagination offset', t => {
	const query = createLogQuery().offset(10).toJSON();

	t.is(query.offset, 10);
});

test('LogQueryBuilder: sortBy sets sort field and order', t => {
	const query = createLogQuery().sortBy('timestamp', 'asc').toJSON();

	t.is(query.sortBy, 'timestamp');
	t.is(query.sortOrder, 'asc');
});

test('LogQueryBuilder: sortBy defaults to desc order', t => {
	const query = createLogQuery().sortBy('level').toJSON();

	t.is(query.sortBy, 'level');
	t.is(query.sortOrder, 'desc');
});

test('LogQueryBuilder: durationMin sets minimum duration', t => {
	const query = createLogQuery().durationMin(1000).toJSON();

	t.is(query.durationMin, 1000);
});

test('LogQueryBuilder: memoryThreshold sets memory filter', t => {
	const query = createLogQuery().memoryThreshold(50000000).toJSON();

	t.is(query.memoryThreshold, 50000000);
});

test('LogQueryBuilder: chains multiple methods', t => {
	const query = createLogQuery()
		.levels('error', 'warn')
		.messageContains('database')
		.sources('api-server')
		.limit(25)
		.sortBy('timestamp', 'desc')
		.toJSON();

	t.deepEqual(query.levels, ['error', 'warn']);
	t.is(query.messageContains, 'database');
	t.deepEqual(query.sources, ['api-server']);
	t.is(query.limit, 25);
	t.is(query.sortBy, 'timestamp');
	t.is(query.sortOrder, 'desc');
});

test('LogQueryBuilder: toJSON returns copy of query', t => {
	const builder = createLogQuery().levels('error');
	const query1 = builder.toJSON();
	const query2 = builder.toJSON();

	t.not(query1, query2); // Different objects
	t.deepEqual(query1, query2); // Same content
});

test('LogQueryBuilder: fluent API returns builder instance', t => {
	const builder = createLogQuery();

	const result = builder.levels('error');

	t.is(result, builder);
});

test('LogQueryBuilder: complex query construction', t => {
	const start = new Date('2025-01-01T00:00:00Z');
	const end = new Date('2025-01-31T23:59:59Z');

	const query = createLogQuery()
		.timeRange(start, end)
		.levels('error', 'fatal')
		.messageContains('timeout')
		.sources('api-server', 'worker-server')
		.tags('critical')
		.hasTags()
		.durationMin(5000)
		.sortBy('duration', 'desc')
		.limit(10)
		.offset(0)
		.toJSON();

	t.is(query.startTime, start);
	t.is(query.endTime, end);
	t.deepEqual(query.levels, ['error', 'fatal']);
	t.is(query.messageContains, 'timeout');
	t.deepEqual(query.sources, ['api-server', 'worker-server']);
	t.deepEqual(query.tags, ['critical']);
	t.true(query.hasTags);
	t.is(query.durationMin, 5000);
	t.is(query.sortBy, 'duration');
	t.is(query.sortOrder, 'desc');
	t.is(query.limit, 10);
	t.is(query.offset, 0);
});
