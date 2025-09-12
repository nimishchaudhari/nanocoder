import type {AppConfig, Colors} from '../types/index.js';
import {existsSync, readFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {logError} from '../utils/message-queue.js';
import {loadPreferences} from './preferences.js';
import {getThemeColors, defaultTheme} from './themes.js';

// Function to load app configuration from agents.config.json if it exists
function loadAppConfig(): AppConfig {
	const agentsJsonPath = join(process.cwd(), 'agents.config.json');

	if (existsSync(agentsJsonPath)) {
		try {
			const agentsData = JSON.parse(readFileSync(agentsJsonPath, 'utf-8'));

			if (agentsData.nanocoder) {
				return {
					providers: agentsData.nanocoder.providers,
					mcpServers: agentsData.nanocoder.mcpServers,
				};
			}
		} catch (error) {
			logError(`Failed to parse agents.config.json: ${error}`);
		}
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
export const promptPath = join(__dirname, '../../source/app/prompts/main-prompt.md');
