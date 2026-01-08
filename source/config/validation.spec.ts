import test from 'ava';
import {validateMCPConfigSecurity, validateProjectConfigSecurity} from '@/config/validation';
import type {MCPServerConfig} from '@/types/config';

test('validateMCPConfigSecurity - warns about hardcoded credentials in env vars', t => {
	const mcpServers: MCPServerConfig[] = [
		{
			name: 'test-server',
			transport: 'stdio',
			command: 'npx',
			args: ['test'],
			env: {
				API_KEY: 'hardcoded-secret-key', // This should trigger a warning
				NORMAL_VAR: 'normal-value' // This should not trigger a warning
			}
		}
	];
	
	// Capture console warnings
	const originalWarn = console.warn;
	const warnings: string[] = [];
	console.warn = (msg: string) => warnings.push(msg);
	
	validateMCPConfigSecurity(mcpServers);
	
	console.warn = originalWarn;
	
	t.is(warnings.length, 1);
	t.true(warnings[0].includes('Hardcoded credential detected'));
	t.true(warnings[0].includes('test-server'));
	t.true(warnings[0].includes('API_KEY'));
});

test('validateMCPConfigSecurity - warns about hardcoded credentials in auth', t => {
	const mcpServers: MCPServerConfig[] = [
		{
			name: 'auth-server',
			transport: 'http',
			url: 'http://localhost:8080',
			auth: {
				type: 'api-key',
				apiKey: 'hardcoded-api-key' // This should trigger a warning
			}
		}
	];
	
	// Capture console warnings
	const originalWarn = console.warn;
	const warnings: string[] = [];
	console.warn = (msg: string) => warnings.push(msg);
	
	validateMCPConfigSecurity(mcpServers);
	
	console.warn = originalWarn;
	
	t.is(warnings.length, 1);
	t.true(warnings[0].includes('Hardcoded API key detected'));
	t.true(warnings[0].includes('auth-server'));
});

test('validateMCPConfigSecurity - warns about hardcoded headers', t => {
	const mcpServers: MCPServerConfig[] = [
		{
			name: 'header-server',
			transport: 'http',
			url: 'http://localhost:8080',
			headers: {
				Authorization: 'Bearer hardcoded-token', // This should trigger a warning
				'Content-Type': 'application/json' // This should not trigger a warning
			}
		}
	];
	
	// Capture console warnings
	const originalWarn = console.warn;
	const warnings: string[] = [];
	console.warn = (msg: string) => warnings.push(msg);
	
	validateMCPConfigSecurity(mcpServers);
	
	console.warn = originalWarn;
	
	t.is(warnings.length, 1);
	t.true(warnings[0].includes('Hardcoded header value detected'));
	t.true(warnings[0].includes('header-server'));
	t.true(warnings[0].includes('Authorization'));
});

test('validateMCPConfigSecurity - does not warn for environment variable references', t => {
	const mcpServers: MCPServerConfig[] = [
		{
			name: 'env-server',
			transport: 'stdio',
			command: 'npx',
			args: ['test'],
			env: {
				API_KEY: '$API_KEY', // Environment variable reference - no warning
				TOKEN: '${TOKEN}' // Environment variable reference - no warning
			}
		}
	];
	
	// Capture console warnings
	const originalWarn = console.warn;
	const warnings: string[] = [];
	console.warn = (msg: string) => warnings.push(msg);
	
	validateMCPConfigSecurity(mcpServers);
	
	console.warn = originalWarn;
	
	t.is(warnings.length, 0);
});

test('validateProjectConfigSecurity - only validates project-level configs', t => {
	const mcpServers: MCPServerConfig[] = [
		{
			name: 'project-server',
			transport: 'stdio',
			command: 'npx',
			args: ['test'],
			env: {
				API_KEY: 'hardcoded-key' // Should trigger warning for project config
			},
			source: 'project-root' // Project-level config
		},
		{
			name: 'global-server',
			transport: 'stdio',
			command: 'npx',
			args: ['test'],
			env: {
				API_KEY: 'hardcoded-key' // Should NOT trigger warning for global config
			},
			source: 'global-config' // Global-level config
		}
	];
	
	// Capture console warnings
	const originalWarn = console.warn;
	const warnings: string[] = [];
	console.warn = (msg: string) => warnings.push(msg);
	
	validateProjectConfigSecurity(mcpServers);
	
	console.warn = originalWarn;
	
	// Should only warn about the project-level config
	t.is(warnings.length, 1);
	t.true(warnings[0].includes('project-server'));
	t.false(warnings[0].includes('global-server'));
});