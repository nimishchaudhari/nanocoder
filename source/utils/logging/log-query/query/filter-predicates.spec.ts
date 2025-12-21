/**
 * Tests for filter predicates
 */

import test from 'ava';
import {matchesQuery} from './filter-predicates.js';
import type {LogEntry, LogQuery} from '../types.js';

// Helper to create test log entry
function createLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
	return {
		timestamp: '2025-01-01T12:00:00Z',
		level: 'info',
		message: 'Test message',
		...overrides,
	};
}

test('matchesQuery: empty query matches all entries', t => {
	const entry = createLogEntry();
	const query: LogQuery = {};

	t.true(matchesQuery(entry, query));
});

test('matchesQuery: time range - startTime filter', t => {
	const entry = createLogEntry({timestamp: '2025-01-02T00:00:00Z'});

	t.true(matchesQuery(entry, {startTime: new Date('2025-01-01T00:00:00Z')}));
	t.false(matchesQuery(entry, {startTime: new Date('2025-01-03T00:00:00Z')}));
});

test('matchesQuery: time range - endTime filter', t => {
	const entry = createLogEntry({timestamp: '2025-01-02T00:00:00Z'});

	t.true(matchesQuery(entry, {endTime: new Date('2025-01-03T00:00:00Z')}));
	t.false(matchesQuery(entry, {endTime: new Date('2025-01-01T00:00:00Z')}));
});

test('matchesQuery: level filter - includes', t => {
	const entry = createLogEntry({level: 'error'});

	t.true(matchesQuery(entry, {levels: ['error', 'warn']}));
	t.false(matchesQuery(entry, {levels: ['info', 'debug']}));
});

test('matchesQuery: level filter - excludes', t => {
	const entry = createLogEntry({level: 'info'});

	t.false(matchesQuery(entry, {excludeLevels: ['info', 'debug']}));
	t.true(matchesQuery(entry, {excludeLevels: ['error', 'warn']}));
});

test('matchesQuery: message contains', t => {
	const entry = createLogEntry({message: 'User login successful'});

	t.true(matchesQuery(entry, {messageContains: 'login'}));
	t.false(matchesQuery(entry, {messageContains: 'logout'}));
});

test('matchesQuery: message regex', t => {
	const entry = createLogEntry({message: 'Error: File not found'});

	t.true(matchesQuery(entry, {messageRegex: /Error:.*/}));
	t.false(matchesQuery(entry, {messageRegex: /Warning:.*/}));
});

test('matchesQuery: message starts with', t => {
	const entry = createLogEntry({message: 'Starting application'});

	t.true(matchesQuery(entry, {messageStartsWith: 'Starting'}));
	t.false(matchesQuery(entry, {messageStartsWith: 'Stopping'}));
});

test('matchesQuery: message ends with', t => {
	const entry = createLogEntry({message: 'Process completed successfully'});

	t.true(matchesQuery(entry, {messageEndsWith: 'successfully'}));
	t.false(matchesQuery(entry, {messageEndsWith: 'failed'}));
});

test('matchesQuery: correlation ID filter', t => {
	const entry = createLogEntry({correlationId: 'corr-123'});

	t.true(matchesQuery(entry, {correlationIds: ['corr-123', 'corr-456']}));
	t.false(matchesQuery(entry, {correlationIds: ['corr-456', 'corr-789']}));
});

test('matchesQuery: correlation ID filter - missing correlationId', t => {
	const entry = createLogEntry({}); // No correlationId

	t.false(matchesQuery(entry, {correlationIds: ['corr-123']}));
});

test('matchesQuery: source filter', t => {
	const entry = createLogEntry({source: 'api-server'});

	t.true(matchesQuery(entry, {sources: ['api-server', 'db-server']}));
	t.false(matchesQuery(entry, {sources: ['db-server', 'cache-server']}));
});

test('matchesQuery: exclude sources filter', t => {
	const entry = createLogEntry({source: 'api-server'});

	t.false(matchesQuery(entry, {excludeSources: ['api-server']}));
	t.true(matchesQuery(entry, {excludeSources: ['db-server']}));
});

test('matchesQuery: tags filter', t => {
	const entry = createLogEntry({tags: ['auth', 'security']});

	t.true(matchesQuery(entry, {tags: ['auth']}));
	t.true(matchesQuery(entry, {tags: ['security']}));
	t.false(matchesQuery(entry, {tags: ['performance']}));
});

test('matchesQuery: hasTags filter', t => {
	const entryWithTags = createLogEntry({tags: ['test']});
	const entryWithoutTags = createLogEntry({});

	t.true(matchesQuery(entryWithTags, {hasTags: true}));
	t.false(matchesQuery(entryWithoutTags, {hasTags: true}));
});

