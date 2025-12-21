/**
 * HealthMonitor class tests
 */

import test from 'ava';
import {HealthMonitor} from './health-monitor.js';

test('HealthMonitor can be instantiated', t => {
	const monitor = new HealthMonitor();
	t.truthy(monitor);
});

test('HealthMonitor is not active by default', t => {
	const monitor = new HealthMonitor();
	t.false(monitor.isActive());
});

test('HealthMonitor can get system metrics', t => {
	const monitor = new HealthMonitor();
	const metrics = monitor.getSystemMetrics();

	t.truthy(metrics);
	t.truthy(metrics.timestamp);
	t.truthy(metrics.memory);
	t.truthy(metrics.cpu);
	t.truthy(metrics.process);
	t.truthy(metrics.logging);
	t.truthy(metrics.requests);
	t.truthy(metrics.performance);
});

test('HealthMonitor can run a health check', async t => {
	const monitor = new HealthMonitor();
	const result = await monitor.runHealthCheck();

	t.true(['healthy', 'degraded', 'unhealthy'].includes(result.status));
	t.true(result.score >= 0 && result.score <= 100);
	t.true(Array.isArray(result.checks));
});

test('HealthMonitor can update config', t => {
	const monitor = new HealthMonitor();
	monitor.updateConfig({
		interval: 10000,
	});

	// The test passes if no error is thrown
	t.pass();
});

test('HealthMonitor can get last health check', async t => {
	const monitor = new HealthMonitor();
	t.is(monitor.getLastHealthCheck(), undefined);

	await monitor.runHealthCheck();
	const lastCheck = monitor.getLastHealthCheck();
	t.truthy(lastCheck);
});
