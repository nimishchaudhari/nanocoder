/**
 * Health check runner tests
 */

import test from 'ava';
import type {HealthCheckConfig} from '../types.js';
import {runHealthCheck} from './health-check-runner.js';

const createMockConfig = (): HealthCheckConfig => ({
	enabled: true,
	interval: 5000,
	timeout: 1000,
	thresholds: {
		memory: {
			heapUsageWarning: 0.8,
			heapUsageCritical: 0.9,
			externalWarning: 256,
			externalCritical: 512,
		},
		performance: {
			averageDurationWarning: 1000,
			averageDurationCritical: 5000,
			errorRateWarning: 0.05,
			errorRateCritical: 0.1,
		},
		logging: {
			logRateWarning: 100,
			logRateCritical: 500,
			errorRateWarning: 0.02,
			errorRateCritical: 0.05,
		},
		requests: {
			durationWarning: 1000,
			durationCritical: 5000,
			errorRateWarning: 0.05,
			errorRateCritical: 0.1,
		},
	},
	alerts: {
		enabled: true,
		channels: ['console'],
		cooldown: 60000,
	},
});

test('runHealthCheck returns health check result', async t => {
	const config = createMockConfig();
	const result = await runHealthCheck(config, 'test-correlation-id');

	t.true(['healthy', 'degraded', 'unhealthy'].includes(result.status));
	t.true(result.score >= 0 && result.score <= 100);
	t.true(Array.isArray(result.checks));
	t.true(result.checks.length > 0);
	t.truthy(result.timestamp);
	t.is(result.correlationId, 'test-correlation-id');
	t.truthy(result.summary);
	t.true(Array.isArray(result.recommendations));
});

test('runHealthCheck includes all expected checks', async t => {
	const config = createMockConfig();
	const result = await runHealthCheck(config, 'test-correlation-id');

	const checkNames = result.checks.map(c => c.name);
	t.true(checkNames.includes('memory-usage'));
	t.true(checkNames.includes('logging-system'));
	t.true(checkNames.includes('request-tracking'));
	t.true(checkNames.includes('performance-monitoring'));
	t.true(checkNames.includes('configuration-system'));
});
