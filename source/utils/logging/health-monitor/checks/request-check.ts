/**
 * Request tracking health check
 */

import {globalRequestTracker} from '../../request-tracker.js';
import type {HealthCheck, HealthCheckConfig} from '../types.js';

/**
 * Calculate score based on status and value
 */
function calculateScore(
	status: 'pass' | 'fail' | 'warn',
	value: number,
	warningThreshold: number,
	criticalThreshold: number,
): number {
	if (status === 'fail') return 0;
	if (status === 'pass') return 100;
	if (status === 'warn') {
		// Calculate score based on how far from critical threshold
		const range = criticalThreshold - warningThreshold;
		const distance = criticalThreshold - value;
		return Math.max(50, Math.min(80, 50 + (distance / range) * 30));
	}
	return 50; // default for unknown status
}

/**
 * Check request tracking health
 */
export function checkRequestTracking(config: HealthCheckConfig): HealthCheck {
	const startTime = performance.now();
	const stats = globalRequestTracker.getStats();
	const thresholds = config.thresholds.requests;

	let status: 'pass' | 'fail' | 'warn' = 'pass';
	let message = 'Request tracking is healthy';
	const details = {
		totalRequests: stats.totalRequests,
		averageDuration: Math.round(stats.averageDuration),
		errorRate: Math.round(stats.errorRate * 10000) / 100, // percentage with 2 decimals
		activeRequests: globalRequestTracker.getActiveRequests().length,
	};

	if (stats.errorRate > thresholds.errorRateCritical) {
		status = 'fail';
		message = 'Request error rate is critically high';
	} else if (stats.averageDuration > thresholds.durationCritical) {
		status = 'fail';
		message = 'Request duration is critically high';
	} else if (stats.errorRate > thresholds.errorRateWarning) {
		status = 'warn';
		message = 'Request error rate is elevated';
	} else if (stats.averageDuration > thresholds.durationWarning) {
		status = 'warn';
		message = 'Request duration is elevated';
	}

	return {
		name: 'request-tracking',
		status,
		score: calculateScore(
			status,
			stats.errorRate,
			thresholds.errorRateWarning,
			thresholds.errorRateCritical,
		),
		duration: performance.now() - startTime,
		message,
		details,
		threshold: {
			warning: thresholds.errorRateWarning,
			critical: thresholds.errorRateCritical,
		},
	};
}
