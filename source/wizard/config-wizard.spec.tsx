import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import {ConfigWizard} from './config-wizard.js';

// ============================================================================
// Tests for ConfigWizard Component Rendering
// ============================================================================

console.log(`\nconfig-wizard.spec.tsx – ${React.version}`);

test('ConfigWizard renders with title', t => {
	const {lastFrame} = render(
		<ConfigWizard projectDir="/tmp/test-project" onComplete={() => {}} />,
	);

	const output = lastFrame();
	t.truthy(output);
	t.regex(output!, /Configuration Wizard/);
});

test('ConfigWizard shows initial location step', t => {
	const {lastFrame} = render(
		<ConfigWizard projectDir="/tmp/test-project" onComplete={() => {}} />,
	);

	const output = lastFrame();
	t.regex(output!, /Where would you like to create your configuration/);
});

test('ConfigWizard shows keyboard shortcuts', t => {
	const {lastFrame} = render(
		<ConfigWizard projectDir="/tmp/test-project" onComplete={() => {}} />,
	);

	const output = lastFrame();
	t.regex(output!, /Esc.*Exit wizard/);
	t.regex(output!, /Shift\+Tab.*Go back/);
});

test('ConfigWizard shows location options', t => {
	const {lastFrame} = render(
		<ConfigWizard projectDir="/tmp/test-project" onComplete={() => {}} />,
	);

	const output = lastFrame();
	t.regex(output!, /Current project directory/);
	t.regex(output!, /Global user config/);
});

test('ConfigWizard renders without crashing when onCancel is provided', t => {
	let cancelCalled = false;

	const {lastFrame} = render(
		<ConfigWizard
			projectDir="/tmp/test-project"
			onComplete={() => {}}
			onCancel={() => {
				cancelCalled = true;
			}}
		/>,
	);

	t.truthy(lastFrame());
	t.false(cancelCalled); // Should not be called on render
});

test('ConfigWizard accepts projectDir prop', t => {
	const projectDir = '/custom/project/path';

	const {lastFrame} = render(
		<ConfigWizard projectDir={projectDir} onComplete={() => {}} />,
	);

	// Component should render without errors
	t.truthy(lastFrame());
});

test('ConfigWizard renders TitledBox with correct border', t => {
	const {lastFrame} = render(
		<ConfigWizard projectDir="/tmp/test-project" onComplete={() => {}} />,
	);

	const output = lastFrame();
	// Check for rounded border characters
	t.regex(output!, /╭/); // Top-left corner
	t.regex(output!, /╮/); // Top-right corner
	t.regex(output!, /╰/); // Bottom-left corner
	t.regex(output!, /╯/); // Bottom-right corner
});

test('ConfigWizard renders with correct initial state', t => {
	const {frames} = render(
		<ConfigWizard projectDir="/tmp/test-project" onComplete={() => {}} />,
	);

	// Should have rendered at least one frame
	t.true(frames.length > 0);

	// First frame should show location step
	const firstFrame = frames[0];
	t.regex(firstFrame, /Configuration Wizard/);
});
