/**
 * Scoring tests
 */

import test from 'ava';
import type {HealthCheck} from '../types.js';
import {calculateScore, generateRecommendations} from './scoring.js';

test('calculateScore returns 0 for fail status', t => {
	const score = calculateScore('fail', 0, 0.5, 0.8);
	t.is(score, 0);
});

test('calculateScore returns 100 for pass status', t => {
	const score = calculateScore('pass', 0, 0.5, 0.8);
	t.is(score, 100);
});

test('calculateScore returns value between 50-80 for warn status', t => {
	const score = calculateScore('warn', 0.6, 0.5, 0.8);
	t.true(score >= 50 && score <= 80);
});

test('generateRecommendations returns array for healthy status', t => {
	const checks: HealthCheck[] = [
		{
			name: 'memory-usage',
			status: 'pass',
			score: 100,
			duration: 10,
		},
	];
	const recommendations = generateRecommendations(checks, 'healthy');
	t.true(Array.isArray(recommendations));
});

test('generateRecommendations includes critical message for unhealthy status', t => {
	const checks: HealthCheck[] = [
		{
			name: 'memory-usage',
			status: 'fail',
			score: 0,
			duration: 10,
		},
	];
	const recommendations = generateRecommendations(checks, 'unhealthy');
	t.true(recommendations.length > 0);
	t.true(
		recommendations.some(r => r.includes('critical') || r.includes('unhealthy')),
	);
});

test('generateRecommendations includes degraded message for degraded status', t => {
	const checks: HealthCheck[] = [
		{
			name: 'memory-usage',
			status: 'warn',
			score: 60,
			duration: 10,
		},
	];
	const recommendations = generateRecommendations(checks, 'degraded');
	t.true(recommendations.length > 0);
	t.true(recommendations.some(r => r.includes('degraded')));
});
