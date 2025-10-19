import {Command} from '@/types/index';
import React from 'react';
import {ConfigWizard} from '@/wizard/config-wizard';
import {Box, Text} from 'ink';
import {colors} from '@/config/index';

function WizardComplete({configPath}: {configPath: string}) {
	return (
		<Box flexDirection="column" paddingX={2} paddingY={1}>
			<Box marginBottom={1}>
				<Text color={colors.primary} bold>
					✓ Configuration wizard completed!
				</Text>
			</Box>
			<Text color={colors.white}>
				Configuration saved to: <Text color="cyan">{configPath}</Text>
			</Text>
			<Box marginTop={1}>
				<Text color={colors.secondary}>
					Restart Nanocoder to use the new configuration.
				</Text>
			</Box>
		</Box>
	);
}

function WizardCancelled() {
	return (
		<Box flexDirection="column" paddingX={2} paddingY={1}>
			<Text color={colors.secondary}>Configuration wizard cancelled.</Text>
		</Box>
	);
}

export const setupConfigCommand: Command = {
	name: 'setup-config',
	description: 'Launch interactive configuration wizard',
	handler: async (_args: string[], _messages, _metadata) => {
		const projectDir = process.cwd();

		// Return ConfigWizard component with handlers
		return new Promise((resolve) => {
			const handleComplete = (configPath: string) => {
				resolve(
					React.createElement(WizardComplete, {
						key: `wizard-complete-${Date.now()}`,
						configPath,
					}),
				);
			};

			const handleCancel = () => {
				resolve(
					React.createElement(WizardCancelled, {
						key: `wizard-cancelled-${Date.now()}`,
					}),
				);
			};

			// This won't work properly as the ConfigWizard is interactive
			// We need a different approach - the wizard should be integrated into the app state
			// For now, let's return a message directing users to use a different method
			resolve(
				React.createElement(
					Box,
					{
						flexDirection: 'column',
						paddingX: 2,
						paddingY: 1,
						key: `wizard-${Date.now()}`,
					},
					React.createElement(ConfigWizard, {
						projectDir,
						onComplete: handleComplete,
						onCancel: handleCancel,
					}),
				),
			);
		});
	},
};
