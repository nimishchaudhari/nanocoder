import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'ava';
import {setCurrentMode} from '../context/mode-context.js';
import {writeFileTool} from './write-file.js';

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;

// Create a temporary directory before each test
test.beforeEach(async () => {
	testDir = await mkdtemp(join(tmpdir(), 'write-file-test-'));
});

// Clean up temporary directory after each test
test.afterEach(async () => {
	if (testDir) {
		await rm(testDir, {recursive: true, force: true});
	}
});

// Helper to execute the write_file tool
async function executeWriteFile(args: {
	path: string;
	content: string;
}): Promise<string> {
	// biome-ignore lint/suspicious/noExplicitAny: Tool internals require any
	return await (writeFileTool.tool as any).execute(args, {
		toolCallId: 'test',
		messages: [],
	});
}

// Helper to create a test file
async function createTestFile(
	filename: string,
	content: string,
): Promise<string> {
	const filePath = join(testDir, filename);
	await writeFile(filePath, content, 'utf-8');
	return filePath;
}

// ============================================================================
// Approval Tests
// ============================================================================

test('write_file requires approval in normal mode', async t => {
	setCurrentMode('normal');
	const needsApproval = writeFileTool.tool.needsApproval;

	if (typeof needsApproval === 'function') {
		const result = await needsApproval(
			{
				path: 'test.txt',
				content: 'test',
			},
			{toolCallId: 'test', messages: []},
		);
		t.true(result);
	} else {
		t.is(needsApproval, true);
	}
});

test('write_file does NOT require approval in auto-accept mode', async t => {
	setCurrentMode('auto-accept');
	const needsApproval = writeFileTool.tool.needsApproval;

	if (typeof needsApproval === 'function') {
		const result = await needsApproval(
			{
				path: 'test.txt',
				content: 'test',
			},
			{toolCallId: 'test', messages: []},
		);
		t.false(result);
	} else {
		t.is(needsApproval, false);
	}
});

test('write_file requires approval in plan mode', async t => {
	setCurrentMode('plan');
	const needsApproval = writeFileTool.tool.needsApproval;

	if (typeof needsApproval === 'function') {
		const result = await needsApproval(
			{
				path: 'test.txt',
				content: 'test',
			},
			{toolCallId: 'test', messages: []},
		);
		t.true(result);
	} else {
		t.is(needsApproval, true);
	}
});

// ============================================================================
// Basic Write Tests
// ============================================================================

test('write_file: create new file', async t => {
	const filePath = join(testDir, 'new.txt');

	const result = await executeWriteFile({
		path: filePath,
		content: 'Hello World\n',
	});

	const content = await readFile(filePath, 'utf-8');
	t.is(content, 'Hello World\n');
	t.true(result.includes('File written successfully'));
	t.true(result.includes('File contents after write:'));
});

test('write_file: overwrite existing file', async t => {
	const filePath = await createTestFile('existing.txt', 'Old content\n');

	const result = await executeWriteFile({
		path: filePath,
		content: 'New content\n',
	});

	const content = await readFile(filePath, 'utf-8');
	t.is(content, 'New content\n');
	t.true(result.includes('File overwritten successfully'));
	t.true(result.includes('File contents after write:'));
});

test('write_file: write empty file', async t => {
	const filePath = join(testDir, 'empty.txt');

	const result = await executeWriteFile({
		path: filePath,
		content: '',
	});

	const content = await readFile(filePath, 'utf-8');
	t.is(content, '');
	t.true(result.includes('File written successfully'));
});

test('write_file: write multi-line content', async t => {
	const filePath = join(testDir, 'multi.txt');
	const testContent = 'Line 1\nLine 2\nLine 3';

	const result = await executeWriteFile({
		path: filePath,
		content: testContent,
	});

	const content = await readFile(filePath, 'utf-8');
	t.is(content, testContent);
	t.true(result.includes('3 lines'));
});

test('write_file: write large file', async t => {
	const filePath = join(testDir, 'large.txt');
	const largeContent = Array.from({length: 1000}, (_, i) => `Line ${i + 1}`).join(
		'\n',
	);

	const result = await executeWriteFile({
		path: filePath,
		content: largeContent,
	});

	const content = await readFile(filePath, 'utf-8');
	t.is(content, largeContent);
	t.true(result.includes('1000 lines'));
});

