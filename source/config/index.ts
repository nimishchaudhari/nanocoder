import type {AppConfig, Colors} from '../types/index.js';
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {homedir} from 'os';
import {config as loadEnv} from 'dotenv';
import {logError} from '../utils/message-queue.js';
import {loadPreferences} from './preferences.js';
import {getThemeColors, defaultTheme} from './themes.js';
import {substituteEnvVars} from './env-substitution.js';


// Load .env file from working directory (shell environment takes precedence)
loadEnv({path: join(process.cwd(), '.env')});

// Hold a map of what config files are where
export const confDirMap: Record<string, string> = {};

export function getClosestConfigFile(fileName: string='agents.config.json'): string {
	try{
		// 'win32' will set this correctly via the environment.
		// The config path can be set via the `APPDATA` environment variable.
		// For darwin, we set the correct app path.
		// We try to use `process.env.$XDG_CONFIG_HOME`, but cant count on it.
		// For all other unix-like systems, we use the $HOME/.config
		let appDataPath: string = process.env.APPDATA || process.env.XDG_CONFIG_HOME || (process.platform === 'darwin'
			? `${process.env.HOME}/Library/Preferences`
			: `${process.env.HOME}/.config`
		);

		// There doesn't seem to be a place to pull an "app name"
		const appName = 'nanocoder';
		appDataPath += `/${appName}`;

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
		if (existsSync(join(appDataPath, fileName))) {
			confDirMap[fileName] = join(appDataPath, fileName);

			return join(appDataPath, fileName);
		}

		// If we cant find any, lets assume this is the first user run, create the
		// correct file and direct the user to configure them correctly,
		if (!existsSync(appDataPath)) {
			// Maybe add a better sample config?
			let sampleConfig = {};

			mkdirSync(appDataPath, {recursive: true});
			writeFileSync(join(appDataPath, fileName), JSON.stringify(sampleConfig, null, 4), 'utf-8');

			// Inform the user what just happened.
			console.log(`Provider configuration is required!`);
			console.log(`Please edit ${join(appDataPath, 'agents.config.json')}`);
			console.log(`Refer to https://github.com/Nano-Collective/nanocoder for configuration help`);
			// Kill the app since we cant do anything with out configuration.
			process.exit(1);
		}
	}catch (error){
		logError(`Failed to load ${fileName}: ${error}`);
	}

	// The code should never hit this, but it makes the TS compiler happy.
	return fileName;
}

// Function to load app configuration from agents.config.json if it exists
function loadAppConfig(): AppConfig {
	const agentsJsonPath = join(getClosestConfigFile(), 'agents.config.json');

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
	'../../source/app/prompts/main-prompt.md',
);
