import type {AppConfig, Colors} from '@/types/index';
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {homedir} from 'os';
import {config as loadEnv} from 'dotenv';
import {logError} from '@/utils/message-queue';
import {loadPreferences} from '@/config/preferences';
import {getThemeColors, defaultTheme} from '@/config/themes';
import {substituteEnvVars} from '@/config/env-substitution';

// Load .env file from working directory (shell environment takes precedence)
// Suppress dotenv console output by temporarily redirecting stdout
const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
	const originalWrite = process.stdout.write;
	process.stdout.write = () => true;
	try {
		loadEnv({path: envPath});
	} finally {
		process.stdout.write = originalWrite;
	}
}

// Hold a map of what config files are where
export const confDirMap: Record<string, string> = {};

// Determine the correct path for local app configuration
function getAppDataPath(): string {
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

// Find the closest config file for the requested configuration file
export function getClosestConfigFile(fileName: string): string {
	try {
		const appDataPath = getAppDataPath();

		// First, lets check for a working directory config
		if (existsSync(join(process.cwd(), fileName))) {
			confDirMap[fileName] = join(process.cwd(), fileName);

			return join(process.cwd(), fileName);
		}

		// Next lets check the $HOME for a hidden file. This should only be for
		// legacy support
		if (existsSync(join(homedir(), `.${fileName}`))) {
			confDirMap[fileName] = join(homedir(), `.${fileName}`);

			return join(homedir(), `.${fileName}`);
		}

		// Last, lets look for an user level config.

		// If the file doesn't exist, create it
		if (!existsSync(join(appDataPath, fileName))) {
			createDefaultConfFile(appDataPath, fileName);
		}

		confDirMap[fileName] = join(appDataPath, fileName);

		return join(appDataPath, fileName);
	} catch (error) {
		logError(`Failed to load ${fileName}: ${error}`);
	}

	// The code should never hit this, but it makes the TS compiler happy.
	return fileName;
}

export function createDefaultConfFile(
	filePath: string,
	fileName: string,
): void {
	try {
		// If we cant find any, lets assume this is the first user run, create the
		// correct file and direct the user to configure them correctly,
		if (!existsSync(join(filePath, fileName))) {
			// Maybe add a better sample config?
			let sampleConfig = {};

			mkdirSync(filePath, {recursive: true});
			writeFileSync(
				join(filePath, fileName),
				JSON.stringify(sampleConfig, null, 2),
				'utf-8',
			);
		}
	} catch (error) {
		logError(`Failed to write ${filePath}: ${error}`);
	}
}

// Function to load app configuration from agents.config.json if it exists
function loadAppConfig(): AppConfig {
	const agentsJsonPath = getClosestConfigFile('agents.config.json');

	try {
		const rawData = readFileSync(agentsJsonPath, 'utf-8');
		const agentsData = JSON.parse(rawData);

		// Apply environment variable substitution
		const processedData = substituteEnvVars(agentsData);

		if (processedData.nanocoder) {
			return {
				providers: processedData.nanocoder.providers,
				mcpServers: processedData.nanocoder.mcpServers,
			};
		}
	} catch (error) {
		logError(`Failed to parse : ${'agents.config.json'}`);
	}

	return {};
}

export const appConfig = loadAppConfig();

// Legacy config for backwards compatibility (no longer specific to any provider)
export const legacyConfig = {
	maxTokens: 4096,
	contextSize: 4000,
};

export function getColors(): Colors {
	const preferences = loadPreferences();
	const selectedTheme = preferences.selectedTheme || defaultTheme;
	return getThemeColors(selectedTheme);
}

// Legacy export for backwards compatibility
export const colors: Colors = getColors();

// Get the package root directory (where this module is installed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go up from dist/config to package root, then to source/app/prompts/main-prompt.md
export const promptPath = join(
	__dirname,
	'@/source/app/prompts/main-prompt.md',
);
