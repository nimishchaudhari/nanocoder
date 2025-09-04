import type {AppConfig, Colors} from '../types/index.js';
import {existsSync, readFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {logError} from '../utils/message-queue.js';

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

export const colors: Colors = {
	white: '#c0caf5',
	black: '#1a1b26',
	primary: '#bb9af7',
	tool: '#7dcfff',
	success: '#7AF778',
	error: '#f7768e',
	secondary: '#565f89',
	info: '#2ac3de',
	warning: '#e0af68',
	// Diff highlight colors (Tokyo Night theme)
	diffAdded: '#1e2f1e', // Dark green background for added lines
	diffRemoved: '#2f1e1e', // Dark red background for removed lines
	diffAddedText: '#9ece6a', // Green text for added content
	diffRemovedText: '#f7768e', // Red text for removed content
};

// Get the package root directory (where this module is installed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go up from dist/config to package root, then to source/prompt.md
export const promptPath = join(__dirname, '../../source/prompt.md');
