/**
 * Global instances for health monitoring
 */

import {globalHealthMonitor} from './core/health-monitor.js';

/**
 * Quick health check functions
 */
export const healthChecks = {
	/**
	 * Quick health check - returns status only
	 */
	quick: async (): Promise<'healthy' | 'degraded' | 'unhealthy'> => {
		const result = await globalHealthMonitor.runHealthCheck();
		return result.status;
	},

	/**
	 * Full health check with details
	 */
	full: () => globalHealthMonitor.runHealthCheck(),

	/**
	 * System metrics snapshot
	 */
	metrics: () => globalHealthMonitor.getSystemMetrics(),

	/**
	 * Check if system is ready
	 */
	ready: async (): Promise<boolean> => {
		const result = await globalHealthMonitor.runHealthCheck();
		return result.status === 'healthy';
	},

	/**
	 * Check if system is alive (basic check)
	 */
	alive: (): boolean => {
		try {
			const metrics = globalHealthMonitor.getSystemMetrics();
			return metrics.process.uptime > 0;
		} catch {
			return false;
		}
	},
};
