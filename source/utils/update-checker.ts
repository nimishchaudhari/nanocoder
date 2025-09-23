import {readFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';
import {loadPreferences, savePreferences} from '../config/preferences.js';
import {shouldLog} from '../config/logging.js';
import {logError} from './message-queue.js';
import type {NpmRegistryResponse, UpdateInfo} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compare two semver version strings
 * Returns true if latest is greater than current
 */
function isNewerVersion(current: string, latest: string): boolean {
	const parseVersion = (version: string) => {
		const clean = version.replace(/^v/, '').split('-')[0]; // Remove 'v' prefix and pre-release info
		return clean.split('.').map(num => parseInt(num) || 0);
	};

	const currentParts = parseVersion(current);
	const latestParts = parseVersion(latest);

	const maxLength = Math.max(currentParts.length, latestParts.length);

	for (let i = 0; i < maxLength; i++) {
		const currentPart = currentParts[i] || 0;
		const latestPart = latestParts[i] || 0;

		if (latestPart > currentPart) {
			return true;
		} else if (latestPart < currentPart) {
			return false;
		}
	}

	return false;
}

/**
 * Get the current package version from package.json
 */
function getCurrentVersion(): string {
	try {
		const packageJsonPath = join(__dirname, '../../package.json');
		const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
		return packageJson.version;
	} catch (error) {
		if (shouldLog('warn')) {
			logError(`Failed to read current version: ${error}`);
		}
		return '0.0.0';
	}
}

/**
 * Fetch the latest version from npm registry
 */
async function fetchLatestVersion(): Promise<string | null> {
	try {
		const response = await fetch(
			'https://registry.npmjs.org/@nanocollective/nanocoder/latest',
			{
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'User-Agent': 'nanocoder-update-checker',
				},
				// Add timeout
				signal: AbortSignal.timeout(10000), // 10 second timeout
			},
		);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const data = (await response.json()) as NpmRegistryResponse;
		return data.version;
	} catch (error) {
		if (shouldLog('warn')) {
			logError(`Failed to fetch latest version: ${error}`);
		}
		return null;
	}
}

/**
 * Update the last update check timestamp in preferences
 */
function updateLastCheckTime(): void {
	const preferences = loadPreferences();
	preferences.lastUpdateCheck = Date.now();
	savePreferences(preferences);
}

/**
 * Check for package updates
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
	const currentVersion = getCurrentVersion();

	try {
		const latestVersion = await fetchLatestVersion();
		updateLastCheckTime();

		if (!latestVersion) {
			return {
				hasUpdate: false,
				currentVersion,
			};
		}

		const hasUpdate = isNewerVersion(currentVersion, latestVersion);

		return {
			hasUpdate,
			currentVersion,
			latestVersion,
			updateCommand: hasUpdate
				? 'npm update -g @nanocollective/nanocoder'
				: undefined,
		};
	} catch (error) {
		if (shouldLog('warn')) {
			logError(`Update check failed: ${error}`);
		}

		// Still update the timestamp to prevent hammering the API on repeated failures
		updateLastCheckTime();

		return {
			hasUpdate: false,
			currentVersion,
		};
	}
}
