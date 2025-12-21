/**
 * Tests for facet generator
 */

import test from 'ava';
import {generateFacets} from './facet-generator.js';
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

test('generateFacets: empty entries returns empty facets', t => {
	const facets = generateFacets([]);

	t.deepEqual(facets.levels, {});
	t.deepEqual(facets.sources, {});
	t.deepEqual(facets.tags, {});
	t.deepEqual(facets.errorTypes, {});
	t.deepEqual(facets.hours, {});
});

test('generateFacets: counts levels correctly', t => {
	const entries = [
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'error'}),
		createLogEntry({level: 'warn'}),
		createLogEntry({level: 'info'}),
	];

	const facets = generateFacets(entries);

	t.is(facets.levels.error, 2);
	t.is(facets.levels.warn, 1);
	t.is(facets.levels.info, 1);
});

test('generateFacets: counts sources correctly', t => {
	const entries = [
		createLogEntry({source: 'api-server'}),
		createLogEntry({source: 'api-server'}),
		createLogEntry({source: 'db-server'}),
		createLogEntry({}), // No source
	];

	const facets = generateFacets(entries);

	t.is(facets.sources['api-server'], 2);
	t.is(facets.sources['db-server'], 1);
	t.is(Object.keys(facets.sources).length, 2);
});

test('generateFacets: counts tags correctly', t => {
	const entries = [
		createLogEntry({tags: ['auth', 'security']}),
		createLogEntry({tags: ['auth']}),
		createLogEntry({tags: ['performance']}),
		createLogEntry({}), // No tags
	];

	const facets = generateFacets(entries);

	t.is(facets.tags.auth, 2);
	t.is(facets.tags.security, 1);
	t.is(facets.tags.performance, 1);
});

test('generateFacets: counts error types correctly', t => {
	const entries = [
		createLogEntry({error: {type: 'ValidationError'}}),
		createLogEntry({error: {type: 'ValidationError'}}),
		createLogEntry({error: {type: 'TypeError'}}),
		createLogEntry({}), // No error
	];

	const facets = generateFacets(entries);

	t.is(facets.errorTypes.ValidationError, 2);
	t.is(facets.errorTypes.TypeError, 1);
	t.is(Object.keys(facets.errorTypes).length, 2);
});

test('generateFacets: counts hours correctly', t => {
	const entries = [
		createLogEntry({timestamp: '2025-01-15T10:30:00Z'}),
		createLogEntry({timestamp: '2025-01-15T10:45:00Z'}),
		createLogEntry({timestamp: '2025-01-15T11:00:00Z'}),
		createLogEntry({timestamp: '2025-01-15T11:30:00Z'}),
	];

	const facets = generateFacets(entries);

	t.is(facets.hours['2025-01-15T10'], 2);
	t.is(facets.hours['2025-01-15T11'], 2);
});

test('generateFacets: handles multiple facets together', t => {
	const entries = [
		createLogEntry({
			level: 'error',
			source: 'api-server',
			tags: ['critical', 'database'],
			error: {type: 'ConnectionError'},
			timestamp: '2025-01-15T14:00:00Z',
		}),
		createLogEntry({
			level: 'error',
			source: 'api-server',
			tags: ['critical'],
			error: {type: 'TimeoutError'},
			timestamp: '2025-01-15T14:30:00Z',
		}),
	];

	const facets = generateFacets(entries);

	t.is(facets.levels.error, 2);
	t.is(facets.sources['api-server'], 2);
	t.is(facets.tags.critical, 2);
	t.is(facets.tags.database, 1);
	t.is(facets.errorTypes.ConnectionError, 1);
	t.is(facets.errorTypes.TimeoutError, 1);
	t.is(facets.hours['2025-01-15T14'], 2);
});

test('generateFacets: single entry with all fields', t => {
	const entries = [
		createLogEntry({
			level: 'warn',
			source: 'db-server',
			tags: ['slow', 'query'],
			error: {type: 'SlowQueryWarning'},
			timestamp: '2025-01-15T09:00:00Z',
		}),
	];

	const facets = generateFacets(entries);

	t.is(facets.levels.warn, 1);
	t.is(facets.sources['db-server'], 1);
	t.is(facets.tags.slow, 1);
	t.is(facets.tags.query, 1);
	t.is(facets.errorTypes.SlowQueryWarning, 1);
	t.is(facets.hours['2025-01-15T09'], 1);
});

test('generateFacets: handles duplicate tag in same entry', t => {
	const entries = [createLogEntry({tags: ['test', 'test']})];

	const facets = generateFacets(entries);

	t.is(facets.tags.test, 2); // Should count both occurrences
});
