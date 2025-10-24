import type {TemplateField} from './provider-templates';

export interface McpServerConfig {
	name: string;
	command: string;
	args: string[];
	env?: Record<string, string>;
}

export interface McpTemplate {
	id: string;
	name: string;
	description: string;
	command: string;
	fields: TemplateField[];
	buildConfig: (answers: Record<string, string>) => McpServerConfig;
}

export const MCP_TEMPLATES: McpTemplate[] = [
	{
		id: 'filesystem',
		name: 'Filesystem',
		description: 'Read/write files and directories',
		command: 'npx',
		fields: [
			{
				name: 'allowedDirs',
				prompt: 'Allowed directories (comma-separated paths)',
				required: true,
			},
		],
		buildConfig: answers => ({
			name: 'filesystem',
			command: 'npx',
			args: [
				'-y',
				'@modelcontextprotocol/server-filesystem',
				...answers.allowedDirs
					.split(',')
					.map(d => d.trim())
					.filter(Boolean),
			],
		}),
	},
	{
		id: 'github',
		name: 'GitHub',
		description: 'Repository management and operations',
		command: 'npx',
		fields: [
			{
				name: 'githubToken',
				prompt: 'GitHub Personal Access Token (scopes: repo, read:org)',
				required: true,
				sensitive: true,
			},
		],
		buildConfig: answers => ({
			name: 'github',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-github'],
			env: {
				GITHUB_PERSONAL_ACCESS_TOKEN: answers.githubToken,
			},
		}),
	},
	{
		id: 'postgres',
		name: 'PostgreSQL',
		description: 'Database queries and management',
		command: 'npx',
		fields: [
			{
				name: 'connectionString',
				prompt: 'Connection string (postgresql://user:pass@host:port/db)',
				required: true,
				sensitive: true,
			},
		],
		buildConfig: answers => ({
			name: 'postgres',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-postgres'],
			env: {
				POSTGRES_CONNECTION_STRING: answers.connectionString,
			},
		}),
	},
	{
		id: 'brave-search',
		name: 'Brave Search',
		description: 'Web search capabilities',
		command: 'npx',
		fields: [
			{
				name: 'braveApiKey',
				prompt: 'Brave Search API Key',
				required: true,
				sensitive: true,
			},
		],
		buildConfig: answers => ({
			name: 'brave-search',
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-brave-search'],
			env: {
				BRAVE_API_KEY: answers.braveApiKey,
			},
		}),
	},
	{
		id: 'fetch',
		name: 'Fetch',
		description: 'HTTP requests and web scraping',
		command: 'npx',
		fields: [
			{
				name: 'userAgent',
				prompt: 'User-Agent string (optional)',
				required: false,
				default: 'ModelContextProtocol/1.0',
			},
		],
		buildConfig: answers => {
			const config: McpServerConfig = {
				name: 'fetch',
				command: 'npx',
				args: ['-y', '@modelcontextprotocol/server-fetch'],
			};
			if (answers.userAgent) {
				config.env = {USER_AGENT: answers.userAgent};
			}
			return config;
		},
	},
	{
		id: 'custom',
		name: 'Custom MCP Server',
		description: 'Custom MCP server configuration',
		command: '',
		fields: [
			{
				name: 'serverName',
				prompt: 'Server name',
				required: true,
			},
			{
				name: 'command',
				prompt: 'Command (e.g., node, python, /path/to/executable)',
				required: true,
			},
			{
				name: 'args',
				prompt: 'Arguments (space-separated)',
				required: false,
			},
			{
				name: 'envVars',
				prompt: 'Environment variables (KEY=VALUE, one per line, optional)',
				required: false,
			},
		],
		buildConfig: answers => {
			const config: McpServerConfig = {
				name: answers.serverName,
				command: answers.command,
				args: answers.args
					? answers.args
							.split(' ')
							.map(arg => arg.trim())
							.filter(Boolean)
					: [],
			};

			if (answers.envVars) {
				config.env = {};
				const lines = answers.envVars.split('\n');
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					const [key, ...valueParts] = trimmed.split('=');
					if (key && valueParts.length > 0) {
						config.env[key.trim()] = valueParts.join('=').trim();
					}
				}
			}

			return config;
		},
	},
];
