import test from 'ava';
import {PasteDetector} from './paste-detection';

// Tests for PasteDetector class
// Validates CLI paste detection logic

console.log(`\npaste-detection.spec.ts`);

test('PasteDetector detects rapid input as paste', t => {
	const detector = new PasteDetector();

	// Simulate rapid input - use 110 chars to exceed 50*2=100 threshold
	const result = detector.detectPaste('a'.repeat(110));

	t.true(result.isPaste);
	t.is(result.method, 'size'); // Large input detected as paste
	t.is(result.addedText, 'a'.repeat(110));
});

test('PasteDetector detects multi-line input as paste', t => {
	const detector = new PasteDetector();

	const multiLineText = 'line1\nline2\nline3\nline4';
	const result = detector.detectPaste(multiLineText);

	t.true(result.isPaste);
	t.is(result.method, 'lines');
	t.is(result.addedText, multiLineText);
});

test('PasteDetector does not detect small input as paste', t => {
	const detector = new PasteDetector();

	const result = detector.detectPaste('small');

	t.false(result.isPaste);
	t.is(result.method, 'none');
});

test('PasteDetector tracks incremental changes correctly', t => {
	const detector = new PasteDetector();

	// First input
	const result1 = detector.detectPaste('hello');
	t.false(result1.isPaste);

	// Add more text (incremental)
	const result2 = detector.detectPaste('hello world');
	t.false(result2.isPaste);
	t.is(result2.addedText, ' world');
});

test('PasteDetector reset clears state', t => {
	const detector = new PasteDetector();

	detector.detectPaste('some text');
	detector.reset();

	const result = detector.detectPaste('new text');
	t.is(result.addedText, 'new text'); // Should be full text, not just diff
});
