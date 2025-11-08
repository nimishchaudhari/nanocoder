import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import AssistantMessage, {
	decodeHtmlEntities,
	parseMarkdownTable,
	parseMarkdown,
} from './assistant-message';
import {ThemeContext} from '../hooks/useTheme';
import {themes} from '../config/themes';

// Local Colors type used for tests (the module does not export 'Colors')
type Colors = {
	primary: string;
	secondary: string;
	success: string;
	error: string;
	warning: string;
	info: string;
	white: string;
	black: string;
	tool: string;
	diffAdded: string;
	diffRemoved: string;
	diffAddedText: string;
	diffRemovedText: string;
};

// Mock theme colors for testing
const mockColors: Colors = {
	primary: '#3b82f6',
	secondary: '#6b7280',
	success: '#10b981',
	error: '#ef4444',
	warning: '#f59e0b',
	info: '#3b82f6',
	white: '#ffffff',
	black: '#000000',
	tool: '#8b5cf6',
	diffAdded: '#10b981',
	diffRemoved: '#ef4444',
	diffAddedText: '#d1fae5',
	diffRemovedText: '#fee2e2',
};

console.log(`\nassistant-message.spec.tsx – ${React.version}`);

// Mock ThemeProvider for testing
const MockThemeProvider = ({children}: {children: React.ReactNode}) => {
	const mockTheme = {
		currentTheme: 'tokyo-night' as const,
		colors: themes['tokyo-night'].colors,
		setCurrentTheme: () => {},
	};

	return (
		<ThemeContext.Provider value={mockTheme}>{children}</ThemeContext.Provider>
	);
};

// ============================================================================
// Component Rendering Tests
// ============================================================================

test('AssistantMessage renders with basic message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message="Hello world" model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /test-model:/);
	t.regex(output!, /Hello world/);
});

test('AssistantMessage renders with bold text', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message="This is **bold** text" model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /bold/);
});

test('AssistantMessage renders with inline code', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage
				message="Use `const` for constants"
				model="test-model"
			/>
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /const/);
	t.regex(output!, /for constants/);
});

test('AssistantMessage renders with HTML entities', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage
				message="Price: &euro;100&nbsp;only"
				model="test-model"
			/>
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	// Should have decoded entities
	t.regex(output!, /Price:/);
	t.regex(output!, /100/);
	t.regex(output!, /only/);
});

test('AssistantMessage renders with markdown table', t => {
	const message = `| Name | Age |
|------|-----|
| John | 30  |
| Jane | 25  |`;

	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message={message} model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Name/);
	t.regex(output!, /Age/);
	t.regex(output!, /John/);
	t.regex(output!, /Jane/);
	// Should contain table separators
	t.regex(output!, /│/);
});

test('AssistantMessage renders with headings', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message="# Main Heading" model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Main Heading/);
});

test('AssistantMessage renders with lists', t => {
	const message = `- Item 1
- Item 2
- Item 3`;

	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message={message} model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Item 1/);
	t.regex(output!, /Item 2/);
	t.regex(output!, /Item 3/);
	// Should contain bullets
	t.regex(output!, /•/);
});

test('AssistantMessage renders with blockquotes', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message="> This is a quote" model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /This is a quote/);
});

test('AssistantMessage renders with links', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage
				message="Check [this link](https://example.com)"
				model="test-model"
			/>
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /this link/);
	t.regex(output!, /https:\/\/example\.com/);
});

test('AssistantMessage renders with mixed markdown', t => {
	const message = `# Title

This has **bold** and *italic* text.

- List item

Price: &euro;50`;

	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message={message} model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Title/);
	t.regex(output!, /bold/);
	t.regex(output!, /italic/);
	t.regex(output!, /List item/);
	t.regex(output!, /50/);
});

test('AssistantMessage renders without crashing with empty message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message="" model="test-model" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /test-model:/);
});

test('AssistantMessage renders model name correctly', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<AssistantMessage message="Test" model="gpt-4" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /gpt-4:/);
});

// ============================================================================
// HTML Entity Decoding Tests
// ============================================================================

test('decodeHtmlEntities handles common entities', t => {
	const input = 'Hello&nbsp;world&amp;test';
	const result = decodeHtmlEntities(input);
	t.is(result, 'Hello world&test');
});

