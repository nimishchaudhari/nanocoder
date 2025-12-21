/**
 * Tests for index manager
 */

import test from 'ava';
import {IndexManager} from './index-manager.js';
import type {LogEntry} from '../types.js';

// Helper to create test log entry
function createLogEntry(
	level: string,
	correlationId?: string,
	source?: string,
): LogEntry {
	return {
		timestamp: new Date().toISOString(),
		level,
		message: 'Test message',
		correlationId,
		source,
	};
}

test('IndexManager: starts with empty indexes', t => {
	const manager = new IndexManager();

	t.is(manager.getIndexValues('level'), undefined);
	t.is(manager.getIndexValues('correlationId'), undefined);
	t.is(manager.getIndexValues('source'), undefined);
});

test('IndexManager: adds level index', t => {
	const manager = new IndexManager();
	const entry = createLogEntry('error');

	manager.updateIndexes(entry, true);

	const levelIndex = manager.getIndexValues('level');
	t.truthy(levelIndex);
	t.true(levelIndex?.has('error'));
});

test('IndexManager: adds correlation ID index', t => {
	const manager = new IndexManager();
	const entry = createLogEntry('info', 'corr-123');

	manager.updateIndexes(entry, true);

	const corrIndex = manager.getIndexValues('correlationId');
	t.truthy(corrIndex);
	t.true(corrIndex?.has('corr-123'));
});

test('IndexManager: adds source index', t => {
	const manager = new IndexManager();
	const entry = createLogEntry('info', undefined, 'api-server');

	manager.updateIndexes(entry, true);

	const sourceIndex = manager.getIndexValues('source');
	t.truthy(sourceIndex);
	t.true(sourceIndex?.has('api-server'));
});

test('IndexManager: adds multiple entries to same index', t => {
	const manager = new IndexManager();

	manager.updateIndexes(createLogEntry('error'), true);
	manager.updateIndexes(createLogEntry('warn'), true);
	manager.updateIndexes(createLogEntry('info'), true);

	const levelIndex = manager.getIndexValues('level');
	t.is(levelIndex?.size, 3);
	t.true(levelIndex?.has('error'));
	t.true(levelIndex?.has('warn'));
	t.true(levelIndex?.has('info'));
});

test('IndexManager: removes from level index', t => {
	const manager = new IndexManager();
	const entry = createLogEntry('error');

	manager.updateIndexes(entry, true);
	t.true(manager.getIndexValues('level')?.has('error'));

	manager.updateIndexes(entry, false);
	t.false(manager.getIndexValues('level')?.has('error'));
});

test('IndexManager: removes from correlation ID index', t => {
	const manager = new IndexManager();
	const entry = createLogEntry('info', 'corr-123');

	manager.updateIndexes(entry, true);
	t.true(manager.getIndexValues('correlationId')?.has('corr-123'));

	manager.updateIndexes(entry, false);
	t.false(manager.getIndexValues('correlationId')?.has('corr-123'));
});

test('IndexManager: removes from source index', t => {
	const manager = new IndexManager();
	const entry = createLogEntry('info', undefined, 'api-server');

	manager.updateIndexes(entry, true);
	t.true(manager.getIndexValues('source')?.has('api-server'));

	manager.updateIndexes(entry, false);
	t.false(manager.getIndexValues('source')?.has('api-server'));
});

test('IndexManager: clear removes all indexes', t => {
	const manager = new IndexManager();

	manager.updateIndexes(createLogEntry('error', 'corr-1', 'api'), true);
	manager.updateIndexes(createLogEntry('warn', 'corr-2', 'db'), true);

	t.truthy(manager.getIndexValues('level'));
	t.truthy(manager.getIndexValues('correlationId'));
	t.truthy(manager.getIndexValues('source'));

	manager.clear();

	t.is(manager.getIndexValues('level'), undefined);
	t.is(manager.getIndexValues('correlationId'), undefined);
	t.is(manager.getIndexValues('source'), undefined);
});

test('IndexManager: handles entries without optional fields', t => {
	const manager = new IndexManager();
	const entry = createLogEntry('info'); // No correlationId or source

	manager.updateIndexes(entry, true);

	t.truthy(manager.getIndexValues('level'));
	t.is(manager.getIndexValues('correlationId'), undefined);
	t.is(manager.getIndexValues('source'), undefined);
});

test('IndexManager: handles duplicate values correctly', t => {
	const manager = new IndexManager();

	manager.updateIndexes(createLogEntry('error'), true);
	manager.updateIndexes(createLogEntry('error'), true);
	manager.updateIndexes(createLogEntry('error'), true);

	const levelIndex = manager.getIndexValues('level');
	t.is(levelIndex?.size, 1); // Set should only have one 'error' entry
	t.true(levelIndex?.has('error'));
});
