import test from 'ava';
import {render} from 'ink-testing-library';
import React from 'react';
import SuccessMessage from './success-message';

test('SuccessMessage renders without crashing', t => {
	t.notThrows(() => {
		render(<SuccessMessage message="Test message" />);
	});
});

test('SuccessMessage renders with hideBox option', t => {
	t.notThrows(() => {
		render(<SuccessMessage message="Test message" hideBox={true} />);
	});
});

test('SuccessMessage renders with hideTitle option', t => {
	t.notThrows(() => {
		render(<SuccessMessage message="Test message" hideTitle={true} />);
	});
});

test('SuccessMessage renders with both hideBox and hideTitle', t => {
	t.notThrows(() => {
		render(<SuccessMessage message="Test message" hideBox={true} hideTitle={true} />);
	});
});

test('SuccessMessage renders with empty message', t => {
	t.notThrows(() => {
		render(<SuccessMessage message="" />);
	});
});

test('SuccessMessage component can be unmounted', t => {
	const {unmount} = render(<SuccessMessage message="Test message" />);

	t.notThrows(() => {
		unmount();
	});
});

test('SuccessMessage re-renders without crashing', t => {
	const {rerender} = render(<SuccessMessage message="First message" />);

	t.notThrows(() => {
		rerender(<SuccessMessage message="Second message" />);
	});
});