test('decodeHtmlEntities handles less-than and greater-than', t => {
	const input = '&lt;div&gt;content&lt;/div&gt;';
	const result = decodeHtmlEntities(input);
	t.is(result, '<div>content</div>');
});

test('decodeHtmlEntities handles quotes', t => {
	const input = '&quot;Hello&quot; &apos;World&apos;';
	const result = decodeHtmlEntities(input);
	t.is(result, '"Hello" \'World\'');
});

test('decodeHtmlEntities handles copyright and trademark symbols', t => {
	const input = '&copy; 2024 &reg; &trade;';
	const result = decodeHtmlEntities(input);
	t.is(result, '© 2024 ® ™');
});

test('decodeHtmlEntities handles currency symbols', t => {
	const input = '&euro;100 &pound;50 &yen;1000 &cent;25';
	const result = decodeHtmlEntities(input);
	t.is(result, '€100 £50 ¥1000 ¢25');
});

test('decodeHtmlEntities handles mathematical symbols', t => {
	const input = '45&deg; &plusmn;5 2&times;3 10&divide;2';
	const result = decodeHtmlEntities(input);
	t.is(result, '45° ±5 2×3 10÷2');
});

test('decodeHtmlEntities handles typography symbols', t => {
	const input =
		'&ndash; &mdash; &lsquo;text&rsquo; &ldquo;quote&rdquo; &hellip; &bull;';
	const result = decodeHtmlEntities(input);
	t.is(result, '– — \u2018text\u2019 \u201Cquote\u201D … •');
});

test('decodeHtmlEntities handles numeric entities (decimal)', t => {
	const input = 'Space&#160;here and&#32;there';
	const result = decodeHtmlEntities(input);
	// &#160; is non-breaking space, &#32; is regular space
	t.is(result, 'Space\u00A0here and there');
});

test('decodeHtmlEntities handles numeric entities (hexadecimal)', t => {
	const input = 'Unicode&#xA0;space and&#x20;space';
	const result = decodeHtmlEntities(input);
	// &#xA0; is non-breaking space, &#x20; is regular space
	t.is(result, 'Unicode\u00A0space and space');
});

test('decodeHtmlEntities handles mixed entities', t => {
	const input =
		'&lt;p&gt;Price: &euro;100&nbsp;&plusmn;&nbsp;&#8364;5&lt;/p&gt;';
	const result = decodeHtmlEntities(input);
	t.is(result, '<p>Price: €100 ± €5</p>');
});

test('decodeHtmlEntities leaves normal text unchanged', t => {
	const input = 'Normal text without entities';
	const result = decodeHtmlEntities(input);
	t.is(result, input);
});

test('decodeHtmlEntities handles multiple occurrences of same entity', t => {
	const input = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
	const result = decodeHtmlEntities(input);
	t.is(result, '     ');
});

// ============================================================================
// Markdown Table Parsing Tests
// ============================================================================

test('parseMarkdownTable handles simple two-column table', t => {
	const table = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`;
	const result = parseMarkdownTable(table, mockColors);
	t.true(result.includes('Header 1'));
	t.true(result.includes('Header 2'));
	t.true(result.includes('Cell 1'));
	t.true(result.includes('Cell 4'));
	t.true(result.includes('│')); // Contains column separator
	t.true(result.includes('─')); // Contains row separator
});

test('parseMarkdownTable handles table with varying cell lengths', t => {
	const table = `| Short | Very Long Header Text |
|-------|----------------------|
| A     | B                    |
| Long text here | X       |
`;
	const result = parseMarkdownTable(table, mockColors);
	t.true(result.includes('Short'));
	t.true(result.includes('Very Long Header Text'));
	t.true(result.includes('Long text here'));
});

test('parseMarkdownTable returns original text for invalid table', t => {
	const notATable = 'Just some text without table structure';
	const result = parseMarkdownTable(notATable, mockColors);
	t.is(result, notATable);
});

test('parseMarkdownTable returns original text for table without data rows', t => {
	const table = `| Header 1 | Header 2 |
|----------|----------|
`;
	const result = parseMarkdownTable(table, mockColors);
	t.is(result, table);
});

test('parseMarkdownTable handles table with empty cells', t => {
	const table = `| Col1 | Col2 |
|------|------|
| Text |      |
|      | Text |
`;
	const result = parseMarkdownTable(table, mockColors);
	t.true(result.includes('Col1'));
	t.true(result.includes('Col2'));
	t.true(result.includes('Text'));
});

test('parseMarkdownTable normalizes column count', t => {
	const table = `| A | B |
|---|---|
| 1 | 2 |
| 3 |
`;
	const result = parseMarkdownTable(table, mockColors);
	// Should handle the missing cell gracefully
	t.true(result.includes('A'));
	t.true(result.includes('B'));
	t.true(result.includes('1'));
	t.true(result.includes('3'));
});

test('parseMarkdownTable handles markdown formatting in cells', t => {
	const table = `| Command | Description |
|---------|-------------|
| \`npm run build\` | Compile TypeScript |
| **Important** | Do this first |
| [Link](url) | External reference |
`;
	const result = parseMarkdownTable(table, mockColors);
	// Should strip markdown for proper alignment
	t.true(result.includes('Command'));
	t.true(result.includes('Description'));
	t.true(result.includes('npm run build'));
	t.true(result.includes('Important'));
	t.true(result.includes('Link'));
	// Should have proper table structure
	t.true(result.includes('│'));
	t.true(result.includes('─'));
});

