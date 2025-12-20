/**
 * Cache management for models.dev data
 * Stores model database in XDG_CACHE_HOME for fast lookup
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {xdgCache} from 'xdg-basedir';
import type {CachedModelsData, ModelsDevDatabase} from './models-types.js';
import {CACHE_MODELS_EXPIRATION_MS} from '@/constants';

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
		console.warn('Failed to read models cache:', error);
		return null;
	}
}

export function writeCache(data: ModelsDevDatabase): void {
	try {
		ensureCacheDir();

		const cached: CachedModelsData = {
			data,
			fetchedAt: Date.now(),
			expiresAt: Date.now() + CACHE_MODELS_EXPIRATION_MS,
		};

		const cachePath = getCacheFilePath();
		fs.writeFileSync(cachePath, JSON.stringify(cached, null, 2), 'utf-8');
	} catch (error) {
		console.warn('Failed to write models cache:', error);
	}
}
