/**
 * Main logging interface with facade pattern for backward compatibility
 * Uses dependency injection pattern to avoid circular dependencies
 */

import type {Logger, LoggerConfig, LogLevel} from './types.js';
import {loggerProvider} from './logger-provider.js';

/**
 * Initialize the logger with configuration
 */
export function initializeLogger(config?: Partial<LoggerConfig>): Logger {
	return loggerProvider.initializeLogger(config);
}

/**
 * Get the current logger instance
 */
export function getLogger(): Logger {
	return loggerProvider.getLogger();
}

/**
 * Get the current configuration
 */
export function getLoggerConfig(): LoggerConfig | null {
	return loggerProvider.getLoggerConfig();
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(bindings: Record<string, any>): Logger {
	return loggerProvider.createChildLogger(bindings);
}

/**
 * Check if a log level is enabled
 */
export function isLevelEnabled(level: LogLevel): boolean {
	return loggerProvider.isLevelEnabled(level);
}

/**
 * Convenience methods that match console.log API
 */
export const log = {
	fatal: (msg: string, ...args: any[]) => getLogger().fatal(msg, ...args),
	error: (msg: string, ...args: any[]) => getLogger().error(msg, ...args),
	warn: (msg: string, ...args: any[]) => getLogger().warn(msg, ...args),
	info: (msg: string, ...args: any[]) => getLogger().info(msg, ...args),
	http: (msg: string, ...args: any[]) => getLogger().http(msg, ...args),
	debug: (msg: string, ...args: any[]) => getLogger().debug(msg, ...args),
	trace: (msg: string, ...args: any[]) => getLogger().trace(msg, ...args),
};

/**
 * Backward compatibility facade - wraps console during transition
 * This will be gradually replaced with structured logging
 */
export const console = {
	log: (...args: any[]) => {
		// For now, use info level for console.log
		log.info(args.join(' '));

		// TODO: Add deprecation warning in development mode
		if (process.env.NODE_ENV === 'development') {
			process.stderr.write(
				'\x1b[33m[DEPRECATED]\x1b[0m console.log() is deprecated. Use logger.info() instead.\n',
			);
		}
	},
	error: (...args: any[]) => {
		log.error(args.join(' '));
	},
	warn: (...args: any[]) => {
		log.warn(args.join(' '));
	},
	info: (...args: any[]) => {
		log.info(args.join(' '));
	},
	debug: (...args: any[]) => {
		log.debug(args.join(' '));
	},
};

/**
 * Flush any pending logs
 */
export async function flush(): Promise<void> {
	await loggerProvider.flush();
}

/**
 * End the logger and close all streams
 */
export async function end(): Promise<void> {
	await loggerProvider.end();
}

// Setup graceful shutdown handlers
process.on('SIGTERM', () => {
	void (async () => {
		log.info('\n[LOGGER] Received SIGTERM, flushing logs...');
		await flush();
		await end();
		log.info('[LOGGER] Graceful shutdown completed');
	})();
});

process.on('SIGINT', () => {
	void (async () => {
		log.info('\n[LOGGER] Received SIGINT, flushing logs...');
		await flush();
		await end();
		log.info('[LOGGER] Graceful shutdown completed');
	})();
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', err => {
	void (async () => {
		const logger = getLogger();
		logger.fatal({err}, 'Uncaught exception');
		await flush();
		process.exit(1);
	})();
});

process.on('unhandledRejection', (reason, promise) => {
	void (async () => {
		const logger = getLogger();
		logger.fatal({reason, promise}, 'Unhandled promise rejection');
		await flush();
		process.exit(1);
	})();
});

// Re-export all modules for external use
export type {Logger, LoggerConfig, LogLevel} from './types.js';

// Export for testing purposes only
export {
	/** @internal */
	createCorrelationFromHeaders,
	/** @internal */
	extractCorrelationId,
	/** @internal */
	formatCorrelationForLog,
	/** @internal */
	correlationMiddleware,
} from './correlation.js';

// Export correlation utilities
export {
	generateCorrelationId,
	withNewCorrelationContext,
	getCorrelationId,
} from './correlation.js';

// Export performance utilities
export {
	startMetrics,
	endMetrics,
	calculateMemoryDelta,
	formatMemoryUsage,
	/** @internal */
	formatBytes,
	/** @internal */
	globalPerformanceMonitor,
} from './performance.js';

// Export configuration utilities
export {
	/** @internal */
	getDefaultLogDirectory,
	/** @internal */
	getEnvironmentConfig,
	/** @internal */
	validateLogLevel,
	/** @internal */
	normalizeLogLevel,
	/** @internal */
	createConfig,
} from './config.js';

// Export transport utilities (used internally only)
// No exports from transports.js as they are only used internally

// Console facade exports (only used in tests)
// No exports from console-facade.js as they are only used internally and in tests

// Export request tracking utilities (specific instances used by other modules)
export {healthChecks} from './health-monitor.js';

// Internal exports that knip should ignore
/** @internal */
export {httpTracker} from './request-tracker.js';

/** @internal */
export {aiTracker} from './request-tracker.js';

/** @internal */
export {mcpTracker} from './request-tracker.js';

export {globalRequestTracker} from './request-tracker.js';

// Export log storage for tests
export {globalLogStorage} from './log-query.js';

// RequestTracker is only used internally as default export
// No export needed here

// Log query exports (not used in main codebase)
// No exports from log-query.js as they are not used

// Export health monitoring
export {
	type HealthCheckResult,
	type HealthCheck,
	type SystemMetrics,
	type HealthCheckConfig,
} from './health-monitor.js';

// Internal exports that knip should ignore
/** @internal */
export {globalHealthMonitor} from './health-monitor.js';

/** @internal */
export {initializeHealthMonitoring} from './health-monitor.js';

/** @internal */
export {healthCheckMiddleware} from './health-monitor.js';
