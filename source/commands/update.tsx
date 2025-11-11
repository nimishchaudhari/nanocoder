import {Command} from '@/types/index';
import {checkForUpdates} from '@/utils/update-checker';
import {logInfo, logError} from '@/utils/message-queue';
import {toolRegistry} from '@/tools/index';
import React from 'react';
import SuccessMessage from '@/components/success-message';
import InfoMessage from '@/components/info-message';
import ErrorMessage from '@/components/error-message';

export const updateCommand: Command = {
	name: 'update',
	description: 'Update Nanocoder to the latest version',
	handler: async (_args: string[]) => {
		// Show initial checking message
		logInfo('Checking for available updates...', true);

		try {
			const updateInfo = await checkForUpdates();

			if (updateInfo.hasUpdate) {
				// Show updating message
				logInfo(
					'Downloading and installing the latest Nanocoder update...',
					true,
				);

				// Run update command if provided; otherwise show informative message
				if (updateInfo.updateCommand) {
					try {
						const result = await toolRegistry.execute_bash({
							command: updateInfo.updateCommand,
						});

						const normalized = String(result || '').toLowerCase();
						const failureIndicators = [
							'command not found',
							'not found',
							'permission denied',
							'no such file or directory',
							'error',
						];

						const failed = failureIndicators.some(ind =>
							normalized.includes(ind),
						);
						if (failed) {
							logError('Update command executed but returned an error', true);
							return React.createElement(ErrorMessage, {
								message: `Update command failed. Output: ${String(result)}`,
								hideBox: true,
							});
						}

						// Show success message
						return React.createElement(SuccessMessage, {
							message:
								'Nanocoder has been updated to the latest version. Please restart your session to apply the update.',
							hideBox: true,
						});
					} catch (err) {
						const errorMessage =
							err instanceof Error ? err.message : String(err);
						logError(`Failed to execute update command: ${errorMessage}`, true);
						return React.createElement(ErrorMessage, {
							message: `Failed to execute update command: ${errorMessage}`,
							hideBox: true,
						});
					}
				}

				if (updateInfo.updateMessage) {
					// We cannot run an automated update; show instructions to user
					return React.createElement(InfoMessage, {
						message: updateInfo.updateMessage,
						hideBox: true,
					});
				}

				// Show success message
				return React.createElement(SuccessMessage, {
					message:
						'Nanocoder has been updated to the latest version. Please restart your session to apply the update.',
					hideBox: true,
				});
			} else {
				// Already up to date
				return React.createElement(SuccessMessage, {
					message: 'Nanocoder is already up to date.',
					hideBox: true,
				});
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			logError(`Failed to update Nanocoder: ${errorMessage}`, true);
			return React.createElement(React.Fragment);
		}
	},
};
