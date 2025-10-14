import {shouldLog} from '@/config/logging';
import {logError} from '@/utils/message-queue';

// Check if a string contains environment variable references
export function isEnvVarReference(str: string): boolean {
	if (typeof str !== 'string') {
		return false;
	}

	return /\$\{[A-Z_][A-Z0-9_]*(?::-[^}]*)?\}|\$[A-Z_][A-Z0-9_]*/g.test(str);
}

// Expand environment variable references in a string
export function expandEnvVar(str: string): string {
	if (typeof str !== 'string') {
		return str;
	}

	const regex = /\$\{([A-Z_][A-Z0-9_]*)(?::-(.*?))?\}|\$([A-Z_][A-Z0-9_]*)/g;

	return str.replace(
		regex,
		(match, bracedVarName, defaultValue, unbracedVarName) => {
			const varName = bracedVarName || unbracedVarName;
			const envValue = process.env[varName];

			if (envValue !== undefined) {
				return envValue;
			}

			if (defaultValue !== undefined) {
				return defaultValue;
			}

			if (shouldLog('warn')) {
				logError(
					`Environment variable ${varName} not found in config, using empty string`,
				);
			}

			return '';
		},
	);
}

// Recursively substitute environment variables in objects, arrays, and strings
export function substituteEnvVars(value: any): any {
	if (value === null || value === undefined) {
		return value;
	}

	if (typeof value === 'string') {
		return expandEnvVar(value);
	}

	if (Array.isArray(value)) {
		return value.map(item => substituteEnvVars(item));
	}

	if (typeof value === 'object') {
		const result: any = {};
		for (const [key, val] of Object.entries(value)) {
			result[key] = substituteEnvVars(val);
		}

		return result;
	}

	return value;
}
