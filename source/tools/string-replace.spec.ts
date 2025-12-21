import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'ava';
import {setCurrentMode} from '../context/mode-context.js';
import {stringReplaceTool} from './string-replace.js';

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;

// Create a temporary directory before each test
test.beforeEach(async () => {
	testDir = await mkdtemp(join(tmpdir(), 'string-replace-test-'));
});

// Clean up temporary directory after each test
test.afterEach(async () => {
	if (testDir) {
		await rm(testDir, {recursive: true, force: true});
	}
});

// Helper to execute the string_replace tool
async function executeStringReplace(args: {
	path: string;
	old_str: string;
	new_str: string;
}): Promise<string> {
	// biome-ignore lint/suspicious/noExplicitAny: Tool internals require any
	return await (stringReplaceTool.tool as any).execute(args, {
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

test('string_replace requires approval in normal mode', async t => {
	setCurrentMode('normal');
	const needsApproval = stringReplaceTool.tool.needsApproval;

	if (typeof needsApproval === 'function') {
		const result = await needsApproval(
			{
				path: 'test.txt',
				old_str: 'old',
				new_str: 'new',
			},
			{toolCallId: 'test', messages: []},
		);
		t.true(result);
	} else {
		t.is(needsApproval, true);
	}
});

test('string_replace does NOT require approval in auto-accept mode', async t => {
	setCurrentMode('auto-accept');
	const needsApproval = stringReplaceTool.tool.needsApproval;

	if (typeof needsApproval === 'function') {
		const result = await needsApproval(
			{
				path: 'test.txt',
				old_str: 'old',
				new_str: 'new',
			},
			{toolCallId: 'test', messages: []},
		);
		t.false(result);
	} else {
		t.is(needsApproval, false);
	}
});

test('string_replace requires approval in plan mode', async t => {
	setCurrentMode('plan');
	const needsApproval = stringReplaceTool.tool.needsApproval;

	if (typeof needsApproval === 'function') {
		const result = await needsApproval(
			{
				path: 'test.txt',
				old_str: 'old',
				new_str: 'new',
			},
			{toolCallId: 'test', messages: []},
		);
		t.true(result);
	} else {
		t.is(needsApproval, true);
	}
});

// ============================================================================
// Basic Replacement Tests
// ============================================================================

test('string_replace: basic single-line replacement', async t => {
	const filePath = await createTestFile(
		'test.txt',
		'Hello World\nGoodbye World\n',
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: 'Hello World',
		new_str: 'Hi Universe',
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.is(newContent, 'Hi Universe\nGoodbye World\n');
	t.true(result.includes('Successfully replaced'));
});

test('string_replace: multi-line replacement', async t => {
	const filePath = await createTestFile(
		'test.ts',
		'function foo() {\n  return 1;\n}\n',
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: 'function foo() {\n  return 1;\n}',
		new_str: 'function foo() {\n  return 2;\n}',
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.is(newContent, 'function foo() {\n  return 2;\n}\n');
	t.true(result.includes('Successfully replaced'));
});

test('string_replace: insert content (add lines)', async t => {
	const filePath = await createTestFile(
		'test.ts',
		"import fs from 'fs';\n\nfunction main() {}\n",
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: "import fs from 'fs';\n\nfunction main() {}",
		new_str: "import fs from 'fs';\nimport path from 'path';\n\nfunction main() {}",
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.true(newContent.includes("import path from 'path';"));
	t.true(result.includes('Successfully replaced'));
});

test('string_replace: delete content (remove lines)', async t => {
	const filePath = await createTestFile(
		'test.ts',
		'const x = 1;\nconst unused = 2;\nconst y = 3;\n',
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: 'const x = 1;\nconst unused = 2;\nconst y = 3;',
		new_str: 'const x = 1;\nconst y = 3;',
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.false(newContent.includes('unused'));
	t.true(result.includes('Successfully replaced'));
});

test('string_replace: replace with empty string (delete)', async t => {
	const filePath = await createTestFile(
		'test.txt',
		'Keep this\nDelete this\nKeep this too\n',
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: 'Delete this\n',
		new_str: '',
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.is(newContent, 'Keep this\nKeep this too\n');
	t.true(result.includes('Successfully replaced'));
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test('string_replace: error when content not found', async t => {
	const filePath = await createTestFile('test.txt', 'Hello World\n');

	await t.throwsAsync(
		async () => {
			await executeStringReplace({
				path: filePath,
				old_str: 'This does not exist',
				new_str: 'New content',
			});
		},
		{
			message: /Content not found in file/,
		},
	);
});

test('string_replace: error when multiple matches found', async t => {
	const filePath = await createTestFile(
		'test.txt',
		'Hello World\nHello World\n',
	);

	await t.throwsAsync(
		async () => {
			await executeStringReplace({
				path: filePath,
				old_str: 'Hello World',
				new_str: 'Hi Universe',
			});
		},
		{
			message: /Found 2 matches/,
		},
	);
});

test('string_replace: error when file does not exist', async t => {
	await t.throwsAsync(
		async () => {
			await executeStringReplace({
				path: join(testDir, 'nonexistent.txt'),
				old_str: 'old',
				new_str: 'new',
			});
		},
		{
			message: /ENOENT/,
		},
	);
});

test('string_replace: error when old_str is empty', async t => {
	const filePath = await createTestFile('test.txt', 'content\n');

	await t.throwsAsync(
		async () => {
			await executeStringReplace({
				path: filePath,
				old_str: '',
				new_str: 'new',
			});
		},
		{
			message: /old_str cannot be empty/,
		},
	);
});

// ============================================================================
// Context Matching Tests
// ============================================================================

test('string_replace: unique match with surrounding context', async t => {
	const filePath = await createTestFile(
		'test.ts',
		'const a = 1;\nconst b = 2;\nconst c = 3;\n',
	);

	// Include context to make it unique
	const result = await executeStringReplace({
		path: filePath,
		old_str: 'const a = 1;\nconst b = 2;',
		new_str: 'const a = 1;\nconst b = 5;',
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.is(newContent, 'const a = 1;\nconst b = 5;\nconst c = 3;\n');
	t.true(result.includes('Successfully replaced'));
});

test('string_replace: whitespace must match exactly', async t => {
	const filePath = await createTestFile('test.ts', 'function foo() {\n  return 1;\n}\n');

	// This should fail because indentation doesn't match
	await t.throwsAsync(
		async () => {
			await executeStringReplace({
				path: filePath,
				old_str: 'function foo() {\nreturn 1;\n}', // Missing indentation
				new_str: 'function foo() {\n  return 2;\n}',
			});
		},
		{
			message: /Content not found/,
		},
	);
});

// ============================================================================
// Large File Tests
// ============================================================================

test('string_replace: works with large replacements', async t => {
	// Create a large block of text to replace
	const largeOldBlock = Array.from({length: 60}, (_, i) => `line ${i + 1}`).join('\n');
	const largeNewBlock = Array.from({length: 60}, (_, i) => `new line ${i + 1}`).join('\n');

	const filePath = await createTestFile(
		'test.txt',
		`${largeOldBlock}\n`,
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: largeOldBlock,
		new_str: largeNewBlock,
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.true(newContent.includes('new line 1'));
	t.true(newContent.includes('new line 60'));
	t.true(result.includes('Successfully replaced'));
});

// ============================================================================
// Validator Tests
// ============================================================================

test('string_replace validator: accepts valid input', async t => {
	const filePath = await createTestFile('test.txt', 'Hello World\n');

	if (!stringReplaceTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await stringReplaceTool.validator({
		path: filePath,
		old_str: 'Hello',
		new_str: 'Hi',
	});

	t.true(result.valid);
});

test('string_replace validator: rejects non-existent file', async t => {
	if (!stringReplaceTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await stringReplaceTool.validator({
		path: join(testDir, 'nonexistent.txt'),
		old_str: 'old',
		new_str: 'new',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('does not exist'));
	}
});

test('string_replace validator: rejects empty old_str', async t => {
	const filePath = await createTestFile('test.txt', 'content\n');

	if (!stringReplaceTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await stringReplaceTool.validator({
		path: filePath,
		old_str: '',
		new_str: 'new',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('cannot be empty'));
	}
});

test('string_replace validator: rejects when content not found', async t => {
	const filePath = await createTestFile('test.txt', 'Hello World\n');

	if (!stringReplaceTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await stringReplaceTool.validator({
		path: filePath,
		old_str: 'This does not exist',
		new_str: 'new',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('Content not found in file'));
	}
});

test('string_replace validator: rejects when multiple matches found', async t => {
	const filePath = await createTestFile(
		'test.txt',
		'Hello World\nHello World\n',
	);

	if (!stringReplaceTool.validator) {
		t.fail('Validator not defined');
		return;
	}

	const result = await stringReplaceTool.validator({
		path: filePath,
		old_str: 'Hello World',
		new_str: 'Hi Universe',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('Found 2 matches'));
	}
});

// ============================================================================
// Special Character Tests
// ============================================================================

test('string_replace: handles special regex characters', async t => {
	const filePath = await createTestFile(
		'test.txt',
		'const regex = /test.*pattern/;\n',
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: 'const regex = /test.*pattern/;',
		new_str: 'const regex = /new.*pattern/;',
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.is(newContent, 'const regex = /new.*pattern/;\n');
	t.true(result.includes('Successfully replaced'));
});

test('string_replace: handles quotes and escapes', async t => {
	const filePath = await createTestFile(
		'test.ts',
		'const str = "Hello \\"World\\"";\n',
	);

	const result = await executeStringReplace({
		path: filePath,
		old_str: 'const str = "Hello \\"World\\""',
		new_str: 'const str = "Hi \\"Universe\\""',
	});

	const newContent = await readFile(filePath, 'utf-8');
	t.true(newContent.includes('Hi \\"Universe\\"'));
	t.true(result.includes('Successfully replaced'));
});

// ============================================================================
// Cleanup
// ============================================================================

test.after(() => {
	setCurrentMode('normal');
});
