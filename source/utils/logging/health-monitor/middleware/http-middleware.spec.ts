/**
 * HTTP middleware tests
 */

import test from 'ava';
import {healthCheckMiddleware} from './http-middleware.js';

const createMockHealthChecks = () => ({
	full: async () => ({
		status: 'healthy' as const,
		timestamp: new Date().toISOString(),
		score: 100,
		checks: [
			{
				name: 'test-check',
				status: 'pass' as const,
				score: 100,
			},
		],
	}),
	ready: async () => true,
	alive: () => true,
	metrics: () => ({test: 'metrics'}),
});

test('healthCheckMiddleware calls next for non-health paths', async t => {
	const middleware = healthCheckMiddleware(createMockHealthChecks());
	let nextCalled = false;

	const req = {path: '/api/test'};
	const res = {
		status: (code: number) => ({
			json: (_data: unknown) => {},
		}),
		json: (_data: unknown) => {},
	};
	const next = () => {
		nextCalled = true;
	};

	await middleware(req, res, next);
	t.true(nextCalled);
});

test('healthCheckMiddleware handles /health path', async t => {
	const middleware = healthCheckMiddleware(createMockHealthChecks());
	let responseSent = false;
	let statusCode = 0;

	const req = {path: '/health'};
	const res = {
		status: (code: number) => {
			statusCode = code;
			return {
				json: (_data: unknown) => {
					responseSent = true;
				},
			};
		},
		json: (_data: unknown) => {
			responseSent = true;
		},
	};
	const next = () => {};

	await middleware(req, res, next);
	t.true(responseSent);
	t.is(statusCode, 200);
});

test('healthCheckMiddleware handles /health/ready path', async t => {
	const middleware = healthCheckMiddleware(createMockHealthChecks());
	let responseSent = false;
	let statusCode = 0;

	const req = {path: '/health/ready'};
	const res = {
		status: (code: number) => {
			statusCode = code;
			return {
				json: (_data: unknown) => {
					responseSent = true;
				},
			};
		},
		json: (_data: unknown) => {
			responseSent = true;
		},
	};
	const next = () => {};

	await middleware(req, res, next);
	t.true(responseSent);
	t.is(statusCode, 200);
});

test('healthCheckMiddleware handles /health/live path', async t => {
	const middleware = healthCheckMiddleware(createMockHealthChecks());
	let responseSent = false;

	const req = {path: '/health/live'};
	const res = {
		status: (_code: number) => {
			return {
				json: (_data: unknown) => {
					responseSent = true;
				},
			};
		},
		json: (_data: unknown) => {
			responseSent = true;
		},
	};
	const next = () => {};

	await middleware(req, res, next);
	t.true(responseSent);
});

test('healthCheckMiddleware handles /metrics path', async t => {
	const middleware = healthCheckMiddleware(createMockHealthChecks());
	let responseSent = false;

	const req = {path: '/metrics'};
	const res = {
		status: (_code: number) => {
			return {
				json: (_data: unknown) => {
					responseSent = true;
				},
			};
		},
		json: (_data: unknown) => {
			responseSent = true;
		},
	};
	const next = () => {};

	await middleware(req, res, next);
	t.true(responseSent);
});
