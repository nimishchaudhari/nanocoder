import {fileURLToPath} from 'url';
import {dirname} from 'path';
export type InstallationMethod = 'npm' | 'homebrew' | 'nix' | 'unknown';

// Define a safe process wrapper to avoid using `any` while keeping compatibility
type MaybeProcess = {
	env?: {[key: string]: string | undefined};
	argv?: string[];
};

const safeProcess: MaybeProcess =
	typeof process !== 'undefined' ? (process as unknown as MaybeProcess) : {};

/**
 * Detects how Nanocoder was installed by inspecting the module's runtime path.
 * This is more reliable than process.execPath, which points to the Node binary.
 * An environment variable `NANOCODER_INSTALL_METHOD` can be used to override detection for testing.
 * @returns {InstallationMethod} The detected installation method.
 */
export function detectInstallationMethod(): InstallationMethod {
	// Env var override has highest priority for testing / debugging
	const envOverride = safeProcess.env?.NANOCODER_INSTALL_METHOD;
	if (
		envOverride &&
		['npm', 'homebrew', 'nix', 'unknown'].includes(envOverride)
	) {
		return envOverride as InstallationMethod;
	}

	// Use the module path of this file (compiled output in `dist`) to determine how it was installed.
	// This is more reliable than process.execPath in most Node installations.
	const modulePath = dirname(fileURLToPath(import.meta.url));

	// Homebrew puts the package under a Cellar directory, often under /opt/homebrew or /usr/local
	if (modulePath.includes('Cellar') || modulePath.includes('/homebrew/')) {
		return 'homebrew';
	}

	// Nix store has `/nix/store/` path with store hashes
	if (modulePath.includes('/nix/store/')) {
		return 'nix';
	}

	// Node/npm-based installs will include node_modules in the module path
	if (modulePath.includes('node_modules')) {
		return 'npm';
	}

	return 'unknown';
}
