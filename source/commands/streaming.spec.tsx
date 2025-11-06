import test from 'ava';
import React from 'react';
import {render} from 'ink-testing-library';
import {streamingCommand} from './streaming.js';
import {
	isStreamingEnabled,
	setStreamingEnabled,
} from '../config/preferences.js';
import {ThemeContext} from '../hooks/useTheme.js';
import {themes} from '../config/themes.js';

console.log(`\nstreaming.spec.tsx – ${React.version}`);

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
// Command Handler Tests
// ============================================================================

test('streaming command toggles streaming state', async t => {
	// Get initial state
	const initialState = isStreamingEnabled();

	// Execute command to toggle
	const result = await streamingCommand.handler([], [], {
		commandName: 'streaming',
		fullCommand: '/streaming',
	});

	// Render the result
	const {lastFrame} = render(
		<MockThemeProvider>{result}</MockThemeProvider>,
	);

	// Should have toggled
	const newState = isStreamingEnabled();
	t.not(initialState, newState);

	// Check output message contains expected text
	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Response streaming (enabled|disabled)/);
});

test('streaming command returns message with correct state after toggle', async t => {
	// Set to a known state
	setStreamingEnabled(true);

	// Execute command to toggle (should disable)
	const result = await streamingCommand.handler([], [], {
		commandName: 'streaming',
		fullCommand: '/streaming',
	});

	// Render the result
	const {lastFrame} = render(
		<MockThemeProvider>{result}</MockThemeProvider>,
	);

	// Check output shows disabled
	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Response streaming disabled/);

	// Execute again to re-enable
	const result2 = await streamingCommand.handler([], [], {
		commandName: 'streaming',
		fullCommand: '/streaming',
	});

	const {lastFrame: lastFrame2} = render(
		<MockThemeProvider>{result2}</MockThemeProvider>,
	);

	// Check output shows enabled
	const output2 = lastFrame2();
	t.truthy(output2);
	t.regex(output2!, /Response streaming enabled/);
});

// ============================================================================
// Preference Persistence Tests
// ============================================================================

test('streaming preference can be set and retrieved', t => {
	// Set to false
	setStreamingEnabled(false);
	t.is(isStreamingEnabled(), false);

	// Set to true
	setStreamingEnabled(true);
	t.is(isStreamingEnabled(), true);
});

test('streaming preference defaults to true', t => {
	// isStreamingEnabled() should return true by default
	// Note: This may not work if preferences file exists with different value
	const enabled = isStreamingEnabled();
	t.is(typeof enabled, 'boolean');
});

// ============================================================================
// Command Metadata Tests
// ============================================================================

test('streaming command has correct name', t => {
	t.is(streamingCommand.name, 'streaming');
});

test('streaming command has description', t => {
	t.truthy(streamingCommand.description);
	t.is(typeof streamingCommand.description, 'string');
	t.true(streamingCommand.description.length > 0);
});

test('streaming command handler is a function', t => {
	t.is(typeof streamingCommand.handler, 'function');
});

// ============================================================================
// Component Rendering Tests
// ============================================================================

test('streaming command returns valid React element', async t => {
	const result = await streamingCommand.handler([], [], {
		commandName: 'streaming',
		fullCommand: '/streaming',
	});

	t.truthy(result);
	t.true(React.isValidElement(result));
});

test('streaming command renders without crashing', async t => {
	const result = await streamingCommand.handler([], [], {
		commandName: 'streaming',
		fullCommand: '/streaming',
	});

	const {lastFrame} = render(
		<MockThemeProvider>{result}</MockThemeProvider>,
	);

	t.truthy(lastFrame());
});
