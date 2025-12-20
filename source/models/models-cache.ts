/**
 * Cache management for models.dev data
 * Stores model database in XDG_CACHE_HOME for fast lookup
 */

import {constants} from 'node:fs';
import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import * as path from 'node:path';
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

async function ensureCacheDir(): Promise<void> {
	const dir = getCacheDir();

	try {
		await access(dir, constants.F_OK);
	} catch {
		await mkdir(dir, {recursive: true});
	}
}

export async function readCache(): Promise<CachedModelsData | null> {
	try {
		const cachePath = getCacheFilePath();

		await access(cachePath, constants.F_OK);

		const content = await readFile(cachePath, 'utf-8');
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

export async function writeCache(data: ModelsDevDatabase): Promise<void> {
	try {
		await ensureCacheDir();

		const cached: CachedModelsData = {
			data,
			fetchedAt: Date.now(),
			expiresAt: Date.now() + CACHE_EXPIRATION_MS,
		};

		const cachePath = getCacheFilePath();
		await writeFile(cachePath, JSON.stringify(cached, null, 2), 'utf-8');
	} catch (error) {
		console.warn('Failed to write models cache:', error);
	}
}