test('write_file: preserves exact content including whitespace', async t => {
	const filePath = join(testDir, 'whitespace.txt');
	const testContent = '  indented\n\ttabbed\n  \t  mixed\n';

	await executeWriteFile({
		path: filePath,
		content: testContent,
	});

	const content = await readFile(filePath, 'utf-8');
	t.is(content, testContent);
});

// ============================================================================
// Read-After-Write Verification Tests
// ============================================================================

test('write_file: returns file contents after write', async t => {
	const filePath = join(testDir, 'verify.txt');

	const result = await executeWriteFile({
		path: filePath,
		content: 'Test content\nLine 2',
	});

	// Check that result includes the actual file contents
	t.true(result.includes('File contents after write:'));
	t.true(result.includes('Test content'));
	t.true(result.includes('Line 2'));
	t.true(result.includes('2 lines'));
});

test('write_file: detects token count', async t => {
	const filePath = join(testDir, 'tokens.txt');
	const content = 'x'.repeat(400); // ~100 tokens

	const result = await executeWriteFile({
		path: filePath,
		content,
	});

	t.true(result.includes('~100 tokens'));
});

// ============================================================================
// Validator Tests
// ============================================================================

test('write_file validator: accepts valid path', async t => {
	const filePath = join(testDir, 'valid.txt');

	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await writeFileTool.validator({
		path: filePath,
		content: 'test',
	});

	t.true(result.valid);
});

test('write_file validator: rejects non-existent parent directory', async t => {
	const filePath = join(testDir, 'nonexistent', 'file.txt');

	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await writeFileTool.validator({
		path: filePath,
		content: 'test',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('Parent directory does not exist'));
	}
});

test('write_file validator: rejects system directories', async t => {
	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const systemPaths = ['/etc/test.txt', '/sys/test.txt', '/proc/test.txt'];

	for (const path of systemPaths) {
		const result = await writeFileTool.validator({
			path,
			content: 'test',
		});

		t.false(result.valid);
		if (!result.valid) {
			t.true(
				result.error.includes('system directory') ||
					result.error.includes('Parent directory does not exist'),
			);
		}
	}
});

// ============================================================================
// Special Content Tests
// ============================================================================

test('write_file: handles special characters', async t => {
	const filePath = join(testDir, 'special.txt');
	const content = 'Special: \n\t"quotes"\n\'apostrophes\'\n\\backslash\n';

	await executeWriteFile({
		path: filePath,
		content,
	});

	const actual = await readFile(filePath, 'utf-8');
	t.is(actual, content);
});

test('write_file: handles unicode', async t => {
	const filePath = join(testDir, 'unicode.txt');
	const content = 'Unicode: 你好世界 🚀 émoji\n';

	await executeWriteFile({
		path: filePath,
		content,
	});

	const actual = await readFile(filePath, 'utf-8');
	t.is(actual, content);
});

// ============================================================================
// Comparison with create_file
// ============================================================================

test('write_file: can overwrite files (unlike create_file)', async t => {
	const filePath = await createTestFile('existing.txt', 'Original\n');

	// write_file should succeed
	await t.notThrowsAsync(async () => {
		await executeWriteFile({
			path: filePath,
			content: 'Overwritten\n',
		});
	});

	const content = await readFile(filePath, 'utf-8');
	t.is(content, 'Overwritten\n');
});

// ============================================================================
// Formatter Tests
// ============================================================================