// ============================================================================
// Markdown Parsing Tests
// ============================================================================

test('parseMarkdown handles inline code', t => {
	const text = 'Use `const` for constants';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('const'));
	// Should still contain the word even if styled
	t.true(result.includes('for constants'));
});

test('parseMarkdown handles bold text', t => {
	const text = 'This is **bold** text';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('bold'));
	t.true(result.includes('This is'));
});

test('parseMarkdown handles italic text', t => {
	const text = 'This is *italic* text';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('italic'));
	t.true(result.includes('text'));
});

test('parseMarkdown handles headings', t => {
	const text = '# Main Heading\n## Subheading';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('Main Heading'));
	t.true(result.includes('Subheading'));
});

test('parseMarkdown handles links', t => {
	const text = 'Check [this link](https://example.com)';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('this link'));
	t.true(result.includes('https://example.com'));
});

test('parseMarkdown handles blockquotes', t => {
	const text = '> This is a quote\n> Another line';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('This is a quote'));
	t.true(result.includes('Another line'));
});

test('parseMarkdown handles unordered lists', t => {
	const text = '- Item 1\n- Item 2\n* Item 3';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('Item 1'));
	t.true(result.includes('Item 2'));
	t.true(result.includes('Item 3'));
	// Should convert to bullets
	t.true(result.includes('•'));
});

test('parseMarkdown handles ordered lists', t => {
	const text = '1. First item\n2. Second item';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('First item'));
	t.true(result.includes('Second item'));
});

test('parseMarkdown decodes HTML entities', t => {
	const text = 'Price: &euro;100&nbsp;only';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('€'));
	t.true(result.includes('100'));
	t.true(result.includes('only'));
	t.false(result.includes('&euro;'));
	t.false(result.includes('&nbsp;'));
});

test('parseMarkdown handles tables', t => {
	const text = `
Here is a table:

| Name | Age |
|------|-----|
| John | 30  |
| Jane | 25  |

That was the table.
`;
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('Name'));
	t.true(result.includes('Age'));
	t.true(result.includes('John'));
	t.true(result.includes('Jane'));
	t.true(result.includes('│'));
});

test('parseMarkdown handles mixed markdown features', t => {
	const text = `
# Title

This has **bold** and *italic* text.

- List item 1
- List item 2

\`code here\`

> A quote

Price: &euro;50
`;
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('Title'));
	t.true(result.includes('bold'));
	t.true(result.includes('italic'));
	t.true(result.includes('List item 1'));
	t.true(result.includes('code here'));
	t.true(result.includes('A quote'));
	t.true(result.includes('€'));
	t.false(result.includes('&euro;'));
});

test('parseMarkdown handles plain text without markdown', t => {
	const text = 'Just plain text with no special formatting';
	const result = parseMarkdown(text, mockColors);
	t.is(result, text);
});

test('parseMarkdown handles empty string', t => {
	const result = parseMarkdown('', mockColors);
	t.is(result, '');
});

test('parseMarkdown handles code blocks with language', t => {
	const text = '```javascript\nconst x = 5;\n```';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('const'));
	t.true(result.includes('x'));
});

test('parseMarkdown handles code blocks without language', t => {
	const text = '```\nplain code\n```';
	const result = parseMarkdown(text, mockColors);
	t.true(result.includes('plain code'));
});