test('matchesQuery: exclude tags filter', t => {
	const entry = createLogEntry({tags: ['auth', 'security']});

	t.true(matchesQuery(entry, {excludeTags: ['performance']}));
	t.false(matchesQuery(entry, {excludeTags: ['auth']}));
});

test('matchesQuery: metadata key exists', t => {
	const entry = createLogEntry({metadata: {userId: '123'}});

	t.true(matchesQuery(entry, {metadataKey: 'userId'}));
	t.false(matchesQuery(entry, {metadataKey: 'requestId'}));
});

test('matchesQuery: metadata value matches', t => {
	const entry = createLogEntry({metadata: {status: 'active'}});

	t.true(matchesQuery(entry, {metadataKey: 'status', metadataValue: 'active'}));
	t.false(
		matchesQuery(entry, {metadataKey: 'status', metadataValue: 'inactive'}),
	);
});

test('matchesQuery: metadata exists filter', t => {
	const entry = createLogEntry({metadata: {userId: '123'}});

	t.true(matchesQuery(entry, {metadataExists: 'userId'}));
	t.false(matchesQuery(entry, {metadataExists: 'requestId'}));
});

test('matchesQuery: duration min filter', t => {
	const entry = createLogEntry({performance: {duration: 1500}});

	t.true(matchesQuery(entry, {durationMin: 1000}));
	t.false(matchesQuery(entry, {durationMin: 2000}));
});

test('matchesQuery: duration max filter', t => {
	const entry = createLogEntry({performance: {duration: 1500}});

	t.true(matchesQuery(entry, {durationMax: 2000}));
	t.false(matchesQuery(entry, {durationMax: 1000}));
});

test('matchesQuery: memory threshold filter', t => {
	const entry = createLogEntry({
		performance: {memory: {heapUsed: 50000000}},
	});

	// memoryThreshold acts as minimum - entries below threshold are filtered out
	t.true(matchesQuery(entry, {memoryThreshold: 30000000})); // 50MB >= 30MB
	t.false(matchesQuery(entry, {memoryThreshold: 100000000})); // 50MB < 100MB
});

test('matchesQuery: has errors filter', t => {
	const entryWithError = createLogEntry({error: {message: 'Error occurred'}});
	const entryWithoutError = createLogEntry({});

	t.true(matchesQuery(entryWithError, {hasErrors: true}));
	t.false(matchesQuery(entryWithoutError, {hasErrors: true}));
	t.true(matchesQuery(entryWithoutError, {hasErrors: false}));
});

test('matchesQuery: error types filter', t => {
	const entry = createLogEntry({error: {type: 'ValidationError'}});

	t.true(matchesQuery(entry, {errorTypes: ['ValidationError', 'TypeError']}));
	t.false(matchesQuery(entry, {errorTypes: ['ReferenceError']}));
});

test('matchesQuery: request methods filter', t => {
	const entry = createLogEntry({request: {method: 'POST'}});

	t.true(matchesQuery(entry, {requestMethods: ['POST', 'PUT']}));
	t.false(matchesQuery(entry, {requestMethods: ['GET', 'DELETE']}));
});

test('matchesQuery: request status codes filter', t => {
	const entry = createLogEntry({request: {statusCode: 404}});

	t.true(matchesQuery(entry, {requestStatusCodes: [404, 500]}));
	t.false(matchesQuery(entry, {requestStatusCodes: [200, 201]}));
});

test('matchesQuery: request duration min filter', t => {
	const entry = createLogEntry({request: {duration: 1500}});

	t.true(matchesQuery(entry, {requestDurationMin: 1000}));
	t.false(matchesQuery(entry, {requestDurationMin: 2000}));
});

test('matchesQuery: request duration max filter', t => {
	const entry = createLogEntry({request: {duration: 1500}});

	t.true(matchesQuery(entry, {requestDurationMax: 2000}));
	t.false(matchesQuery(entry, {requestDurationMax: 1000}));
});

test('matchesQuery: multiple filters combined', t => {
	const entry = createLogEntry({
		level: 'error',
		message: 'Database connection failed',
		source: 'db-server',
		tags: ['database', 'critical'],
	});

	t.true(
		matchesQuery(entry, {
			levels: ['error'],
			messageContains: 'Database',
			sources: ['db-server'],
			tags: ['database'],
		}),
	);

	t.false(
		matchesQuery(entry, {
			levels: ['error'],
			messageContains: 'API', // This doesn't match
			sources: ['db-server'],
		}),
	);
});
