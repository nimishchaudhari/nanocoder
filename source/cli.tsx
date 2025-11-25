#!/usr/bin/env node
import {render} from 'ink';
import App from '@/app';

// Parse CLI arguments
const args = process.argv.slice(2);
const vscodeMode = args.includes('--vscode');

// Extract VS Code port if specified
let vscodePort: number | undefined;
const portArgIndex = args.findIndex(arg => arg === '--vscode-port');
if (portArgIndex !== -1 && args[portArgIndex + 1]) {
	const port = parseInt(args[portArgIndex + 1], 10);
	if (!isNaN(port) && port > 0 && port < 65536) {
		vscodePort = port;
	}
}

render(<App vscodeMode={vscodeMode} vscodePort={vscodePort} />);
