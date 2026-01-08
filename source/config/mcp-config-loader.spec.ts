import test from 'ava';
import {writeFileSync, mkdirSync, rmSync} from 'fs';
import {tmpdir} from 'os';
import {join} from 'path';
import {loadAllMCPConfigs, loadGlobalMCPConfig, loadProjectMCPConfig, getSourceLabel, loadAllProviderConfigs, loadGlobalProviderConfigs, loadProjectProviderConfigs, mergeMCPConfigs} from '@/config/mcp-config-loader';

test.beforeEach(t => {
	// Create a temporary directory for testing
	const testDir = join(tmpdir(), `nanocoder-test-${Date.now()}`);
	t.context.testDir = testDir;
	t.context.originalCwd = process.cwd();
	
	// Create the test directory
	mkdirSync(testDir, {recursive: true});
	
	// Change to the test directory
	process.chdir(testDir);
});

test.afterEach(t => {
	// Clean up the temporary directory
	rmSync(t.context.testDir as string, {recursive: true, force: true});
	
	// Restore original working directory
	process.chdir(t.context.originalCwd as string);
});

test('loadProjectMCPConfig - loads from .mcp.json', t => {
	const testDir = t.context.testDir as string;
	
	const config = {
		mcpServers: [
			{
				name: 'test-server',
				transport: 'stdio',
				command: 'npx',
				args: ['test-server']
			}
		]
	};
	
	writeFileSync(join(testDir, '.mcp.json'), JSON.stringify(config));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 1);
	t.is(result[0].server.name, 'test-server');
	t.is(result[0].source, 'project-root');
});

test('loadProjectMCPConfig - loads Claude Code format from .mcp.json', t => {
	const testDir = t.context.testDir as string;
	
	const config = {
		mcpServers: {
			'test-server': {
				transport: 'stdio',
				command: 'npx',
				args: ['test-server']
			},
			'another-server': {
				transport: 'http',
				url: 'http://localhost:8080'
			}
		}
	};
	
	writeFileSync(join(testDir, '.mcp.json'), JSON.stringify(config));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 2);
	t.is(result[0].server.name, 'test-server');
	t.is(result[0].server.transport, 'stdio');
	t.is(result[1].server.name, 'another-server');
	t.is(result[1].server.transport, 'http');
	t.is(result[0].source, 'project-root');
});

test('loadProjectMCPConfig - loads from mcp.json', t => {
	const testDir = t.context.testDir as string;
	
	const config = {
		mcpServers: [
			{
				name: 'alt-server',
				transport: 'http',
				url: 'http://localhost:8080'
			}
		]
	};
	
	writeFileSync(join(testDir, 'mcp.json'), JSON.stringify(config));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 1);
	t.is(result[0].server.name, 'alt-server');
	t.is(result[0].source, 'project-alternative');
});

test('loadProjectMCPConfig - loads from .nanocoder/mcp.json', t => {
	const testDir = t.context.testDir as string;
	const nanocoderDir = join(testDir, '.nanocoder');
	mkdirSync(nanocoderDir, {recursive: true});
	
	const config = {
		mcpServers: [
			{
				name: 'nanocoder-server',
				transport: 'websocket',
				url: 'ws://localhost:8080'
			}
		]
	};
	
	writeFileSync(join(nanocoderDir, 'mcp.json'), JSON.stringify(config));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 1);
	t.is(result[0].server.name, 'nanocoder-server');
	t.is(result[0].source, 'nanocoder-dir');
});

test('loadProjectMCPConfig - loads from .claude/mcp.json', t => {
	const testDir = t.context.testDir as string;
	const claudeDir = join(testDir, '.claude');
	mkdirSync(claudeDir, {recursive: true});
	
	const config = {
		mcpServers: [
			{
				name: 'claude-server',
				transport: 'stdio',
				command: 'npx',
				args: ['claude-server']
			}
		]
	};
	
	writeFileSync(join(claudeDir, 'mcp.json'), JSON.stringify(config));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 1);
	t.is(result[0].server.name, 'claude-server');
	t.is(result[0].source, 'claude-dir');
});

