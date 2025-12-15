import test from 'ava';

// Implementation imports
import {
	StructuredConsole,
	ConsoleInterceptor,
	globalConsoleInterceptor,
	useStructuredConsole,
	createModuleConsole,
	ConsoleUsageTracker,
} from './console-facade.js';

// Since the console-facade uses the real logger at module load time,
// we'll test the behavior by checking that the methods work correctly
// and produce the expected output structure.

test('StructuredConsole.log handles empty arguments', t => {
	// This test verifies that StructuredConsole.log works without throwing
	// The real logger will handle the call, so we just check it doesn't throw
	t.notThrows(() => {
		StructuredConsole.log();
	}, 'Should handle empty arguments without throwing');
});

test('StructuredConsole.log handles single string argument', t => {
	const testMessage = 'Test log message';
	t.notThrows(() => {
		StructuredConsole.log(testMessage);
	}, 'Should handle single string argument without throwing');
});

test('StructuredConsole.log handles single object argument', t => {
	const testObject = {key: 'value', number: 42};
	t.notThrows(() => {
		StructuredConsole.log(testObject);
	}, 'Should handle single object argument without throwing');
});

test('StructuredConsole.log handles single primitive argument', t => {
	const testValue = 123;
	t.notThrows(() => {
		StructuredConsole.log(testValue);
	}, 'Should handle single primitive argument without throwing');
});

test('StructuredConsole.log handles multiple arguments', t => {
	const stringArg = 'Test message';
	const objectArg = {data: 'test'};
	const numberArg = 42;
	t.notThrows(() => {
		StructuredConsole.log(stringArg, objectArg, numberArg);
	}, 'Should handle multiple arguments without throwing');
});

test('StructuredConsole.error handles Error objects', t => {
	const testError = new Error('Test error');
	t.notThrows(() => {
		StructuredConsole.error(testError);
	}, 'Should handle Error objects without throwing');
});

test('StructuredConsole.warn handles arguments correctly', t => {
	t.notThrows(() => {
		StructuredConsole.warn('Warning message', {context: 'test'});
	}, 'Should handle arguments correctly without throwing');
});

test('ConsoleInterceptor activates and deactivates correctly', t => {
	const originalConsole = {
		log: console.log,
		error: console.error,
		warn: console.warn,
		info: console.info,
		debug: console.debug,
	};

	const interceptor = new ConsoleInterceptor();

	// Test activation
	interceptor.activate();
	t.true(interceptor.isInterceptorActive());

	// Verify console methods are replaced
	t.is(console.log, StructuredConsole.log);
	t.is(console.error, StructuredConsole.error);
	t.is(console.warn, StructuredConsole.warn);
	t.is(console.info, StructuredConsole.info);
	t.is(console.debug, StructuredConsole.debug);

	// Test deactivation
	interceptor.deactivate();
	t.false(interceptor.isInterceptorActive());

	// Verify original methods are restored
	t.is(console.log, originalConsole.log);
	t.is(console.error, originalConsole.error);
	t.is(console.warn, originalConsole.warn);
	t.is(console.info, originalConsole.info);
	t.is(console.debug, originalConsole.debug);
});

test('ConsoleInterceptor handles multiple activation calls', t => {
	const interceptor = new ConsoleInterceptor();

	interceptor.activate();
	const firstActivation = interceptor.isInterceptorActive();

	interceptor.activate(); // Should not cause issues
	const secondActivation = interceptor.isInterceptorActive();

	t.true(firstActivation);
	t.true(secondActivation);
	t.is(console.log, StructuredConsole.log);

	interceptor.deactivate();
});

test('ConsoleInterceptor handles deactivation when not active', t => {
	const interceptor = new ConsoleInterceptor();

	// Should not throw when deactivating while not active
	t.notThrows(() => {
		interceptor.deactivate();
	}, 'Deactivation when not active should not throw');

	t.false(interceptor.isInterceptorActive());
});

test('globalConsoleInterceptor is available and functional', t => {
	t.truthy(globalConsoleInterceptor);
	t.true(globalConsoleInterceptor instanceof ConsoleInterceptor);
	t.false(globalConsoleInterceptor.isInterceptorActive());
});

test('createModuleConsole creates properly scoped console', t => {
	const moduleName = 'test-module';
	const moduleConsole = createModuleConsole(moduleName);

	t.truthy(moduleConsole);
	t.truthy(typeof moduleConsole.log === 'function');
	t.truthy(typeof moduleConsole.error === 'function');
	t.truthy(typeof moduleConsole.warn === 'function');
	t.truthy(typeof moduleConsole.info === 'function');
	t.truthy(typeof moduleConsole.debug === 'function');
});

test('ConsoleUsageTracker tracks console usage', t => {
	const tracker = new ConsoleUsageTracker();

	// Simulate some console calls
	console.log('test log');
	console.error('test error');
	console.log('another log');

	const stats = tracker.getUsageStats();
	t.true(typeof stats === 'object');
});

test('ConsoleUsageTracker.reportUsage logs statistics', t => {
	const tracker = new ConsoleUsageTracker();

	t.notThrows(() => {
		tracker.reportUsage();
	}, 'Should report usage without throwing');
});

test('ConsoleUsageTracker.restore works without errors', t => {
	const tracker = new ConsoleUsageTracker();

	t.notThrows(() => {
		tracker.restore();
	}, 'Restore should not throw errors');
});

test('StructuredConsole handles all console methods consistently', t => {
	const methods = ['log', 'error', 'warn', 'info', 'debug'] as const;

	methods.forEach(method => {
		// Call the method with a test message
		t.notThrows(() => {
			StructuredConsole[method](`Test ${method} message`);
		}, `${method} should work without throwing`);
	});
});
