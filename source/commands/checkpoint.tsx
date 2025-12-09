import {Command, Message} from '@/types/index';
import React from 'react';
import SuccessMessage from '@/components/success-message';
import ErrorMessage from '@/components/error-message';
import InfoMessage from '@/components/info-message';
import WarningMessage from '@/components/warning-message';
import {CheckpointListDisplay} from '@/components/checkpoint-display';
import {CheckpointManager} from '@/services/checkpoint-manager';

// Global checkpoint manager instance
let checkpointManager: CheckpointManager | null = null;

function getCheckpointManager(): CheckpointManager {
	if (!checkpointManager) {
		checkpointManager = new CheckpointManager();
	}
	return checkpointManager;
}

/**
 * Show checkpoint command help
 */
function CheckpointHelp() {
	return (
		<InfoMessage
			message={`Checkpoint Commands:

/checkpoint create [name] - Create a new checkpoint
  • Creates a snapshot of current conversation and modified files
  • Auto-generates timestamped name if not provided
  • Example: /checkpoint create feature-auth-v1

/checkpoint list - List all available checkpoints
  • Shows checkpoint name, creation time, message count, and files changed

/checkpoint load - Interactive checkpoint selection and restore
  • Choose from available checkpoints
  • Shows confirmation before restoring
  • Optionally creates backup of current session

/checkpoint delete <name> - Delete a specific checkpoint
  • Permanently removes checkpoint and all its data
  • Shows confirmation before deletion

/checkpoint help - Show this help message

Note: Checkpoints are stored in your nanocoder config directory.`}
			hideBox={false}
		/>
	);
}

/**
 * Create checkpoint subcommand
 */
async function createCheckpoint(
	args: string[],
	messages: Message[],
	metadata: {provider: string; model: string},
): Promise<React.ReactElement> {
	try {
		const manager = getCheckpointManager();
		const name = args.length > 0 ? args.join(' ') : undefined;

		if (messages.length === 0) {
			return React.createElement(WarningMessage, {
				key: `warning-${Date.now()}`,
				message: 'No messages to checkpoint. Start a conversation first.',
				hideBox: true,
			});
		}

		const checkpointMetadata = await manager.saveCheckpoint(
			name,
			messages,
			metadata.provider,
			metadata.model,
		);

		return React.createElement(SuccessMessage, {
			key: `success-${Date.now()}`,
			message: `Checkpoint '${checkpointMetadata.name}' created successfully
  └─ ${checkpointMetadata.messageCount} messages saved
  └─ ${
		checkpointMetadata.filesChanged.length
	} files captured: ${checkpointMetadata.filesChanged.slice(0, 3).join(', ')}${
				checkpointMetadata.filesChanged.length > 3 ? '...' : ''
			}
  └─ Provider: ${checkpointMetadata.provider.name} (${
				checkpointMetadata.provider.model
			})`,
			hideBox: true,
		});
	} catch (error) {
		return React.createElement(ErrorMessage, {
			key: `error-${Date.now()}`,
			message: `Failed to create checkpoint: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			hideBox: true,
		});
	}
}

/**
 * List checkpoints subcommand
 */
async function listCheckpoints(): Promise<React.ReactElement> {
	try {
		const manager = getCheckpointManager();
		const checkpoints = await manager.listCheckpoints();

		return React.createElement(CheckpointListDisplay, {
			key: `list-${Date.now()}`,
			checkpoints,
		});
	} catch (error) {
		return React.createElement(ErrorMessage, {
			key: `error-${Date.now()}`,
			message: `Failed to list checkpoints: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			hideBox: true,
		});
	}
}

/**
 * Load checkpoint subcommand
 */
