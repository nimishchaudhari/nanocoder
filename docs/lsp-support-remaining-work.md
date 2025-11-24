# LSP Support & IDE Plugin - Implementation Status

This document tracks what has been completed from the [original discussion](https://github.com/Nano-Collective/organisation/discussions/13).

## Completed

### Phase 1: LSP Foundation

The core LSP client integration in Nanocoder CLI has been implemented.

#### 1.1 LSP Client Implementation

- [x] Create LSP client module for connecting to language servers (`source/lsp/lsp-client.ts`)
- [x] Implement JSON-RPC message handling for LSP protocol (`source/lsp/protocol.ts`)
- [x] Support for LSP lifecycle (initialize, initialized, shutdown)

#### 1.2 Language Server Auto-Discovery

- [x] Detect installed language servers on the system (`source/lsp/server-discovery.ts`)
- [x] Support common language servers:
  - TypeScript/JavaScript (`typescript-language-server`)
  - Python (`pylsp`, `pyright`)
  - Rust (`rust-analyzer`)
  - Go (`gopls`)
  - C/C++ (`clangd`)
  - JSON, HTML, CSS, YAML, Bash, Lua
- [x] Check both global PATH and local `node_modules/.bin` for language servers
- [x] Allow manual configuration of language server paths in `agents.config.json`

#### 1.3 Multi-Language Support

- [x] Connect to multiple language servers simultaneously (`source/lsp/lsp-manager.ts`)
- [x] Route requests to appropriate language server based on file type
- [x] Handle graceful fallback when LSP unavailable

---

### Phase 2: VS Code Extension

The VS Code extension has been implemented with full functionality:

- [x] **WebSocket Communication**: CLI starts a WebSocket server on port 51820 when run with `--vscode`
- [x] **Connection Management**: Auto-connect, reconnect on disconnect, status bar integration
- [x] **Live Diff Preview**: File changes are shown in VS Code's diff viewer before approval
- [x] **Diagnostics Sharing**: Extension sends VS Code's diagnostics to CLI via `get_diagnostics` tool
- [x] **Extension Packaging**: Built via `pnpm run build:vscode` from project root
- [x] **CLI Integration**: `--vscode` and `--vscode-port` flags implemented

#### 2.1 Context Menu Integration

- [x] Add "Ask Nanocoder about this" to right-click context menu
- [x] Send selected code as context with prompts to CLI
- [x] "Explain this code" quick action
- [x] "Refactor this code" quick action

**Implemented Files:**

- `source/vscode/` - Server and protocol implementation
- `plugins/vscode/` - VS Code extension source
- `source/hooks/useVSCodeServer.tsx` - React hook for server management

---

### Phase 3: AI Tools Integration

One LSP-powered AI tool has been implemented:

- [x] `get_diagnostics` - Get errors and warnings for a file/project (`source/tools/lsp-get-diagnostics.tsx`)
  - Prefers VS Code diagnostics when connected via `--vscode` flag
  - Falls back to local LSP servers when VS Code not connected

---

## Architecture

### LSP Client Design

The LSP client is implemented similarly to the existing MCP client:

```
source/
├── lsp/
│   ├── lsp-client.ts        # LSP server connection manager
│   ├── lsp-manager.ts       # Multi-language support with routing
│   ├── server-discovery.ts  # Auto-detect installed LSPs
│   ├── protocol.ts          # LSP message types
│   └── index.ts             # Public exports
```

### Configuration

LSP servers are auto-discovered by default. Custom configuration can be added to `agents.config.json`:

```json
{
  "nanocoder": {
    "lspServers": [
      {
        "name": "TypeScript",
        "command": "typescript-language-server",
        "args": ["--stdio"],
        "languages": ["ts", "tsx", "js", "jsx"]
      }
    ]
  }
}
```

### Tool Registration

The LSP diagnostics tool is integrated with the existing tool system in `source/tools/index.ts`:

```typescript
import {getDiagnosticsTool} from '@/tools/lsp-get-diagnostics';

export const toolDefinitions: ToolDefinition[] = [
  // ... other tools
  getDiagnosticsTool,
];
```

---

## Usage

### Using the Diagnostics Tool

The AI can use this tool to check for errors and warnings:

```
get_diagnostics({path: "src/app.tsx"})
```

When running with `--vscode`, this will fetch diagnostics directly from VS Code (TypeScript, ESLint, etc.). Otherwise, it falls back to any locally running LSP servers.

### VS Code Integration

1. Build the extension: `pnpm run build:vscode`
2. Install the VSIX from `assets/nanocoder-vscode.vsix`
3. Run nanocoder with: `nanocoder --vscode`
4. The extension auto-connects and enables diagnostics sharing

### VS Code Context Menu

1. Select code in VS Code
2. Right-click to open context menu
3. Choose from "Nanocoder" submenu:
   - "Ask Nanocoder about this" - Opens input box for custom question
   - "Explain this code" - Sends explanation request
   - "Refactor this code" - Sends refactoring request

---

## Current Branch

Development is on `feature/lsp-support`.
