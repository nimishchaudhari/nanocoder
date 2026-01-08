# MCP Server Configuration Guide

This guide covers how to configure Model Context Protocol (MCP) servers with Nanocoder, including both local and remote server setups.

## Transport Types

Nanocoder supports three transport types for MCP servers:

### stdio (Standard Input/Output)

- **Use case**: Local command-line servers
- **Communication**: Process-based with stdin/stdout
- **Common for**: Filesystem, GitHub, local tools

### http (HTTP/HTTPS)

- **Use case**: Remote HTTP API endpoints
- **Communication**: RESTful HTTP requests
- **Common for**: Cloud services, search APIs, documentation lookup

### websocket (WebSocket)

- **Use case**: Real-time bidirectional communication
- **Communication**: Persistent WebSocket connections
- **Common for**: Live data streams, interactive services

## Configuration Examples

### Project-Level Configuration

Nanocoder now supports project-level MCP configuration files for team collaboration:

- **`.mcp.json`** - Primary project-level config in project root
- **`mcp.json`** - Alternative project-level config in project root
- **`.nanocoder/mcp.json`** - Nanocoder-specific directory config
- **`.claude/mcp.json`** - Claude Code compatibility config
- **`.nanocoder/mcp.local.json`** - Local overrides (gitignored, highest priority)

Project-level configs take precedence over the global `agents.config.json`.

**Example `.mcp.json` (Array Format):**
```json
{
  "mcpServers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "./src"],
      "description": "Project filesystem access",
      "env": {
        "ALLOWED_PATHS": "./src"
      }
    }
  ]
}
```

**Example `.mcp.json` (Claude Code Object Format):**
```json
{
  "mcpServers": {
    "filesystem": {
      "transport": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "./src"],
      "description": "Project filesystem access",
      "env": {
        "ALLOWED_PATHS": "./src"
      }
    },
    "github": {
      "transport": "stdio",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "$GITHUB_TOKEN"
      }
    }
  }
}
```

The Claude Code format (object with named keys) is fully supported alongside the traditional array format.

### Local stdio Servers

#### File System Access

```json
{
	"name": "filesystem",
	"transport": "stdio",
	"command": "npx",
	"args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"],
	"env": {}
}
```

#### GitHub Integration

```json
{
	"name": "github",
	"transport": "stdio",
	"command": "npx",
	"args": ["-y", "@modelcontextprotocol/server-github"],
	"env": {
		"GITHUB_TOKEN": "your-github-personal-access-token"
	}
}
```

#### Custom Python Server

```json
{
	"name": "custom-tools",
	"transport": "stdio",
	"command": "python",
	"args": ["path/to/mcp_server.py", "--port", "8080"],
	"env": {
		"API_KEY": "${API_KEY:-default-key}",
		"DEBUG": "true"
	}
}
```

### Remote HTTP Servers

#### Search Service

```json
{
	"name": "brave-search",
	"transport": "http",
	"url": "https://api.brave.com/mcp/search",
	"timeout": 30000
}
```

#### Documentation Lookup

```json
{
	"name": "context7",
	"transport": "http",
	"url": "https://mcp.context7.ai/api",
	"timeout": 45000
}
```

### Remote WebSocket Servers

#### Real-time Data Stream

```json
{
	"name": "market-data",
	"transport": "websocket",
	"url": "wss://api.example.com/realtime/mcp",
	"timeout": 60000
}
```

## Configuration Reference

### Base Fields (All Servers)

- `name` (required): Display name for the server
- `transport` (required): Transport type (`stdio`, `http`, `websocket`)

### stdio Transport Fields

- `command` (required): Command to execute
- `args` (optional): Array of command-line arguments
- `env` (optional): Environment variables object

### http/websocket Transport Fields

- `url` (required): Server endpoint URL
- `timeout` (optional): Connection timeout in milliseconds (default: 30000)

## Environment Variables

Use environment variables to keep sensitive data out of configuration files:

```json
{
	"name": "github",
	"transport": "stdio",
	"command": "npx",
	"args": ["@modelcontextprotocol/server-github"],
	"env": {
		"GITHUB_TOKEN": "${GITHUB_TOKEN}",
		"GITHUB_API_URL": "${GITHUB_API_URL:-https://api.github.com}"
	}
}
```

