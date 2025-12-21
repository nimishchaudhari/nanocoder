/**
 * Performance monitoring health check
 */

import {globalPerformanceMonitor} from '../../performance.js';
import type {HealthCheck, HealthCheckConfig} from '../types.js';

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
 * Check performance monitoring health
 */
export function checkPerformanceMonitoring(
	config: HealthCheckConfig,
): HealthCheck {
	const startTime = performance.now();
	const stats = globalPerformanceMonitor.getAllStats();
	const thresholds = config.thresholds.performance;

	let status: 'pass' | 'fail' | 'warn' = 'pass';
	let message = 'Performance monitoring is healthy';
	const details = {
		trackedOperations: Object.keys(stats).length,
		totalMeasurements: Object.values(stats).reduce(
			(sum, stat) => sum + (stat?.count || 0),
			0,
		),
	};

	// Check if performance monitoring is functional
	if (Object.keys(stats).length === 0 && process.uptime() > 60) {
		status = 'warn';
		message = 'No performance measurements detected';
	}

	return {
		name: 'performance-monitoring',
		status,
		score: calculateScore(status),
		duration: performance.now() - startTime,
		message,
		details,
		threshold: {
			warning: thresholds.averageDurationWarning,
			critical: thresholds.averageDurationCritical,
		},
	};
}
