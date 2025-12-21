/**
 * Logging check tests
 */

import test from 'ava';
import type {HealthCheckConfig} from '../types.js';
import {checkLoggingSystem} from './logging-check.js';

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

test('checkLoggingSystem returns health check result', t => {
	const config = createMockConfig();
	const result = checkLoggingSystem(config);

	t.is(result.name, 'logging-system');
	t.true(['pass', 'warn', 'fail'].includes(result.status));
	t.true(result.score >= 0 && result.score <= 100);
	t.true(result.duration >= 0);
	t.truthy(result.message);
	t.truthy(result.details);
});
