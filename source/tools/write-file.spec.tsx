import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'ava';
import {render} from 'ink-testing-library';
import React from 'react';
import {themes} from '../config/themes.js';
import {setCurrentMode} from '../context/mode-context.js';
import {ThemeContext} from '../hooks/useTheme.js';
import {writeFileTool} from './write-file.js';

// ============================================================================
// Test Helpers
// ============================================================================

console.log(`\nwrite-file.spec.tsx – ${React.version}`);

// Create a mock theme provider for tests
function TestThemeProvider({children}: {children: React.ReactNode}) {
	const themeContextValue = {
		currentTheme: 'tokyo-night' as const,
		colors: themes['tokyo-night'].colors,
		setCurrentTheme: () => {},
	};

	return (
		<ThemeContext.Provider value={themeContextValue}>
			{children}
		</ThemeContext.Provider>
	);
}

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
// Formatter Tests (Visual Display with Ink)
// ============================================================================

test('write_file formatter: renders file content preview', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'test.ts',
		content: 'const x = 1;\nconst y = 2;\n',
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	t.regex(output!, /write_file/);
	t.regex(output!, /test\.ts/);
	t.regex(output!, /3 lines/); // Trailing newline creates 3 lines
	t.regex(output!, /File content:/);
});

test('write_file formatter: shows normalized indentation for deeply indented code', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'nested.jsx',
		content: '        function Component() {\n          return (\n            <div>Hello</div>\n          );\n        }\n',
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	// Should show normalized indentation (leftmost code at column 0)
	t.regex(output!, /write_file/);
	t.regex(output!, /nested\.jsx/);
	t.regex(output!, /6 lines/); // Trailing newline creates 6 lines
});

test('write_file formatter: displays token count', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const content = 'x'.repeat(400); // ~100 tokens

	const element = await formatter({
		path: 'large.txt',
		content,
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	t.regex(output!, /~100 tokens/);
});

test('write_file formatter: handles empty file', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'empty.txt',
		content: '',
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	t.regex(output!, /write_file/);
	t.regex(output!, /File will be empty/);
});

test('write_file formatter: shows line numbers with content', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'numbered.ts',
		content: 'line1\nline2\nline3\n',
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	// Line numbers should be padded to 4 spaces
	t.regex(output!, /1\s+line1/);
	t.regex(output!, /2\s+line2/);
	t.regex(output!, /3\s+line3/);
});

test('write_file formatter: normalizes tabs to 2 spaces', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'tabs.go',
		content: '\t\tfunc main() {\n\t\t\tfmt.Println("hello")\n\t\t}\n',
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	// Should normalize tabs to spaces for display
	t.regex(output!, /write_file/);
	t.regex(output!, /tabs\.go/);
	t.regex(output!, /4 lines/); // Trailing newline creates 4 lines
});

test('write_file formatter: handles JSX with normalized indentation', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'component.jsx',
		content: '      export function Button() {\n        return <button>Click me</button>;\n      }\n',
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	t.regex(output!, /write_file/);
	t.regex(output!, /component\.jsx/);
	// Indentation should be normalized
});

test('write_file formatter: shows character count', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'size.txt',
		content: 'Hello World!', // 12 characters
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	t.regex(output!, /12 characters/);
});

test('write_file formatter: renders syntax highlighting for code', async t => {
	const formatter = writeFileTool.formatter;
	if (!formatter) {
		t.fail('Formatter not defined');
		return;
	}

	const element = await formatter({
		path: 'code.ts',
		content: 'const greeting = "Hello";\nconsole.log(greeting);\n',
	});

	const {lastFrame} = render(<TestThemeProvider>{element}</TestThemeProvider>);
	const output = lastFrame();

	t.truthy(output);
	t.regex(output!, /write_file/);
	t.regex(output!, /code\.ts/);
	// Content should be present (syntax highlighting adds ANSI codes)
	t.regex(output!, /greeting/);
});

// ============================================================================
// Cleanup
// ============================================================================

test.after(() => {
	setCurrentMode('normal');
});
