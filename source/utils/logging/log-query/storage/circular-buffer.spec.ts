/**
 * Tests for circular buffer
 */

import test from 'ava';
import {CircularBuffer} from './circular-buffer.js';
import type {LogEntry} from '../types.js';

// Helper to create a test log entry
function createLogEntry(id: number): LogEntry {
	return {
		timestamp: new Date(Date.now() + id * 1000).toISOString(),
		level: 'info',
		message: `Test message ${id}`,
	};
}

test('CircularBuffer: constructor creates empty buffer', t => {
	const buffer = new CircularBuffer(10);
	t.is(buffer.getCount(), 0);
	t.deepEqual(buffer.getAll(), []);
});

test('CircularBuffer: add single entry', t => {
	const buffer = new CircularBuffer(10);
	const entry = createLogEntry(1);

	const removed = buffer.add(entry);

	t.is(removed, undefined, 'Should not remove entry when buffer not full');
	t.is(buffer.getCount(), 1);
	t.deepEqual(buffer.getAll(), [entry]);
});

test('CircularBuffer: add multiple entries within capacity', t => {
	const buffer = new CircularBuffer(10);
	const entries = [createLogEntry(1), createLogEntry(2), createLogEntry(3)];

	for (const entry of entries) {
		buffer.add(entry);
	}

	t.is(buffer.getCount(), 3);
	t.deepEqual(buffer.getAll(), entries);
});

test('CircularBuffer: add entries beyond capacity (wraparound)', t => {
	const buffer = new CircularBuffer(3);
	const entries = [
		createLogEntry(1),
		createLogEntry(2),
		createLogEntry(3),
		createLogEntry(4),
	];

	buffer.add(entries[0]);
	buffer.add(entries[1]);
	buffer.add(entries[2]);

	// Adding 4th entry should remove first entry
	const removed = buffer.add(entries[3]);

	t.deepEqual(removed, entries[0], 'Should remove oldest entry');
	t.is(buffer.getCount(), 3, 'Count should stay at max capacity');
	t.deepEqual(buffer.getAll(), [entries[1], entries[2], entries[3]]);
});

test('CircularBuffer: wraparound maintains order', t => {
	const buffer = new CircularBuffer(3);

	// Fill buffer
	buffer.add(createLogEntry(1));
	buffer.add(createLogEntry(2));
	buffer.add(createLogEntry(3));

	// Add more to cause wraparound
	buffer.add(createLogEntry(4));
	buffer.add(createLogEntry(5));

	const all = buffer.getAll();
	t.is(all.length, 3);
	t.is(all[0]?.message, 'Test message 3');
	t.is(all[1]?.message, 'Test message 4');
	t.is(all[2]?.message, 'Test message 5');
});

test('CircularBuffer: clear resets buffer', t => {
	const buffer = new CircularBuffer(10);

	buffer.add(createLogEntry(1));
	buffer.add(createLogEntry(2));
	buffer.add(createLogEntry(3));

	t.is(buffer.getCount(), 3);

	buffer.clear();

	t.is(buffer.getCount(), 0);
	t.deepEqual(buffer.getAll(), []);
});

test('CircularBuffer: clear allows reuse', t => {
	const buffer = new CircularBuffer(3);

	buffer.add(createLogEntry(1));
	buffer.add(createLogEntry(2));
	buffer.clear();

	const entry = createLogEntry(3);
	buffer.add(entry);

	t.is(buffer.getCount(), 1);
	t.deepEqual(buffer.getAll(), [entry]);
});

test('CircularBuffer: getAll returns entries in order (oldest to newest)', t => {
	const buffer = new CircularBuffer(5);

	for (let i = 1; i <= 5; i++) {
		buffer.add(createLogEntry(i));
	}

	const all = buffer.getAll();
	t.is(all.length, 5);

	for (let i = 0; i < 5; i++) {
		t.is(all[i]?.message, `Test message ${i + 1}`);
	}
});

test('CircularBuffer: handles single entry capacity', t => {
	const buffer = new CircularBuffer(1);

	const entry1 = createLogEntry(1);
	const entry2 = createLogEntry(2);

	buffer.add(entry1);
	t.deepEqual(buffer.getAll(), [entry1]);

	const removed = buffer.add(entry2);
	t.deepEqual(removed, entry1);
	t.deepEqual(buffer.getAll(), [entry2]);
});
