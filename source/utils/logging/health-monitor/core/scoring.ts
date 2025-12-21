/**
 * Health scoring and recommendation logic
 */

import type {HealthCheck} from '../types.js';

/**
 * Calculate score based on status and value
 */
export function calculateScore(
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
 * Generate recommendations based on check results
 */
export function generateRecommendations(
	checks: HealthCheck[],
	status: 'healthy' | 'degraded' | 'unhealthy',
): string[] {
	const recommendations: string[] = [];

	for (const check of checks) {
		switch (check.name) {
			case 'memory-usage':
				if (check.status === 'fail') {
					recommendations.push(
						'Immediate memory optimization required - consider increasing memory limits or fixing memory leaks',
					);
				} else if (check.status === 'warn') {
					recommendations.push(
						'Monitor memory usage and optimize memory-intensive operations',
					);
				}
				break;

			case 'logging-system':
				if (check.status === 'fail') {
					recommendations.push(
						'Fix logging system initialization - check logger configuration',
					);
				}
				break;

			case 'request-tracking':
				if (check.status === 'fail') {
					recommendations.push(
						'Address high request error rates or slow request processing',
					);
				} else if (check.status === 'warn') {
					recommendations.push(
						'Monitor request performance and optimize slow endpoints',
					);
				}
				break;

			case 'performance-monitoring':
				if (check.status === 'warn') {
					recommendations.push(
						'Ensure performance monitoring is integrated into critical operations',
					);
				}
				break;
		}
	}

	if (status === 'unhealthy') {
		recommendations.push(
			'System health is critical - immediate attention required',
		);
	} else if (status === 'degraded') {
		recommendations.push(
			'System performance is degraded - review recommendations and optimize',
		);
	}

	return recommendations;
}