test('write_file formatter: generates preview for new file', async t => {
	const filePath = join(testDir, 'new.txt');

	if (!writeFileTool.formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const preview = await writeFileTool.formatter({
		path: filePath,
		content: 'Hello World\n',
	});

	// Verify preview is a valid React element
	t.truthy(preview);
	t.truthy(
		preview && typeof preview === 'object' && ('$$typeof' in preview || 'type' in preview),
	);
});

test('write_file formatter: generates result message after execution', async t => {
	const filePath = join(testDir, 'result.txt');

	if (!writeFileTool.formatter) {
		t.fail('Formatter not defined');
		return;
	}

	// Execute the tool first
	const result = await executeWriteFile({
		path: filePath,
		content: 'Test content\n',
	});

	// Then get the formatter result
	const preview = await writeFileTool.formatter(
		{
			path: filePath,
			content: 'Test content\n',
		},
		result,
	);

	t.truthy(preview);
	t.truthy(
		preview && typeof preview === 'object' && ('$$typeof' in preview || 'type' in preview),
	);
});

test('write_file formatter: handles empty content', async t => {
	const filePath = join(testDir, 'empty.txt');

	if (!writeFileTool.formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const preview = await writeFileTool.formatter({
		path: filePath,
		content: '',
	});

	t.truthy(preview);
	t.truthy(
		preview && typeof preview === 'object' && ('$$typeof' in preview || 'type' in preview),
	);
});

test('write_file formatter: handles file_path parameter', async t => {
	const filePath = join(testDir, 'filepath.txt');

	if (!writeFileTool.formatter) {
		t.fail('Formatter not defined');
		return;
	}

	// Test with file_path parameter instead of path
	const preview = await writeFileTool.formatter({
		file_path: filePath,
		content: 'Content\n',
	});

	t.truthy(preview);
});

test('write_file formatter: generates preview with large content', async t => {
	const filePath = join(testDir, 'large.txt');
	const largeContent = Array.from({length: 100}, (_, i) => `Line ${i + 1}`).join('\n');

	if (!writeFileTool.formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const preview = await writeFileTool.formatter({
		path: filePath,
		content: largeContent,
	});

	t.truthy(preview);
	t.truthy(
		preview && typeof preview === 'object' && ('$$typeof' in preview || 'type' in preview),
	);
});

// ============================================================================
// Validator Additional System Directory Tests
// ============================================================================

test('write_file validator: rejects /etc directory', async t => {
	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await writeFileTool.validator({
		path: '/etc/test.conf',
		content: 'test',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('system directory'));
	}
});

test('write_file validator: rejects /sys directory', async t => {
	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await writeFileTool.validator({
		path: '/sys/kernel/test',
		content: 'test',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('system directory'));
	}
});

test('write_file validator: rejects /proc directory', async t => {
	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await writeFileTool.validator({
		path: '/proc/meminfo',
		content: 'test',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('system directory'));
	}
});

test('write_file validator: rejects /dev directory', async t => {
	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await writeFileTool.validator({
		path: '/dev/null',
		content: 'test',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('system directory'));
	}
});

test('write_file validator: rejects /boot directory', async t => {
	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await writeFileTool.validator({
		path: '/boot/config',
		content: 'test',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('system directory'));
	}
});

test('write_file validator: rejects Windows system directories', async t => {
	if (!writeFileTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	// Note: This test only works on Windows due to path resolution
	// On Linux/Mac, Windows paths are resolved as relative paths
	const isWindows = process.platform === 'win32';

	if (isWindows) {
		const windowsPaths = [
			'C:\\Windows\\System32\\test.exe',
			'C:\\Program Files\\test.txt',
		];

		for (const path of windowsPaths) {
			const result = await writeFileTool.validator({
				path,
				content: 'test',
			});

			t.false(result.valid);
			if (!result.valid) {
				t.true(result.error.includes('system directory'));
			}
		}
	} else {
		// On non-Windows, just verify the test would work with proper paths
		t.pass('Skipped on non-Windows platform');
	}
});

// ============================================================================
// Additional Edge Case Tests
// ============================================================================

test('write_file: handles UTF-8 content with unicode', async t => {
	const filePath = join(testDir, 'unicode.txt');
	const content = 'Hello 世界 🚀\nEmoji: 😀😃😄\nAccented: éàüö\n';

	await executeWriteFile({
		path: filePath,
		content,
	});

	const actual = await readFile(filePath, 'utf-8');
	t.is(actual, content);
});

test('write_file: handles binary-like content', async t => {
	const filePath = join(testDir, 'binary.txt');
	const content = '\x00\x01\x02\x03\xff\xfe\xfd';

	await executeWriteFile({
		path: filePath,
		content,
	});

	const actual = await readFile(filePath, 'utf-8');
	t.is(actual, content);
});

test('write_file: handles very long lines', async t => {
	const filePath = join(testDir, 'longlines.txt');
	const longLine = 'x'.repeat(10000);
	const content = `${longLine}\n${longLine}\n`;

	await executeWriteFile({
		path: filePath,
		content,
	});

	const actual = await readFile(filePath, 'utf-8');
	t.is(actual, content);
});

// ============================================================================
// Cleanup
// ============================================================================

test.after(() => {
	setCurrentMode('normal');
});