async function loadCheckpoint(
	args: string[],
	messages: Message[],
	metadata: {provider: string; model: string},
): Promise<React.ReactElement> {
	try {
		const manager = getCheckpointManager();
		const checkpointName = args.filter(arg => arg !== '--confirm').join(' ');

		if (checkpointName) {
			if (!manager.checkpointExists(checkpointName)) {
				return React.createElement(ErrorMessage, {
					key: `error-${Date.now()}`,
					message: `Checkpoint '${checkpointName}' does not exist. Use /checkpoint list to see available checkpoints.`,
					hideBox: true,
				});
			}

			const checkpointData = await manager.loadCheckpoint(checkpointName, {
				validateIntegrity: true,
			});

			await manager.restoreFiles(checkpointData);

			return React.createElement(
				'div',
				{
					key: `load-success-${Date.now()}`,
				},
				[
					React.createElement(SuccessMessage, {
						key: 'success',
						message: `✓ Checkpoint '${checkpointName}' files restored successfully`,
						hideBox: true,
					}),
					React.createElement(InfoMessage, {
						key: 'details',
						message: `Restored checkpoint:
  • ${checkpointData.fileSnapshots.size} file(s) restored to workspace
  • Provider: ${checkpointData.metadata.provider.name} (${
							checkpointData.metadata.provider.model
						})
  • Created: ${new Date(checkpointData.metadata.timestamp).toLocaleString()}
  
Note: Conversation history restore requires restarting Nanocoder.
The checkpoint contained ${checkpointData.metadata.messageCount} message(s).`,
						hideBox: true,
					}),
				],
			);
		}

		const checkpoints = await manager.listCheckpoints();

		if (checkpoints.length === 0) {
			return React.createElement(InfoMessage, {
				key: `info-${Date.now()}`,
				message:
					'No checkpoints available. Create one with /checkpoint create [name]',
				hideBox: true,
			});
		}

		const CheckpointSelector = (
			await import('@/components/checkpoint-selector')
		).default;

		return React.createElement(CheckpointSelector, {
			key: `selector-${Date.now()}`,
			checkpoints,
			currentMessageCount: messages.length,
			onSelect: (selectedName: string, createBackup: boolean) => {
				void (async () => {
					if (createBackup) {
						try {
							await manager.saveCheckpoint(
								`backup-${new Date().toISOString().replace(/[:.]/g, '-')}`,
								messages,
								metadata.provider,
								metadata.model,
							);
						} catch (error) {
							console.error('Failed to create backup:', error);
						}
					}

					const checkpointData = await manager.loadCheckpoint(selectedName, {
						validateIntegrity: true,
					});

					await manager.restoreFiles(checkpointData);
				})();
			},
			onCancel: () => {
				// Nothing to do, component will unmount
			},
		});
	} catch (error) {
		return React.createElement(ErrorMessage, {
			key: `error-${Date.now()}`,
			message: `Failed to load checkpoint: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			hideBox: true,
		});
	}
}

/**
 * Delete checkpoint subcommand
 */
async function deleteCheckpoint(args: string[]): Promise<React.ReactElement> {
	try {
		if (args.length === 0) {
			return React.createElement(ErrorMessage, {
				key: `error-${Date.now()}`,
				message:
					'Please specify a checkpoint name to delete. Usage: /checkpoint delete <name>',
				hideBox: true,
			});
		}

		const manager = getCheckpointManager();
		const checkpointName = args.join(' ');

		if (!manager.checkpointExists(checkpointName)) {
			return React.createElement(ErrorMessage, {
				key: `error-${Date.now()}`,
				message: `Checkpoint '${checkpointName}' does not exist. Use /checkpoint list to see available checkpoints.`,
				hideBox: true,
			});
		}

		// Get checkpoint details for display
		const checkpointMetadata = await manager.getCheckpointMetadata(
			checkpointName,
		);

		// Actually delete the checkpoint
		await manager.deleteCheckpoint(checkpointName);

		// Show success with what was deleted
		return React.createElement(
			'div',
			{
				key: `delete-success-${Date.now()}`,
			},
			[
				React.createElement(SuccessMessage, {
					key: 'success',
					message: `✓ Checkpoint '${checkpointName}' deleted successfully`,
					hideBox: true,
				}),
				React.createElement(InfoMessage, {
					key: 'details',
					message: `Deleted checkpoint contained:
  • ${checkpointMetadata.messageCount} messages
  • ${checkpointMetadata.filesChanged.length} files
  • Created: ${new Date(checkpointMetadata.timestamp).toLocaleString()}`,
					hideBox: true,
				}),
			],
		);
	} catch (error) {
		return React.createElement(ErrorMessage, {
			key: `error-${Date.now()}`,
			message: `Failed to delete checkpoint: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			hideBox: true,
		});
	}
}

/**
 * Main checkpoint command handler
 */
export const checkpointCommand: Command = {
	name: 'checkpoint',
	description:
		'Manage conversation checkpoints - save and restore session snapshots',
	handler: async (args: string[], messages: Message[], metadata) => {
		if (args.length === 0) {
			return checkpointCommand.handler(['help'], messages, metadata);
		}

		const subcommand = args[0].toLowerCase();
		const subArgs = args.slice(1);

		switch (subcommand) {
			case 'create':
			case 'save':
				return await createCheckpoint(subArgs, messages, metadata);

			case 'list':
			case 'ls':
				return await listCheckpoints();

			case 'load':
			case 'restore':
				return await loadCheckpoint(subArgs, messages, metadata);

			case 'delete':
			case 'remove':
			case 'rm':
				return await deleteCheckpoint(subArgs);

			case 'help':
			case '--help':
			case '-h':
				return React.createElement(CheckpointHelp, {
					key: `help-${Date.now()}`,
				});

			default:
				return React.createElement(ErrorMessage, {
					key: `error-${Date.now()}`,
					message: `Unknown checkpoint subcommand: ${subcommand}. Use /checkpoint help for available commands.`,
					hideBox: true,
				});
		}
	},
};
