import React, {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import {
	isVSCodeCliAvailable,
	isExtensionInstalled,
	installExtension,
} from '@/vscode/extension-installer';

interface VSCodeExtensionPromptProps {
	onComplete: () => void;
	onSkip: () => void;
}

type PromptState =
	| 'checking'
	| 'prompt'
	| 'installing'
	| 'success'
	| 'error'
	| 'no-cli';

/**
 * Ink component that prompts the user to install the VS Code extension
 * when running with --vscode flag and the extension isn't installed
 */
// Compute initial state synchronously
function getInitialState(): PromptState {
	if (isExtensionInstalled()) {
		return 'checking'; // Will trigger onComplete in effect
	}
	if (!isVSCodeCliAvailable()) {
		return 'no-cli';
	}
	return 'prompt';
}

export function VSCodeExtensionPrompt({
	onComplete,
	onSkip,
}: VSCodeExtensionPromptProps) {
	const [state, setState] = useState<PromptState>(getInitialState);
	const [message, setMessage] = useState('');

	const handleInstall = React.useCallback(async () => {
		const result = await installExtension();
		if (result.success) {
			setMessage(result.message);
			setState('success');
			// Auto-continue after showing success
			setTimeout(onComplete, 2000);
		} else {
			setMessage(result.message);
			setState('error');
			// Auto-continue after showing error
			setTimeout(onSkip, 3000);
		}
	}, [onComplete, onSkip]);

	// Handle already-installed case
	useEffect(() => {
		if (isExtensionInstalled()) {
			onComplete();
		}
	}, [onComplete]);

	useInput((input, key) => {
		if (state !== 'prompt') return;

		if (input.toLowerCase() === 'y' || key.return) {
			setState('installing');
			void handleInstall();
		} else if (input.toLowerCase() === 'n' || key.escape) {
			onSkip();
		}
	});

	if (state === 'checking') {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Text color="cyan">Checking VS Code extension...</Text>
			</Box>
		);
	}

	if (state === 'no-cli') {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Text color="yellow">
					VS Code CLI not found. To enable VS Code integration:
				</Text>
				<Box marginLeft={2} flexDirection="column" marginTop={1}>
					<Text color="gray">1. Open VS Code</Text>
					<Text color="gray">
						2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows/Linux)
					</Text>
					<Text color="gray">
						3. Type "Shell Command: Install 'code' command in PATH"
					</Text>
				</Box>
				<Box marginTop={1}>
					<Text color="gray">Continuing without VS Code integration...</Text>
				</Box>
			</Box>
		);
	}

	if (state === 'prompt') {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Box>
					<Text color="cyan">VS Code extension not detected. </Text>
					<Text color="white">Install it now? </Text>
					<Text color="gray">[Y/n]</Text>
				</Box>
				<Box marginTop={1}>
					<Text color="gray">
						The extension enables live diff previews in VS Code when Nanocoder
						modifies files.
					</Text>
				</Box>
			</Box>
		);
	}

	if (state === 'installing') {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Text color="cyan">Installing VS Code extension...</Text>
			</Box>
		);
	}

	if (state === 'success') {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Text color="green">✓ {message}</Text>
			</Box>
		);
	}

	if (state === 'error') {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Text color="red">✗ {message}</Text>
				<Text color="gray">Continuing without VS Code integration...</Text>
			</Box>
		);
	}

	return null;
}

/**
 * Check if we should show the extension install prompt
 * Returns true if --vscode flag is present and extension is not installed
 */
export function shouldPromptExtensionInstall(): boolean {
	const hasVSCodeFlag = process.argv.includes('--vscode');
	if (!hasVSCodeFlag) return false;

	// Don't prompt if extension is already installed
	if (isExtensionInstalled()) return false;

	return true;
}
