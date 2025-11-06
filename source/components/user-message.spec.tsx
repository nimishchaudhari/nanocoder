import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import UserMessage from './user-message';
import {ThemeContext} from '../hooks/useTheme';
import {themes} from '../config/themes';

console.log(`\nuser-message.spec.tsx – ${React.version}`);

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

test('UserMessage renders with basic message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Hello world" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /You:/);
	t.regex(output!, /Hello world/);
});

test('UserMessage renders without file placeholders', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="This is a normal message" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /This is a normal message/);
});

test('UserMessage renders with file placeholder', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Check [@src/app.tsx] for details" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@src\/app\.tsx\]/);
	t.regex(output!, /Check/);
	t.regex(output!, /for details/);
});

test('UserMessage renders with file placeholder with line range', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Look at [@file.ts:10-20] please" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@file\.ts:10-20\]/);
});

test('UserMessage renders with file placeholder with single line', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Check [@utils.ts:42] specifically" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@utils\.ts:42\]/);
});

test('UserMessage renders with multiple file placeholders', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Compare [@src/app.tsx] with [@src/index.tsx]" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@src\/app\.tsx\]/);
	t.regex(output!, /\[@src\/index\.tsx\]/);
	t.regex(output!, /Compare/);
	t.regex(output!, /with/);
});

test('UserMessage renders multi-line message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Line 1\nLine 2\nLine 3" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Line 1/);
	t.regex(output!, /Line 2/);
	t.regex(output!, /Line 3/);
});

test('UserMessage renders multi-line message with file placeholders', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Check these files:\n[@src/app.tsx]\n[@src/utils.ts]" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Check these files:/);
	t.regex(output!, /\[@src\/app\.tsx\]/);
	t.regex(output!, /\[@src\/utils\.ts\]/);
});

test('UserMessage renders file placeholder at start of message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="[@package.json] shows dependencies" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@package\.json\]/);
});

test('UserMessage renders file placeholder at end of message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Check the config in [@tsconfig.json]" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@tsconfig\.json\]/);
});

test('UserMessage renders with empty message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /You:/);
});

test('UserMessage handles file placeholder with special characters in path', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Check [@src/my-file.spec.ts:100-200]" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@src\/my-file\.spec\.ts:100-200\]/);
});

test('UserMessage handles multiple placeholders on same line', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Compare [@a.ts] and [@b.ts] and [@c.ts]" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /\[@a\.ts\]/);
	t.regex(output!, /\[@b\.ts\]/);
	t.regex(output!, /\[@c\.ts\]/);
});

test('UserMessage does not render @ symbols that are not placeholders', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Email me at user@example.com" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /user@example\.com/);
	// Should NOT have placeholder styling since it's not in [@...] format
});

test('UserMessage renders without crashing', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<UserMessage message="Test" />
		</MockThemeProvider>,
	);

	t.truthy(lastFrame());
});