test('loadProjectMCPConfig - loads Claude Code format from .claude/mcp.json', t => {
	const testDir = t.context.testDir as string;
	const claudeDir = join(testDir, '.claude');
	mkdirSync(claudeDir, {recursive: true});
	
	const config = {
		mcpServers: {
			'shadcn-ui-server': {
				command: 'npx',
				args: ['-y', 'shadcn-ui-mcp-server']
			},
			'taskmaster-ai': {
				type: 'stdio',
				command: 'npx',
				args: ['-y', '--package=task-master-ai', 'task-master-ai'],
				env: {
					OLLAMA_BASE_URL: 'http://127.0.0.1:11434/api'
				}
			}
		}
	};
	
	writeFileSync(join(claudeDir, 'mcp.json'), JSON.stringify(config));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 2);
	t.is(result[0].server.name, 'shadcn-ui-server');
	t.is(result[1].server.name, 'taskmaster-ai');
	t.is(result[1].server.env?.OLLAMA_BASE_URL, 'http://127.0.0.1:11434/api');
	t.is(result[0].source, 'claude-dir');
});

test('loadProjectMCPConfig - loads from .nanocoder/mcp.local.json', t => {
	const testDir = t.context.testDir as string;
	const nanocoderDir = join(testDir, '.nanocoder');
	mkdirSync(nanocoderDir, {recursive: true});
	
	const config = {
		mcpServers: [
			{
				name: 'local-server',
				transport: 'stdio',
				command: 'npx',
				args: ['local-server']
			}
		]
	};
	
	writeFileSync(join(nanocoderDir, 'mcp.local.json'), JSON.stringify(config));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 1);
	t.is(result[0].server.name, 'local-server');
	t.is(result[0].source, 'local-overrides');
});

test('loadProjectMCPConfig - prioritizes higher priority configs', t => {
	const testDir = t.context.testDir as string;
	
	// Create both .mcp.json and mcp.json - .mcp.json should take priority
	const projectConfig = {
		mcpServers: [
			{
				name: 'project-server',
				transport: 'stdio',
				command: 'npx',
				args: ['project-server']
			}
		]
	};
	
	const altConfig = {
		mcpServers: [
			{
				name: 'alt-server',
				transport: 'http',
				url: 'http://localhost:8080'
			}
		]
	};
	
	writeFileSync(join(testDir, '.mcp.json'), JSON.stringify(projectConfig));
	writeFileSync(join(testDir, 'mcp.json'), JSON.stringify(altConfig));
	
	const result = loadProjectMCPConfig();
	t.is(result.length, 1);
	t.is(result[0].server.name, 'project-server');
	t.is(result[0].source, 'project-root');
});

test('loadGlobalMCPConfig - loads from agents.config.json', t => {
	const testDir = t.context.testDir as string;
	
	const config = {
		nanocoder: {
			mcpServers: [
				{
					name: 'global-server',
					transport: 'stdio',
					command: 'npx',
					args: ['global-server']
				}
			]
		}
	};
	
	writeFileSync(join(testDir, 'agents.config.json'), JSON.stringify(config));
	
	const result = loadGlobalMCPConfig();
	t.is(result.length, 1);
	t.is(result[0].server.name, 'global-server');
	t.is(result[0].source, 'global-config');
});

test('loadGlobalMCPConfig - loads Claude Code format from agents.config.json', t => {
	const testDir = t.context.testDir as string;
	
	const config = {
		nanocoder: {
			mcpServers: {
				'global-server': {
					transport: 'stdio',
					command: 'npx',
					args: ['global-server']
				},
				'another-global': {
					transport: 'http',
					url: 'http://global:8080'
				}
			}
		}
	};
	
	writeFileSync(join(testDir, 'agents.config.json'), JSON.stringify(config));
	
	const result = loadGlobalMCPConfig();
	t.is(result.length, 2);
	t.is(result[0].server.name, 'global-server');
	t.is(result[1].server.name, 'another-global');
	t.is(result[0].source, 'global-config');
});

