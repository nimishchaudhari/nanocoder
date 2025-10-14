import {useState, useEffect, useCallback} from 'react';
import path from 'path';
import {loadPreferences, savePreferences} from '@/config/preferences';
import {logError} from '@/utils/message-queue';
import {shouldLog} from '@/config/logging';

export interface UseDirectoryTrustReturn {
	isTrusted: boolean;
	handleConfirmTrust: () => void;
	isTrustLoading: boolean;
	isTrustedError: string | null;
}

/**
 * Custom hook for managing directory trust functionality.
 * Handles checking if a directory is trusted and adding it to trusted directories.
 *
 * @param directory - The directory path to check trust for (defaults to current working directory)
 * @returns Object containing trust state and handler functions
 */
export function useDirectoryTrust(
	directory: string = process.cwd(),
): UseDirectoryTrustReturn {
	const [isTrusted, setIsTrusted] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Check if directory is trusted on mount and when directory changes
	useEffect(() => {
		const checkTrustStatus = async () => {
			try {
				setIsLoading(true);
				setError(null);

				const preferences = loadPreferences();
				const trustedDirectories = preferences.trustedDirectories || [];

				// Normalize paths for comparison (resolve any relative path components)
				const normalizedDirectory = path.resolve(directory);
				const isTrustedDir = trustedDirectories.some(
					trustedDir => path.resolve(trustedDir) === normalizedDirectory,
				);

				setIsTrusted(isTrustedDir);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : 'Unknown error occurred';
				setError(`Failed to check directory trust status: ${errorMessage}`);

				if (shouldLog('warn')) {
					logError(`useDirectoryTrust: ${errorMessage}`);
				}
			} finally {
				setIsLoading(false);
			}
		};

		checkTrustStatus();
	}, [directory]);

	// Handler to confirm trust for the current directory
	const handleConfirmTrust = useCallback(() => {
		try {
			setError(null);

			const preferences = loadPreferences();
			const trustedDirectories = preferences.trustedDirectories || [];

			// Normalize the directory path before storing and checking
			const normalizedDirectory = path.resolve(directory);

			// Only add if not already trusted (check using normalized paths)
			if (
				!trustedDirectories.some(
					trustedDir => path.resolve(trustedDir) === normalizedDirectory,
				)
			) {
				trustedDirectories.push(normalizedDirectory);
				preferences.trustedDirectories = trustedDirectories;
				savePreferences(preferences);

				if (shouldLog('info')) {
					logError(
						`useDirectoryTrust (info): Directory added to trusted list: ${normalizedDirectory}`,
					);
				}
			}

			setIsTrusted(true);
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : 'Unknown error occurred';
			setError(`Failed to save directory trust: ${errorMessage}`);

			if (shouldLog('warn')) {
				logError(`useDirectoryTrust: ${errorMessage}`);
			}
		}
	}, [directory]);

	return {
		isTrusted,
		handleConfirmTrust,
		isTrustLoading: isLoading,
		isTrustedError: error,
	};
}
