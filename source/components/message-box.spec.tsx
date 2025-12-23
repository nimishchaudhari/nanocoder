import test from 'ava';
import {render} from 'ink-testing-library';
import React from 'react';
import {themes} from '../config/themes';
import {ThemeContext} from '../hooks/useTheme';
import {
	ErrorMessage,
	InfoMessage,
	SuccessMessage,
	WarningMessage,
} from './message-box';

console.log(`\nmessage-box.spec.tsx – ${React.version}`);

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
// ErrorMessage Component Tests
// ============================================================================

test('ErrorMessage renders with message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<ErrorMessage message="Something went wrong" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Error/);
	t.regex(output!, /Something went wrong/);
});

test('ErrorMessage renders with hideTitle', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<ErrorMessage message="Error without title" hideTitle />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Error without title/);
	// Should still have border but no title
	t.regex(output!, /╭/); // Has border
});

test('ErrorMessage renders with hideBox', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<ErrorMessage message="Plain error text" hideBox />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Plain error text/);
	// Should not have border characters when hideBox is true
	t.notRegex(output!, /╭/);
});

test('ErrorMessage renders without crashing', t => {
	const {unmount} = render(
		<MockThemeProvider>
			<ErrorMessage message="Test" />
		</MockThemeProvider>,
	);

	t.notThrows(() => unmount());
});

// ============================================================================
// SuccessMessage Component Tests
// ============================================================================

test('SuccessMessage renders with message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<SuccessMessage message="Operation completed" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Success/);
	t.regex(output!, /Operation completed/);
});

test('SuccessMessage renders with hideTitle', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<SuccessMessage message="Success without title" hideTitle />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Success without title/);
	t.regex(output!, /╭/); // Has border
});

test('SuccessMessage renders with hideBox', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<SuccessMessage message="Plain success text" hideBox />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Plain success text/);
	t.notRegex(output!, /╭/);
});

test('SuccessMessage renders without crashing', t => {
	const {unmount} = render(
		<MockThemeProvider>
			<SuccessMessage message="Test" />
		</MockThemeProvider>,
	);

	t.notThrows(() => unmount());
});

// ============================================================================
// WarningMessage Component Tests
// ============================================================================

test('WarningMessage renders with message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<WarningMessage message="Proceed with caution" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Warning/);
	t.regex(output!, /Proceed with caution/);
});

test('WarningMessage renders with hideTitle', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<WarningMessage message="Warning without title" hideTitle />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Warning without title/);
	t.regex(output!, /╭/); // Has border
});

test('WarningMessage renders with hideBox', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<WarningMessage message="Plain warning text" hideBox />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Plain warning text/);
	t.notRegex(output!, /╭/);
});

test('WarningMessage renders without crashing', t => {
	const {unmount} = render(
		<MockThemeProvider>
			<WarningMessage message="Test" />
		</MockThemeProvider>,
	);

	t.notThrows(() => unmount());
});

// ============================================================================
// InfoMessage Component Tests
// ============================================================================

test('InfoMessage renders with message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<InfoMessage message="Here is some information" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Info/);
	t.regex(output!, /Here is some information/);
});

test('InfoMessage renders with hideTitle', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<InfoMessage message="Info without title" hideTitle />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Info without title/);
	t.regex(output!, /╭/); // Has border
});

test('InfoMessage renders with hideBox', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<InfoMessage message="Plain info text" hideBox />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Plain info text/);
	t.notRegex(output!, /╭/);
});

test('InfoMessage renders without crashing', t => {
	const {unmount} = render(
		<MockThemeProvider>
			<InfoMessage message="Test" />
		</MockThemeProvider>,
	);

	t.notThrows(() => unmount());
});

// ============================================================================
// Props Combination Tests
// ============================================================================