**Supported syntax:**

- `$VAR_NAME`
- `${VAR_NAME}`
- `${VAR_NAME:-default_value}`

## Popular MCP Servers

### Local Servers (stdio)

- **@modelcontextprotocol/server-filesystem**: File operations
- **@modelcontextprotocol/server-github**: GitHub repository management
- **@modelcontextprotocol/server-postgres**: Database operations
- **@modelcontextprotocol/server-brave-search**: Web search (can also be run remotely)

### Remote Services (http/websocket)

- **Context7**: API documentation lookup
- **DeepWiki**: Wikipedia and knowledge base search
- **Sequential Thinking**: Advanced reasoning capabilities
- **Remote Fetch**: Web content extraction

## Configuration Wizard

For interactive setup, use the built-in configuration wizard:

```
/setup-config
```

This provides:

- Pre-built templates for popular MCP servers
- Real-time validation
- Transport type selection
- Automatic configuration file generation

## Troubleshooting

### Connection Issues

1. **Check transport type mismatch** - Ensure `transport` field matches your server type
2. **Verify URLs** - HTTP/WebSocket URLs must be accessible from your network
3. **Timeouts** - Increase `timeout` values for slow remote services
4. **Environment variables** - Ensure all required environment variables are set

### stdio Server Issues

1. **Command not found** - Verify the command exists in your PATH
2. **Permission denied** - Check execute permissions on the command/script
3. **Missing dependencies** - Ensure required packages are installed

### Remote Server Issues

1. **Network connectivity** - Test URL accessibility with curl or browser
2. **Firewall/proxy** - Check if network policies block connections
3. **Authentication** - Verify API keys and tokens are valid

## Security Considerations

- **API Keys**: Store sensitive values in environment variables, not config files
- **Network Access**: Remote HTTP/WebSocket servers make network requests from your machine
- **Command Execution**: stdio servers execute commands on your local system
- **File Access**: Filesystem servers access files based on their configuration

## Best Practices

1. **Use specific paths** for filesystem access instead of home directory access
2. **Set appropriate timeouts** for remote services based on expected response times
3. **Monitor network usage** when connecting to remote MCP services
4. **Regular updates** - Keep MCP servers updated for security and features
5. **Test connections** - Verify MCP server connectivity before adding to production configs

## Advanced Configuration

### Multiple Instances of Same Server

```json
{
	"mcpServers": [
		{
			"name": "filesystem-work",
			"transport": "stdio",
			"command": "npx",
			"args": ["@modelcontextprotocol/server-filesystem", "/work/projects"]
		},
		{
			"name": "filesystem-home",
			"transport": "stdio",
			"command": "npx",
			"args": [
				"@modelcontextprotocol/server-filesystem",
				"/home/user/documents"
			]
		}
	]
}
```

### Hybrid Local/Remote Setup

```json
{
	"mcpServers": [
		{
			"name": "local-tools",
			"transport": "stdio",
			"command": "python",
			"args": ["./custom_mcp_server.py"]
		},
		{
			"name": "cloud-search",
			"transport": "http",
			"url": "https://api.search-service.com/mcp",
			"timeout": 45000
		}
	]
}
```

For more examples and community-maintained configurations, see the [MCP servers repository](https://github.com/modelcontextprotocol/servers).

## Hierarchical Configuration Loading

Nanocoder supports hierarchical MCP server configuration loading with the following precedence order (highest to lowest):

1. **Project-level** (highest priority):
   - `.mcp.json` - Primary project-level config in project root
   - `mcp.json` - Alternative project-level config in project root
   - `.nanocoder/mcp.json` - Nanocoder-specific directory config
   - `.claude/mcp.json` - Claude Code compatibility config
   - `.nanocoder/mcp.local.json` - Local overrides (gitignored, highest priority)

2. **Global-level** (lowest priority):
   - Global `agents.config.json` in user config directory

Both project-level and global configurations are loaded and merged together, with project-level configurations taking precedence over global ones. This allows teams to collaborate on project-specific MCP server configurations while maintaining global settings.

The `/mcp` command displays the source level (e.g., [project], [global]) next to each server name to indicate where each configuration originated.
