/**
 * Determine the correct path for local app configuration
 * Handles platform-specific config paths (macOS, Linux, Windows)
 */
export function getAppDataPath(): string {
	// 'win32' will set this correctly via the environment.
	// The config path can be set via the `APPDATA` environment variable.
	let appDataPath =
		process.env.APPDATA ||
		// We try to use `process.env.$XDG_CONFIG_HOME`, but cant count on it.
		process.env.XDG_CONFIG_HOME ||
		// For darwin, we set the correct app path.
		(process.platform === 'darwin'
			? `${process.env.HOME}/Library/Preferences`
			: // For all other unix-like systems, we use the $HOME/.config
			  `${process.env.HOME}/.config`);

	// There doesn't seem to be a place to pull an "app name"
	const appName = 'nanocoder';
	appDataPath += `/${appName}`;

	return appDataPath;
}
