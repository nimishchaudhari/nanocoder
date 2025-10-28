import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import {fetchUrlTool} from './fetch-url';
import {ThemeContext} from '../hooks/useTheme';
import {themes} from '../config/themes';

console.log(`\nfetch-url.spec.tsx – ${React.version}`);

// Mock ThemeProvider for testing
const MockThemeProvider = ({children}: {children: React.ReactNode}) => {
	const mockTheme = {
		currentTheme: 'default' as const,
		colors: themes['tokyo-night'].colors, // Use tokyo-night theme colors
		setCurrentTheme: () => {},
	};

	return (
		<ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
	);
};

// Note: These tests validate the tool configuration and validator logic.
// Handler tests that make actual network requests are skipped to avoid flakiness.
// For handler testing, consider using integration tests with known stable URLs
// or mocking the convertToMarkdown function at the module level.

test('handler validates URL format', async t => {
	await t.throwsAsync(
		async () => {
			await fetchUrlTool.handler({url: 'not-a-valid-url'});
		},
		{message: /Invalid URL/},
	);
});

test('validator accepts valid HTTP URLs', async t => {
	const result = await fetchUrlTool.validator!({url: 'https://example.com'});

	t.true(result.valid);
});

test('validator accepts valid HTTPS URLs', async t => {
	const result = await fetchUrlTool.validator!({url: 'http://example.com'});

	t.true(result.valid);
});

test('validator rejects invalid URL formats', async t => {
	const result = await fetchUrlTool.validator!({url: 'not a url'});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('Invalid URL format'));
	}
});

test('validator rejects non-HTTP/HTTPS protocols', async t => {
	const result = await fetchUrlTool.validator!({url: 'ftp://example.com'});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('Invalid URL protocol'));
		t.true(result.error.includes('ftp:'));
	}
});

test('validator rejects localhost URLs', async t => {
	const result = await fetchUrlTool.validator!({url: 'http://localhost:3000'});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('internal/private network'));
	}
});

test('validator rejects 127.0.0.1 URLs', async t => {
	const result = await fetchUrlTool.validator!({
		url: 'http://127.0.0.1:8080',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('internal/private network'));
	}
});

test('validator rejects 192.168.x.x URLs', async t => {
	const result = await fetchUrlTool.validator!({
		url: 'http://192.168.1.1',
	});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('internal/private network'));
	}
});

test('validator rejects 10.x.x.x URLs', async t => {
	const result = await fetchUrlTool.validator!({url: 'http://10.0.0.1'});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('internal/private network'));
	}
});

test('validator rejects 172.16-31.x.x URLs', async t => {
	const result = await fetchUrlTool.validator!({url: 'http://172.16.0.1'});

	t.false(result.valid);
	if (!result.valid) {
		t.true(result.error.includes('internal/private network'));
	}
});

test('validator accepts external IP addresses', async t => {
	const result = await fetchUrlTool.validator!({url: 'http://8.8.8.8'});

	t.true(result.valid);
});

test('tool config has correct name', t => {
	t.is(fetchUrlTool.config.function.name, 'fetch_url');
});

test('tool config has description', t => {
	t.is(typeof fetchUrlTool.config.function.description, 'string');
	t.true(fetchUrlTool.config.function.description.length > 0);
	t.true(fetchUrlTool.config.function.description.includes('get-md'));
});

test('tool config requires url parameter', t => {
	t.deepEqual(fetchUrlTool.config.function.parameters.required, ['url']);
});

test('tool config has url property', t => {
	t.is(fetchUrlTool.config.function.parameters.properties.url.type, 'string');
});

test('tool does not require confirmation', t => {
	t.false(fetchUrlTool.requiresConfirmation);
});

test('formatter is a function', t => {
	t.is(typeof fetchUrlTool.formatter, 'function');
});

test('formatter returns a Promise', async t => {
	const result = fetchUrlTool.formatter!({url: 'https://example.com'});

	t.true(result instanceof Promise);
});

// ============================================================================
// Component Rendering Tests
// ============================================================================

test('formatter renders component with URL', async t => {
	const component = await fetchUrlTool.formatter!({
		url: 'https://example.com',
	});

	const {lastFrame} = render(
		<MockThemeProvider>{component}</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /fetch_url/);
	t.regex(output!, /https:\/\/example\.com/);
});

test('formatter renders component with result stats', async t => {
	const mockResult = 'Test content with some markdown';

	const component = await fetchUrlTool.formatter!(
		{url: 'https://example.com'},
		mockResult,
	);

	const {lastFrame} = render(
		<MockThemeProvider>{component}</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /fetch_url/);
	t.regex(output!, /https:\/\/example\.com/);
	t.regex(output!, /Content:/);
	t.regex(output!, /characters/);
	t.regex(output!, /tokens/);
});

test('formatter shows truncation warning when content is truncated', async t => {
	const truncatedResult =
		'x'.repeat(100000) +
		'\n\n[Content truncated - original size was 150000 characters]';

	const component = await fetchUrlTool.formatter!(
		{url: 'https://large-content.com'},
		truncatedResult,
	);

	const {lastFrame} = render(
		<MockThemeProvider>{component}</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Content was truncated to 100KB/);
});

test('formatter renders without result (before execution)', async t => {
	const component = await fetchUrlTool.formatter!({
		url: 'https://example.com',
	});

	const {lastFrame} = render(
		<MockThemeProvider>{component}</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /fetch_url/);
	t.regex(output!, /https:\/\/example\.com/);
	// Should not show content stats before execution
	t.notRegex(output!, /Content:/);
});

test('formatter calculates token estimate correctly', async t => {
	// 100 characters should estimate ~25 tokens (divide by 4)
	const mockResult = 'a'.repeat(100);

	const component = await fetchUrlTool.formatter!(
		{url: 'https://example.com'},
		mockResult,
	);

	const {lastFrame} = render(
		<MockThemeProvider>{component}</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /100.*characters/);
	t.regex(output!, /25.*tokens/);
});