test('Message components accept all valid prop combinations', t => {
	const components = [
		{Component: ErrorMessage, name: 'ErrorMessage'},
		{Component: SuccessMessage, name: 'SuccessMessage'},
		{Component: WarningMessage, name: 'WarningMessage'},
		{Component: InfoMessage, name: 'InfoMessage'},
	];

	for (const {Component, name} of components) {
		// Default props
		t.notThrows(
			() => {
				render(
					<MockThemeProvider>
						<Component message="Test message" />
					</MockThemeProvider>,
				);
			},
			`${name} should render with default props`,
		);

		// With hideTitle
		t.notThrows(
			() => {
				render(
					<MockThemeProvider>
						<Component message="Test message" hideTitle />
					</MockThemeProvider>,
				);
			},
			`${name} should render with hideTitle`,
		);

		// With hideBox
		t.notThrows(
			() => {
				render(
					<MockThemeProvider>
						<Component message="Test message" hideBox />
					</MockThemeProvider>,
				);
			},
			`${name} should render with hideBox`,
		);

		// With both hideTitle and hideBox (hideBox takes precedence)
		t.notThrows(
			() => {
				render(
					<MockThemeProvider>
						<Component message="Test message" hideTitle hideBox />
					</MockThemeProvider>,
				);
			},
			`${name} should render with both hideTitle and hideBox`,
		);
	}
});

// ============================================================================
// Edge Cases
// ============================================================================

test('Message components handle empty message', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<ErrorMessage message="" />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Error/);
});

test('Message components handle long messages', t => {
	const longMessage =
		'This is a very long message that should still render correctly even though it contains many words and might need to wrap to multiple lines in the terminal output.';

	const {lastFrame} = render(
		<MockThemeProvider>
			<InfoMessage message={longMessage} />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /This is a very long message/);
});

test('Message components handle special characters', t => {
	const specialMessage = 'Error: File "test.txt" not found! <path/to/file>';

	const {lastFrame} = render(
		<MockThemeProvider>
			<ErrorMessage message={specialMessage} />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Error/);
	t.regex(output!, /File/);
	t.regex(output!, /test\.txt/);
});

test('Message components handle newlines in message', t => {
	const multilineMessage = 'Line 1\nLine 2\nLine 3';

	const {lastFrame} = render(
		<MockThemeProvider>
			<WarningMessage message={multilineMessage} />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Line 1/);
	t.regex(output!, /Line 2/);
	t.regex(output!, /Line 3/);
});

// ============================================================================
// Visual Consistency Tests
// ============================================================================

test('All message types render with TitledBox by default', t => {
	const components = [
		{Component: ErrorMessage, title: 'Error'},
		{Component: SuccessMessage, title: 'Success'},
		{Component: WarningMessage, title: 'Warning'},
		{Component: InfoMessage, title: 'Info'},
	];

	for (const {Component, title} of components) {
		const {lastFrame} = render(
			<MockThemeProvider>
				<Component message="Test" />
			</MockThemeProvider>,
		);

		const output = lastFrame();
		t.regex(output!, new RegExp(title), `${title} message should show title`);
		t.regex(output!, /╭/, `${title} message should have top border`);
		t.regex(output!, /╰/, `${title} message should have bottom border`);
	}
});

test('hideTitle removes title but keeps border', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<ErrorMessage message="No title here" hideTitle />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	// Should have border
	t.regex(output!, /╭/);
	t.regex(output!, /╰/);
	// Content should be visible
	t.regex(output!, /No title here/);
});

test('hideBox renders plain text without border', t => {
	const {lastFrame} = render(
		<MockThemeProvider>
			<SuccessMessage message="Plain text only" hideBox />
		</MockThemeProvider>,
	);

	const output = lastFrame();
	t.truthy(output);
	// Should not have any border characters
	t.notRegex(output!, /╭/);
	t.notRegex(output!, /╮/);
	t.notRegex(output!, /╰/);
	t.notRegex(output!, /╯/);
	t.notRegex(output!, /│/);
	// Content should still be visible
	t.regex(output!, /Plain text only/);
});
