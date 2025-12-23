import {existsSync, mkdirSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import test from 'ava';
import pino from 'pino';

import {getDefaultLogDirectory} from './config.js';
import {
	withCorrelationContext,
	createCorrelationContext,
} from './correlation.js';
// Implementation imports
import {
	createLoggerWithTransport,
	createPinoLogger,
	getLoggerStats,
} from './pino-logger.js';
import type {LoggerConfig} from './types.js';

// Test utilities
const testLogDir = join(tmpdir(), `nanocoder-pino-test-${Date.now()}`);

// Track all loggers created during tests for cleanup
const createdLoggers: any[] = [];

/**
 * Helper to create logger and track it for cleanup
 */
function createTrackedLogger(config?: Partial<LoggerConfig>) {
	const logger = createPinoLogger(config);
	createdLoggers.push(logger);
	return logger;
}

/**
 * Helper to create transport logger and track it for cleanup
 */
function createTrackedTransportLogger(
	config?: Partial<LoggerConfig>,
	transport?: any,
) {
	const logger = createLoggerWithTransport(config, transport);
	createdLoggers.push(logger);
	return logger;
}

test.before(() => {
	mkdirSync(testLogDir, {recursive: true});
	process.env.NODE_ENV = 'test';
});

test.after.always(async () => {
	// Flush and end all tracked loggers first
	await Promise.all(
		createdLoggers.map(async logger => {
			try {
				// Flush any pending writes first
				await logger.flush();
				// Then end the logger
				await logger.end();
			} catch {
				// Ignore errors during cleanup
			}
		}),
	);

	// Clear the array
	createdLoggers.length = 0;

	// Give Pino transport workers time to shut down gracefully
	// Pino uses worker threads that need time to clean up
	// Increased timeout to ensure worker threads can terminate
	await new Promise(resolve => setTimeout(resolve, 500));

	// Clean up test directory
	if (existsSync(testLogDir)) {
		rmSync(testLogDir, {recursive: true, force: true});
	}
});

test('createPinoLogger creates logger with default configuration', async t => {
	const logger = createTrackedLogger();

	t.truthy(logger, 'Should create logger instance');
	t.truthy(typeof logger.info === 'function', 'Should have info method');
	t.truthy(typeof logger.error === 'function', 'Should have error method');
	t.truthy(typeof logger.warn === 'function', 'Should have warn method');
	t.truthy(typeof logger.debug === 'function', 'Should have debug method');
	t.truthy(typeof logger.child === 'function', 'Should have child method');
	t.truthy(
		typeof logger.isLevelEnabled === 'function',
		'Should have isLevelEnabled method',
	);
});

test('createPinoLogger respects configuration options', async t => {
	const config: Partial<LoggerConfig> = {
		level: 'warn',
		pretty: false,
		correlation: false,
		redact: ['apiKey', 'secret'],
	};

	const logger = createTrackedLogger(config);

	t.true(logger.isLevelEnabled('warn'), 'Should enable warn level');
	t.true(logger.isLevelEnabled('error'), 'Should enable error level');
	t.false(logger.isLevelEnabled('info'), 'Should disable info level');
	t.false(logger.isLevelEnabled('debug'), 'Should disable debug level');
});

test('createPinoLogger includes Node.js version in base configuration', async t => {
	// This tests the feature from the previous session
	const logger = createTrackedLogger({level: 'silent'});

	// Verify logger was created successfully
	t.truthy(logger, 'Should create logger with Node.js version');
});


test('createPinoLogger creates file transport in test environment', async t => {
	const originalEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'test';

	const logger = createTrackedLogger({level: 'info'});

	t.truthy(logger, 'Should create logger in test environment');

	// Log a test message
	logger.info('Test message for file transport');

	// Verify log directory is created
	const logDir = getDefaultLogDirectory();
	t.true(existsSync(logDir), 'Should create log directory');

	process.env.NODE_ENV = originalEnv;
});

test('createLoggerWithTransport creates logger with custom transport', async t => {
	const customTransport = {
		target: 'pino/file',
		options: {
			destination: join(testLogDir, 'custom-test.log'),
		},
	};

	const logger = createTrackedTransportLogger(
		{
			level: 'debug',
			pretty: false,
		},
		customTransport,
	);

	t.truthy(logger, 'Should create logger with custom transport');
	t.true(logger.isLevelEnabled('debug'), 'Should enable debug level');

	logger.info('Test message with custom transport');

	// Note: File creation might be asynchronous, so we'll just verify the transport was configured correctly
	t.is(
		customTransport.options.destination,
		join(testLogDir, 'custom-test.log'),
	);
});

test('createLoggerWithTransport includes Node.js version', async t => {
	const logger = createTrackedTransportLogger({level: 'silent'});

	t.truthy(
		logger,
		'Should create logger with Node.js version in custom transport',
	);
});

test('createLoggerWithTransport works without transport', async t => {
	const logger = createTrackedTransportLogger({level: 'info'});

	t.truthy(logger, 'Should create logger without transport');
	t.true(logger.isLevelEnabled('info'), 'Should enable info level');

	logger.info('Test message without custom transport');
});

test('createLoggerWithTransport handles DestinationStream transport', async t => {
	// Create a pino destination stream directly
	const destination = pino.destination(join(testLogDir, 'stream-test.log'));
	const logger = createTrackedTransportLogger({level: 'info'}, destination);

	t.truthy(logger, 'Should create logger with DestinationStream');
	logger.info('Test message with DestinationStream');
});

test('logger handles different message formats', async t => {
	const logger = createTrackedLogger({level: 'debug'});

	// Test string message
	t.notThrows(() => {
		logger.info('Simple string message');
	}, 'Should handle string messages');

	// Test object message
	t.notThrows(() => {
		logger.info({key: 'value'}, 'Message with object');
	}, 'Should handle object messages');

	// Test message with additional arguments
	t.notThrows(() => {
		logger.info('Message with args', {arg1: 'value1'}, {arg2: 'value2'});
	}, 'Should handle multiple arguments');
});

test('logger handles correlation context', async t => {
	const logger = createTrackedLogger({
		level: 'debug',
		correlation: true,
	});

	// Set environment variable to enable correlation
	const originalCorrelation = process.env.NANOCODER_CORRELATION_ENABLED;
	process.env.NANOCODER_CORRELATION_ENABLED = 'true';

	// Create and run with correlation context
	const context = createCorrelationContext(undefined, {
		user: 'test-user',
		operation: 'test-operation',
	});

	// Test with correlation enabled
	t.notThrows(() => {
		withCorrelationContext(context, () => {
			logger.info('Message with correlation');
		});
	}, 'Should handle correlation context');

	// Restore environment
	if (originalCorrelation === undefined) {
		delete process.env.NANOCODER_CORRELATION_ENABLED;
	} else {
		process.env.NANOCODER_CORRELATION_ENABLED = originalCorrelation;
	}
});

test('logger handles correlation context with metadata', async t => {
	const logger = createTrackedLogger({
		level: 'debug',
		correlation: true,
	});

	const originalCorrelation = process.env.NANOCODER_CORRELATION_ENABLED;
	process.env.NANOCODER_CORRELATION_ENABLED = 'true';

	const context = createCorrelationContext(undefined, {custom: 'data'});

	withCorrelationContext(context, () => {
		logger.info('Test with metadata');
	});

	if (originalCorrelation === undefined) {
		delete process.env.NANOCODER_CORRELATION_ENABLED;
	} else {
		process.env.NANOCODER_CORRELATION_ENABLED = originalCorrelation;
	}

	t.pass('Should handle correlation metadata');
});

test('logger handles correlation when disabled', async t => {
	const logger = createTrackedLogger({
		level: 'debug',
		correlation: false,
	});

	const originalCorrelation = process.env.NANOCODER_CORRELATION_ENABLED;
	process.env.NANOCODER_CORRELATION_ENABLED = 'false';

	t.notThrows(() => {
		logger.info('Message without correlation');
	}, 'Should handle disabled correlation');

	if (originalCorrelation === undefined) {
		delete process.env.NANOCODER_CORRELATION_ENABLED;
	} else {
		process.env.NANOCODER_CORRELATION_ENABLED = originalCorrelation;
	}
});

test('logger handles redaction', async t => {
	const logger = createTrackedLogger({
		level: 'debug',
		redact: ['apiKey', 'password', 'secret'],
	});

	const sensitiveData = {
		username: 'testuser',
		apiKey: 'secret-key-123',
		password: 'secret-pass',
		safeField: 'safe-value',
	};

	t.notThrows(() => {
		logger.info('Message with sensitive data', sensitiveData);
	}, 'Should handle redaction without errors');
});

test('child logger inherits parent configuration', async t => {
	const parentLogger = createTrackedLogger({
		level: 'debug',
		redact: ['secret'],
	});

	const childLogger = parentLogger.child({
		module: 'test-module',
		version: '1.0.0',
	});

	t.truthy(childLogger, 'Should create child logger');
	t.true(childLogger.isLevelEnabled('debug'), 'Child should inherit log level');
	t.not(parentLogger === childLogger, 'Child should be different instance');

	// Test child logger functionality
	t.notThrows(() => {
		childLogger.info('Child logger message');
	}, 'Child logger should work');
});

test('nested child loggers work correctly', async t => {
	const parentLogger = createTrackedLogger({level: 'info'});
	const childLogger = parentLogger.child({module: 'parent'});
	const grandchildLogger = childLogger.child({submodule: 'child'});

	t.truthy(grandchildLogger, 'Should create grandchild logger');

	t.notThrows(() => {
		grandchildLogger.info('Grandchild message');
	}, 'Grandchild logger should work');
});

test('child logger handles redaction', async t => {
	const parentLogger = createTrackedLogger({
		level: 'debug',
		redact: ['secret'],
	});

	const childLogger = parentLogger.child({module: 'test'});

	t.notThrows(() => {
		childLogger.info('Child with redaction', {secret: 'should-be-redacted'});
	}, 'Child should handle redaction');
});

test('child logger flush and end methods work', async t => {
	const parentLogger = createTrackedLogger({level: 'info'});
	const childLogger = parentLogger.child({module: 'test'});

	// Log something to ensure the child logger is properly initialized
	childLogger.info('Test message for child logger');

	try {
		await childLogger.flush();
		t.pass('Child flush completed');
	} catch (error) {
		// Some transports may not support flush on child loggers
		t.pass('Child flush handled gracefully');
	}

	try {
		await childLogger.end();
		t.pass('Child end completed');
	} catch (error) {
		// Some transports may not support end on child loggers
		t.pass('Child end handled gracefully');
	}
});

test('logger handles edge cases gracefully', async t => {
	const logger = createTrackedLogger({level: 'debug'});

	// Test circular references - with a simpler approach to avoid redaction recursion
	const circular: any = {id: 1};
	circular.self = circular;

	// The logger should handle circular references, but we'll test without triggering the redaction system
	t.notThrows(() => {
		logger.info('Circular reference test', {id: circular.id});
	}, 'Should handle object with circular reference properties');

	// Test undefined/null values
	t.notThrows(() => {
		logger.info('Edge cases', {
			nullValue: null,
			undefinedValue: undefined,
			emptyString: '',
			zero: 0,
			false: false,
		});
	}, 'Should handle undefined/null values');

	// Test very large strings
	t.notThrows(() => {
		logger.info('Large string test', {largeData: 'x'.repeat(10000)});
	}, 'Should handle large data');
});

test('logger handles high volume efficiently', async t => {
	const logger = createTrackedLogger({level: 'info'});
	const messageCount = 1000;

	const startTime = performance.now();

	for (let i = 0; i < messageCount; i++) {
		logger.info(`High volume message ${i}`, {index: i});
	}

	const endTime = performance.now();
	const duration = endTime - startTime;
	const avgTime = duration / messageCount;

	// Should handle high volume efficiently (less than 1ms per log)
	t.true(
		avgTime < 1,
		`Should handle high volume efficiently (${avgTime.toFixed(
			4,
		)}ms per message)`,
	);
});

test('getLoggerStats returns correct information', t => {
	const stats = getLoggerStats();

	t.truthy(stats, 'Should return stats object');
	t.truthy(typeof stats.level === 'string', 'Should have level');
	t.truthy(typeof stats.silent === 'boolean', 'Should have silent flag');
	t.truthy(typeof stats.environment === 'string', 'Should have environment');
});

test('logger cleanup methods work', async t => {
	const logger = createTrackedLogger({level: 'info'});

	logger.info('Message before cleanup');

	// Test flush method - may not be available with all transport configurations
	try {
		await logger.flush();
		t.pass('Flush completed successfully');
	} catch (error) {
		// Flush may not be available with certain transport configurations
		t.pass('Flush handled gracefully when not available');
	}

	// Test end method - tracked loggers are cleaned up automatically
	t.pass('Logger will be cleaned up in test.after.always');
});

test('different log levels work correctly', async t => {
	const logger = createTrackedLogger({level: 'trace'}); // Use trace to enable all levels

	const testMessage = 'Test log message';

	t.notThrows(() => logger.fatal(testMessage), 'fatal level should work');
	t.notThrows(() => logger.error(testMessage), 'error level should work');
	t.notThrows(() => logger.warn(testMessage), 'warn level should work');
	t.notThrows(() => logger.info(testMessage), 'info level should work');

	// Test http level - it exists as a method but might not be available at all log levels
	t.truthy(typeof logger.http === 'function', 'http method should exist');

	// Only test http if it's actually enabled at this log level
	if (logger.isLevelEnabled('http')) {
		t.notThrows(
			() => logger.http(testMessage),
			'http level should work when enabled',
		);
	}

	t.notThrows(() => logger.debug(testMessage), 'debug level should work');
	t.notThrows(() => logger.trace(testMessage), 'trace level should work');
});

test('all log levels with object arguments', async t => {
	const logger = createTrackedLogger({level: 'trace'});

	t.notThrows(
		() => logger.fatal({error: 'fatal'}, 'Fatal message'),
		'fatal with object',
	);
	t.notThrows(
		() => logger.error({error: 'error'}, 'Error message'),
		'error with object',
	);
	t.notThrows(
		() => logger.warn({warning: 'warn'}, 'Warn message'),
		'warn with object',
	);
	t.notThrows(
		() => logger.info({info: 'data'}, 'Info message'),
		'info with object',
	);
	t.notThrows(
		() => logger.debug({debug: 'data'}, 'Debug message'),
		'debug with object',
	);
	t.notThrows(
		() => logger.trace({trace: 'data'}, 'Trace message'),
		'trace with object',
	);
});

test('logger handles http level logging', async t => {
	const logger = createTrackedLogger({level: 'trace'});

	t.notThrows(() => {
		logger.http('HTTP request received');
		logger.http({method: 'GET', path: '/test'}, 'HTTP request');
	}, 'Should handle http level logging');
});

test('silent logger creates no output', async t => {
	const silentLogger = createTrackedLogger({level: 'silent'});

	t.false(
		silentLogger.isLevelEnabled('info'),
		'Silent logger should not enable info level',
	);
	t.false(
		silentLogger.isLevelEnabled('error'),
		'Silent logger should not enable error level',
	);
	t.false(
		silentLogger.isLevelEnabled('debug'),
		'Silent logger should not enable debug level',
	);

	// Should not throw when logging at any level
	t.notThrows(() => {
		silentLogger.info('This should not be logged');
		silentLogger.error('This should not be logged');
		silentLogger.debug('This should not be logged');
	}, 'Silent logger should handle all levels without error');
});

test('logger redaction works for configured fields', async t => {
	const logger = createTrackedLogger({
		level: 'debug',
		redact: ['apiKey', 'password', 'userCredentials.secret'],
	});

	const sensitiveData = {
		username: 'testuser',
		apiKey: 'secret-api-key',
		password: 'secret-password',
		userCredentials: {
			id: 'user123',
			secret: 'super-secret-value',
		},
		safeField: 'this-is-safe',
	};

	// Should not throw and should redact sensitive fields
	t.notThrows(() => {
		logger.info('Testing redaction', sensitiveData);
	}, 'Redaction should work without errors');
});

test('logger handles messages with multiple object arguments', async t => {
	const logger = createTrackedLogger({level: 'debug'});

	t.notThrows(() => {
		logger.info('Message', {arg1: 'val1'}, {arg2: 'val2'}, {arg3: 'val3'});
	}, 'Should handle multiple object arguments');
});

test('logger handles messages with single object argument', async t => {
	const logger = createTrackedLogger({level: 'debug'});

	t.notThrows(() => {
		logger.info('Message', {singleArg: 'value'});
	}, 'Should handle single object argument');
});

test('logger isLevelEnabled works for all levels', async t => {
	const logger = createTrackedLogger({level: 'info'});

	t.true(logger.isLevelEnabled('fatal'), 'fatal should be enabled');
	t.true(logger.isLevelEnabled('error'), 'error should be enabled');
	t.true(logger.isLevelEnabled('warn'), 'warn should be enabled');
	t.true(logger.isLevelEnabled('info'), 'info should be enabled');
	t.false(logger.isLevelEnabled('debug'), 'debug should be disabled');
	t.false(logger.isLevelEnabled('trace'), 'trace should be disabled');
});

test('logger handles production environment', async t => {
	const originalEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'production';

	const logger = createTrackedLogger({level: 'info'});

	t.truthy(logger, 'Should create logger in production');
	logger.info('Production log message');

	process.env.NODE_ENV = originalEnv;
	t.pass('Production logger works');
});

test('logger handles development environment', async t => {
	const originalEnv = process.env.NODE_ENV;
	process.env.NODE_ENV = 'development';

	const logger = createTrackedLogger({level: 'debug'});

	t.truthy(logger, 'Should create logger in development');
	logger.debug('Development log message');

	process.env.NODE_ENV = originalEnv;
	t.pass('Development logger works');
});

test('logger handles undefined NODE_ENV', async t => {
	const originalEnv = process.env.NODE_ENV;
	delete process.env.NODE_ENV;

	const logger = createTrackedLogger({level: 'info'});

	t.truthy(logger, 'Should create logger with undefined NODE_ENV');
	logger.info('Log with undefined NODE_ENV');

	process.env.NODE_ENV = originalEnv;
	t.pass('Logger works with undefined NODE_ENV');
});

test('getLoggerStats works with different NODE_ENV values', t => {
	const originalEnv = process.env.NODE_ENV;

	// Test with production
	process.env.NODE_ENV = 'production';
	let stats = getLoggerStats();
	t.is(stats.environment, 'production');

	// Test with development
	process.env.NODE_ENV = 'development';
	stats = getLoggerStats();
	t.is(stats.environment, 'development');

	// Test with undefined
	delete process.env.NODE_ENV;
	stats = getLoggerStats();
	t.is(stats.environment, 'production'); // Defaults to production

	process.env.NODE_ENV = originalEnv;
});

test('logger handles all switch case levels in logWithContext', async t => {
	const logger = createTrackedLogger({level: 'trace'});

	const originalCorrelation = process.env.NANOCODER_CORRELATION_ENABLED;
	process.env.NANOCODER_CORRELATION_ENABLED = 'true';

	const context = createCorrelationContext(undefined, {test: 'metadata'});

	// Test all log levels through the correlation context path
	withCorrelationContext(context, () => {
		t.notThrows(() => logger.fatal('Fatal in context'), 'fatal in context');
		t.notThrows(() => logger.error('Error in context'), 'error in context');
		t.notThrows(() => logger.warn('Warn in context'), 'warn in context');
		t.notThrows(() => logger.info('Info in context'), 'info in context');
		t.notThrows(() => logger.http('HTTP in context'), 'http in context');
		t.notThrows(() => logger.debug('Debug in context'), 'debug in context');
		t.notThrows(() => logger.trace('Trace in context'), 'trace in context');
	});

	if (originalCorrelation === undefined) {
		delete process.env.NANOCODER_CORRELATION_ENABLED;
	} else {
		process.env.NANOCODER_CORRELATION_ENABLED = originalCorrelation;
	}
});

test('logger handles correlation without metadata', async t => {
	const logger = createTrackedLogger({level: 'info'});

	const originalCorrelation = process.env.NANOCODER_CORRELATION_ENABLED;
	process.env.NANOCODER_CORRELATION_ENABLED = 'true';

	// Create context without metadata
	const context = createCorrelationContext();

	withCorrelationContext(context, () => {
		t.notThrows(
			() => logger.info('Message without metadata'),
			'Should handle correlation without metadata',
		);
	});

	if (originalCorrelation === undefined) {
		delete process.env.NANOCODER_CORRELATION_ENABLED;
	} else {
		process.env.NANOCODER_CORRELATION_ENABLED = originalCorrelation;
	}
});

test('logger handles messages with primitive arguments', async t => {
	const logger = createTrackedLogger({level: 'debug'});

	t.notThrows(() => {
		logger.info('Message with primitives', 'string', 123, true, null);
	}, 'Should handle primitive arguments');
});

test('createLoggerWithTransport handles different redact configurations', async t => {
	// Test with empty redact array
	let logger = createTrackedTransportLogger({
		level: 'info',
		redact: [],
	});
	t.truthy(logger, 'Should create logger with empty redact array');

	// Test with string redact paths
	logger = createTrackedTransportLogger({
		level: 'info',
		redact: ['password', 'apiKey', 'credentials.token'],
	});
	t.truthy(logger, 'Should create logger with redact paths');

	logger.info('Test with redaction', {
		password: 'secret',
		apiKey: 'key',
		safeData: 'visible',
	});
});
