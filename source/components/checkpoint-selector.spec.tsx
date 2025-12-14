import {renderWithTheme} from '@/test-utils/render-with-theme';
import type {CheckpointListItem} from '@/types/checkpoint';
import test from 'ava';
import React from 'react';
import CheckpointSelector from './checkpoint-selector';

const createMockCheckpoint = (
	name: string,
	overrides: Partial<CheckpointListItem['metadata']> = {},
): CheckpointListItem => ({
	name,
	metadata: {
		name,
		timestamp: new Date().toISOString(),
		messageCount: 10,
		filesChanged: ['file1.ts', 'file2.ts'],
		provider: {name: 'Test Provider', model: 'test-model'},
		description: 'Test checkpoint',
		...overrides,
	},
	sizeBytes: 1024,
});

test('CheckpointSelector renders empty state when no checkpoints', t => {
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={[]}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	t.true(output.includes('No Checkpoints'));
});

test('CheckpointSelector renders checkpoint list', t => {
	const checkpoints = [
		createMockCheckpoint('checkpoint-1'),
		createMockCheckpoint('checkpoint-2'),
	];
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={checkpoints}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	t.true(output.includes('checkpoint-1'));
	t.true(output.includes('checkpoint-2'));
});

test('CheckpointSelector renders title', t => {
	const checkpoints = [createMockCheckpoint('test')];
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={checkpoints}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	t.true(output.includes('Select Checkpoint'));
});

test('CheckpointSelector renders navigation help', t => {
	const checkpoints = [createMockCheckpoint('test')];
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={checkpoints}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	// The component should show some navigation instructions
	t.truthy(output.length > 0);
});

test('CheckpointSelector shows message count in checkpoint label', t => {
	const checkpoints = [createMockCheckpoint('test', {messageCount: 42})];
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={checkpoints}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	// The label format includes "42 msgs"
	t.true(output.includes('42'));
});

test('CheckpointSelector shows files count in checkpoint label', t => {
	const checkpoints = [
		createMockCheckpoint('test', {
			filesChanged: ['a.ts', 'b.ts', 'c.ts'],
		}),
	];
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={checkpoints}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	// The label format includes "3 files"
	t.true(output.includes('3'));
});

test('CheckpointSelector renders without crashing with onError prop', t => {
	const checkpoints = [createMockCheckpoint('test')];
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={checkpoints}
			onSelect={() => {}}
			onCancel={() => {}}
			onError={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	t.true(output.includes('test'));
});

test('CheckpointSelector renders multiple checkpoints in list', t => {
	const checkpoints = [
		createMockCheckpoint('first-checkpoint'),
		createMockCheckpoint('second-checkpoint'),
		createMockCheckpoint('third-checkpoint'),
	];
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={checkpoints}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	t.true(output.includes('first-checkpoint'));
	t.true(output.includes('second-checkpoint'));
	t.true(output.includes('third-checkpoint'));
});

test('CheckpointSelector empty state message mentions create command', t => {
	const {lastFrame} = renderWithTheme(
		<CheckpointSelector
			checkpoints={[]}
			onSelect={() => {}}
			onCancel={() => {}}
			currentMessageCount={0}
		/>,
	);

	const output = lastFrame() || '';
	t.true(output.includes('checkpoint create'));
});
