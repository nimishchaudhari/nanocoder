/**
 * Type definitions for health monitoring system
 */

/**
 * Health check result interface
 */
export interface HealthCheckResult {
	status: 'healthy' | 'degraded' | 'unhealthy';
	score: number; // 0-100
	checks: HealthCheck[];
	timestamp: string;
	duration: number;
	correlationId: string;
	summary: {
		total: number;
		passed: number;
		failed: number;
		warnings: number;
	};
	recommendations: string[];
}

/**
 * Individual health check interface
 */
export interface HealthCheck {
	name: string;
	status: 'pass' | 'fail' | 'warn';
	score: number; // 0-100
	duration: number;
	message?: string;
	details?: Record<string, unknown>;
	error?: string;
	threshold?: {
		warning: number;
		critical: number;
	};
}

/**
 * System metrics interface
 */
export interface SystemMetrics {
	timestamp: string;
	memory: {
		heapUsed: number;
		heapTotal: number;
		external: number;
		rss: number;
		heapUsagePercent: number;
	};
	cpu: {
		usage: number;
		loadAverage: number[];
	};
	process: {
		uptime: number;
		pid: number;
		nodeVersion: string;
		platform: string;
		arch: string;
	};
	logging: {
		totalLogEntries: number;
		logRate: number; // entries per second
		errorRate: number; // errors per second
		averageLogSize: number;
		oldestLogEntry?: string;
		newestLogEntry?: string;
	};
	requests: {
		totalRequests: number;
		activeRequests: number;
		averageDuration: number;
		errorRate: number;
		requestsPerSecond: number;
	};
	performance: {
		operationCount: number;
		averageDuration: number;
		slowOperations: number;
		memoryIntensiveOps: number;
	};
}

/**
 * Health check configuration
 */
export interface HealthCheckConfig {
	enabled: boolean;
	interval: number; // ms between checks
	timeout: number; // ms per check
	thresholds: {
		memory: {
			heapUsageWarning: number; // percentage
			heapUsageCritical: number;
			externalWarning: number; // MB
			externalCritical: number;
		};
		performance: {
			averageDurationWarning: number; // ms
			averageDurationCritical: number;
			errorRateWarning: number; // percentage
			errorRateCritical: number;
		};
		logging: {
			logRateWarning: number; // logs per second
			logRateCritical: number;
			errorRateWarning: number; // percentage
			errorRateCritical: number;
		};
		requests: {
			durationWarning: number; // ms
			durationCritical: number;
			errorRateWarning: number; // percentage
			errorRateCritical: number;
		};
	};
	alerts: {
		enabled: boolean;
		channels: ('console' | 'file' | 'webhook')[];
		webhookUrl?: string;
		cooldown: number; // ms between alerts
	};
}
