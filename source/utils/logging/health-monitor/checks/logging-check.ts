/**
 * Logging system health check
 */

import {globalLogStorage} from '../../log-query.js';
import {loggerProvider} from '../../logger-provider.js';
import type {HealthCheck, HealthCheckConfig} from '../types.js';

const getLogger = () => loggerProvider.getLogger();

/**
 * Calculate score based on status
 */
function calculateScore(status: 'pass' | 'fail' | 'warn'): number {
	if (status === 'fail') return 0;
	if (status === 'pass') return 100;
	if (status === 'warn') return 50;
	return 50; // default for unknown status
}

/**
 * Check logging system health
 */
export function checkLoggingSystem(config: HealthCheckConfig): HealthCheck {
	const startTime = performance.now();
	const logCount = globalLogStorage.getEntryCount();
	const thresholds = config.thresholds.logging;

	// Check if logging system is functional
	let status: 'pass' | 'fail' | 'warn' = 'pass';
	let message = 'Logging system is healthy';
	const details = {
		totalEntries: logCount,
		isConfigReloaderActive: false,
		hasLogger: !!getLogger(),
	};

	if (!getLogger()) {
		status = 'fail';
		message = 'Logger is not initialized';
	} else if (logCount === 0 && process.uptime() > 60) {
		status = 'warn';
		message = 'No log entries detected';
	}

	return {
		name: 'logging-system',
		status,
		score: calculateScore(status),
		duration: performance.now() - startTime,
		message,
		details,
		threshold: {
			warning: thresholds.logRateWarning,
			critical: thresholds.logRateCritical,
		},
	};
}