test('mergeMCPConfigs - project configs override global configs', t => {
	const projectServers = [
		{
			server: {
				name: 'shared-server',
				transport: 'stdio',
				command: 'npx',
				args: ['project-version']
			},
			source: 'project-root' as const
		},
		{
			server: {
				name: 'project-only',
				transport: 'http',
				url: 'http://project-only:8080'
			},
			source: 'project-root' as const
		}
	];
	
	const globalServers = [
		{
			server: {
				name: 'shared-server',
				transport: 'stdio',
				command: 'npx',
				args: ['global-version']
			},
			source: 'global-config' as const
		},
		{
			server: {
				name: 'global-only',
				transport: 'websocket',
				url: 'ws://global-only:8080'
			},
			source: 'global-config' as const
		}
	];
	
	const result = mergeMCPConfigs(projectServers, globalServers);
	
	// Should have 3 servers (shared-server from project, project-only, global-only)
	t.is(result.length, 3);
	
	const sharedServer = result.find(s => s.server.name === 'shared-server');
	t.is(sharedServer?.server.args?.[0], 'project-version'); // Project version should win
	t.is(sharedServer?.source, 'project-root');
	
	const projectOnly = result.find(s => s.server.name === 'project-only');
	t.truthy(projectOnly);
	t.is(projectOnly?.source, 'project-root');
	
	const globalOnly = result.find(s => s.server.name === 'global-only');
	t.truthy(globalOnly);
	t.is(globalOnly?.source, 'global-config');
});

test('getSourceLabel - returns correct labels', t => {
	t.is(getSourceLabel('project-root'), '[project]');
	t.is(getSourceLabel('project-alternative'), '[project]');
	t.is(getSourceLabel('nanocoder-dir'), '[project]');
	t.is(getSourceLabel('claude-dir'), '[project]');
	t.is(getSourceLabel('local-overrides'), '[local]');
	t.is(getSourceLabel('global-config'), '[global]');
});

test('loadAllProviderConfigs - loads providers from both project and global configs', t => {
	const testDir = t.context.testDir as string;
	
	// Create project-level config
	const projectConfig = {
		nanocoder: {
			providers: [
				{
					name: 'project-provider',
					baseUrl: 'http://project.example.com',
					apiKey: 'project-key',
					models: ['model-1']
				}
			]
		}
	};
	writeFileSync(join(testDir, 'agents.config.json'), JSON.stringify(projectConfig));
	
	const result = loadAllProviderConfigs();
	t.is(result.length, 1);
	t.is(result[0].name, 'project-provider');
});

test('loadAllProviderConfigs - merges providers from project and global with project taking precedence', t => {
	const testDir = t.context.testDir as string;
	
	// Create project-level config with a provider that also exists in global
	const projectConfig = {
		nanocoder: {
			providers: [
				{
					name: 'shared-provider',
					baseUrl: 'http://project.example.com',
					apiKey: 'project-key',
					models: ['project-model']
				},
				{
					name: 'project-only',
					baseUrl: 'http://project-only.example.com',
					apiKey: 'project-only-key',
					models: ['project-only-model']
				}
			]
		}
	};
	writeFileSync(join(testDir, 'agents.config.json'), JSON.stringify(projectConfig));
	
	const result = loadAllProviderConfigs();
	t.is(result.length, 2);
	
	const sharedProvider = result.find(p => p.name === 'shared-provider');
	t.is(sharedProvider?.baseUrl, 'http://project.example.com'); // Project version should win
	t.is(sharedProvider?.apiKey, 'project-key');
	t.is(sharedProvider?.models[0], 'project-model');
	
	const projectOnly = result.find(p => p.name === 'project-only');
	t.is(projectOnly?.baseUrl, 'http://project-only.example.com');
});