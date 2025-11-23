# VS Code Extension

Nanocoder includes a VS Code extension that provides live diff previews of file changes directly in your editor. When the AI suggests file modifications, you can see exactly what will change before approving.

## Installation

There are two ways to install the VS Code extension:

### Automatic Installation (Recommended)

When you run Nanocoder with the `--vscode` flag for the first time, it will automatically prompt you to install the extension:

```bash
nanocoder --vscode
```

If the extension isn't installed, you'll see a prompt asking if you'd like to install it. Select "Yes" to install it.

### Manual Installation

If you prefer to install manually or the automatic installation doesn't work:

1. **Locate the VSIX file**: After installing Nanocoder, the extension is bundled at:

   - **npm global install**: `$(npm root -g)/@nanocollective/nanocoder/assets/nanocoder-vscode.vsix`
   - **From source**: `./assets/nanocoder-vscode.vsix`

2. **Install via VS Code CLI**:

   ```bash
   code --install-extension /path/to/nanocoder-vscode.vsix
   ```

3. **Or install via VS Code UI**:

   - Open VS Code
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Extensions: Install from VSIX..."
   - Select the `nanocoder-vscode.vsix` file

4. **Reload VS Code** after installation

## Usage

1. **Start Nanocoder with VS Code integration**:

   ```bash
   nanocoder --vscode
   ```

   Or from within VS Code:

   - Press `Cmd+Shift+P` / `Ctrl+Shift+P`
   - Run "Nanocoder: Start Nanocoder CLI"

2. **The extension connects automatically** when Nanocoder starts with `--vscode`

3. **View diff previews**: When Nanocoder suggests file changes, a diff view automatically opens in VS Code showing:

   - The original file content on the left
   - The proposed changes on the right
   - Syntax highlighting for the file type

4. **Approve or reject changes**: Use the Nanocoder CLI to approve or reject the changes. The diff preview is read-only and for visualization only.

5. **Status bar**: The Nanocoder status bar item shows connection status:
   - `$(plug) Nanocoder` - Not connected (click to connect)
   - `$(check) Nanocoder` - Connected to CLI
   - `$(sync~spin) Connecting...` - Connection in progress

## Configuration

The extension can be configured in VS Code settings (`Cmd+,` / `Ctrl+,`):

| Setting                     | Default | Description                                       |
| --------------------------- | ------- | ------------------------------------------------- |
| `nanocoder.autoConnect`     | `true`  | Automatically connect to Nanocoder CLI on startup |
| `nanocoder.serverPort`      | `51820` | Port for WebSocket communication with CLI         |
| `nanocoder.showDiffPreview` | `true`  | Automatically show diff preview for file changes  |

**Example settings.json**:

```json
{
	"nanocoder.autoConnect": true,
	"nanocoder.serverPort": 51820,
	"nanocoder.showDiffPreview": true
}
```

## Commands

Access these commands via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command                                | Description                                  |
| -------------------------------------- | -------------------------------------------- |
| `Nanocoder: Connect to Nanocoder`      | Manually connect to running Nanocoder CLI    |
| `Nanocoder: Disconnect from Nanocoder` | Disconnect from CLI                          |
| `Nanocoder: Start Nanocoder CLI`       | Open terminal and start `nanocoder --vscode` |

## Troubleshooting

**Extension not connecting?**

- Ensure Nanocoder is running with `--vscode` flag
- Check the Nanocoder output channel in VS Code (`View > Output > Nanocoder`)
- Verify port 51820 is not blocked by a firewall

**Diff not showing?**

- Check that `nanocoder.showDiffPreview` is enabled in settings
- Ensure the extension is connected (check status bar)

**Connection drops frequently?**

- This can happen if you restart the CLI. Click the status bar to reconnect.
