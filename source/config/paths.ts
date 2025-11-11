import {homedir} from 'os';
import {join} from 'path';

export function getAppDataPath(): string {
	return getConfigPath();
}

function getConfigPath(): string {
	// Allow explicit override via environment variable
	if (process.env.NANOCODER_CONFIG_DIR) {
		return process.env.NANOCODER_CONFIG_DIR;
	}

	// Platform-specific defaults
	let baseConfigPath: string;
	switch (process.platform) {
		case 'win32':
			baseConfigPath = process.env.APPDATA ?? join(homedir(), '.config');
			break;
		case 'darwin':
			baseConfigPath = join(homedir(), 'Library', 'Preferences');
			break;
		default:
			baseConfigPath =
				process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config');
	}
	return join(baseConfigPath, 'nanocoder');
}
