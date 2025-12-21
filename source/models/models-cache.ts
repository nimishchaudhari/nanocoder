/**
 * Cache management for models.dev data
 * Stores model database in XDG_CACHE_HOME for fast lookup
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {formatError} from '@/utils/error-formatter';
import {getLogger} from '@/utils/logging';
import {xdgCache} from 'xdg-basedir';
import type {CachedModelsData, ModelsDevDatabase} from './models-types.js';

/**
 * Cache expiration time: 7 days in milliseconds
 */
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_CACHE_DIR =
	process.platform === 'darwin'
		? path.join(process.env.HOME || '~', 'Library', 'Caches')
		: path.join(process.env.HOME || '~', '.cache');

function getCacheDir(): string {
	const cacheBase = xdgCache || DEFAULT_CACHE_DIR;
	return path.join(cacheBase, 'nanocoder');
}

function getCacheFilePath(): string {
	return path.join(getCacheDir(), 'models.json');
}

function ensureCacheDir(): void {
	const dir = getCacheDir();
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {recursive: true});
	}
}

export function readCache(): CachedModelsData | null {
	try {
		const cachePath = getCacheFilePath();

		if (!fs.existsSync(cachePath)) {
			return null;
		}

		const content = fs.readFileSync(cachePath, 'utf-8');
		const cached = JSON.parse(content) as CachedModelsData;

		// Check if cache is expired
		if (Date.now() > cached.expiresAt) {
			return null;
		}

		return cached;
	} catch (error) {
		// If there's any error reading cache, return null to trigger fresh fetch
		const logger = getLogger();
		logger.warn({error: formatError(error)}, 'Failed to read models cache');
		return null;
	}
}

export function writeCache(data: ModelsDevDatabase): void {
	try {
		ensureCacheDir();

		const cached: CachedModelsData = {
			data,
			fetchedAt: Date.now(),
			expiresAt: Date.now() + CACHE_EXPIRATION_MS,
		};

		const cachePath = getCacheFilePath();
		fs.writeFileSync(cachePath, JSON.stringify(cached, null, 2), 'utf-8');
	} catch (error) {
		const logger = getLogger();
		logger.warn({error: formatError(error)}, 'Failed to write models cache');
	}
}
