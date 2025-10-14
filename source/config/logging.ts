import {loadPreferences, savePreferences} from '@/config/preferences';
import {logInfo, logError} from '@/utils/message-queue';

import type {LogLevel} from '@/types/index';

export type {LogLevel};

let currentLogLevel: LogLevel = 'normal';

// Initialize log level from preferences
export function initializeLogging(): void {
	const preferences = loadPreferences();
	currentLogLevel = (preferences as any).logLevel || 'normal';
}

export function getLogLevel(): LogLevel {
	return currentLogLevel;
}

export function setLogLevel(level: LogLevel): void {
	currentLogLevel = level;
	const preferences = loadPreferences();
	(preferences as any).logLevel = level;
	savePreferences(preferences);
}

// Helper to determine if a log should be shown
export function shouldLog(level: 'info' | 'warn' | 'error' | 'debug'): boolean {
	if (currentLogLevel === 'silent') {
		// In silent mode, only show errors
		return level === 'error';
	}

	if (currentLogLevel === 'normal') {
		// In normal mode, don't show debug or most info logs
		return level === 'error' || level === 'warn';
	}

	// In verbose mode, show everything
	return true;
}

// Wrapper for console methods that respects log level
export const logger = {
	info: (...args: any[]) => {
		if (shouldLog('info')) {
			logInfo(args.join(' '));
		}
	},
	warn: (...args: any[]) => {
		if (shouldLog('warn')) {
			logError(args.join(' '));
		}
	},
	error: (...args: any[]) => {
		if (shouldLog('error')) {
			logError(args.join(' '));
		}
	},
	debug: (...args: any[]) => {
		if (shouldLog('debug')) {
			logInfo(args.join(' '));
		}
	},
};

// Special logging for important user-facing messages that should always show
export function logImportant(...args: any[]): void {
	logInfo(args.join(' '));
}
