# Nanocoder VS Code Extension

VS Code integration for [Nanocoder](https://github.com/Nano-Collective/nanocoder) - a local-first AI coding assistant.

## Features

- **Live Diff Preview**: See file changes before they're applied
- **Sidebar Chat Panel**: Chat with your AI assistant directly in VS Code
- **Context Menu Integration**: Right-click to "Ask Nanocoder" about selected code
- **Pending Changes View**: Review and approve/reject file modifications
- **Diagnostics Sharing**: VS Code's LSP diagnostics are shared with nanocoder

## Installation

### From Source

1. Navigate to the extension directory:

   ```bash
   cd plugins/vscode
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build the extension:

   ```bash
   pnpm run build
   ```

4. Install in VS Code:
   - Open VS Code
   - Press `Ctrl+Shift+P` / `Cmd+Shift+P`
   - Type "Extensions: Install from VSIX..."
   - Select the generated `.vsix` file (after running `npm run package`)

### Development

```bash
# Watch for changes
npm run watch

# Package for distribution
npm run package
```

## Usage

### Starting Nanocoder with VS Code Support

Run nanocoder with the `--vscode` flag:

```bash
nanocoder --vscode
```

Or with a custom port:

```bash
nanocoder --vscode --vscode-port 51821
```

### Connecting from VS Code

1. The extension will automatically try to connect when VS Code starts
2. Click the "Nanocoder" status bar item to manually connect/disconnect
3. Use `Ctrl+Shift+C` / `Cmd+Shift+C` to open the chat panel

### Commands

- **Ask Nanocoder About Selection** (`Ctrl+Shift+N` / `Cmd+Shift+N`): Ask about selected code
- **Open Chat Panel** (`Ctrl+Shift+C` / `Cmd+Shift+C`): Open the sidebar chat
- **Connect/Disconnect**: Toggle connection to nanocoder CLI
- **Start CLI**: Launch nanocoder in a terminal (requires nanocoder to be installed globally)

### Configuration

| Setting                     | Default | Description                   |
| --------------------------- | ------- | ----------------------------- |
| `nanocoder.serverPort`      | `51820` | WebSocket server port         |
| `nanocoder.autoConnect`     | `true`  | Auto-connect on startup       |
| `nanocoder.autoStartCli`    | `false` | Auto-start CLI if not running |
| `nanocoder.showDiffPreview` | `true`  | Show diff preview for changes |

## Architecture

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   VS Code       │◄──────────────────►│   Nanocoder CLI  │
│   Extension     │    (port 51820)    │   (--vscode)     │
└─────────────────┘                    └──────────────────┘
        │                                       │
        ▼                                       ▼
  • Chat Panel                           • AI Processing
  • Diff Preview                         • Tool Execution
  • Pending Changes                      • File Operations
  • Diagnostics                          • Model Selection
```

## Protocol

The extension and CLI communicate via JSON messages over WebSocket:

### CLI → Extension

- `file_change`: Proposed file modification with diff
- `assistant_message`: AI response (streaming or final)
- `status`: Current model/provider/connection status
- `diagnostics_request`: Request LSP diagnostics

### Extension → CLI

- `send_prompt`: User message with optional context
- `apply_change` / `reject_change`: Approve/reject file changes
- `context`: Workspace info (open files, active file)
- `diagnostics_response`: LSP diagnostics data

## License

MIT - See the main [Nanocoder repository](https://github.com/Nano-Collective/nanocoder) for details.
