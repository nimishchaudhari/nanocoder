import {Command} from '@/types/index';
import {checkForUpdates} from '@/utils/update-checker';
import {logInfo, logError} from '@/utils/message-queue';
import {toolRegistry} from '@/tools/index';
import React from 'react';
import SuccessMessage from '@/components/success-message';

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
				logInfo('Downloading and installing the latest Nanocoder update...', true);

				// Run the update command
				await toolRegistry.execute_bash({
					command: 'npm update -g @nanocollective/nanocoder',
				});

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
			const errorMessage = error instanceof Error ? error.message : String(error);
			logError(`Failed to update Nanocoder: ${errorMessage}`, true);
			return React.createElement(React.Fragment);
		}
	},
};
