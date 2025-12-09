import {CheckpointMetadata} from '@/types/checkpoint';

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return '0B';

	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))}${sizes[i]}`;
}

/**
 * Format timestamp to relative time string
 */
export function formatRelativeTime(timestamp: string): string {
	const now = new Date();
	const checkpointTime = new Date(timestamp);
	const diffMs = now.getTime() - checkpointTime.getTime();
	const diffMinutes = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMinutes < 1) {
		return 'Just now';
	} else if (diffMinutes < 60) {
		return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
	} else if (diffHours < 24) {
		return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
	} else if (diffDays < 7) {
		return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
	} else {
		return checkpointTime.toLocaleDateString();
	}
}

/**
 * Validate checkpoint name for invalid characters and length
 */
export function validateCheckpointName(name: string): {
	valid: boolean;
	error?: string;
} {
	if (!name || name.trim().length === 0) {
		return {valid: false, error: 'Checkpoint name cannot be empty'};
	}

	if (name.length > 100) {
		return {
			valid: false,
			error: 'Checkpoint name must be 100 characters or less',
		};
	}

	// Check for invalid characters (filesystem-unsafe characters)
	const invalidChars = /[<>:"/\\|?*]/;
	if (invalidChars.test(name)) {
		return {valid: false, error: 'Checkpoint name contains invalid characters'};
	}

	// Check for reserved names
	const reservedNames = [
		'CON',
		'PRN',
		'AUX',
		'NUL',
		'COM1',
		'COM2',
		'COM3',
		'COM4',
		'COM5',
		'COM6',
		'COM7',
		'COM8',
		'COM9',
		'LPT1',
		'LPT2',
		'LPT3',
		'LPT4',
		'LPT5',
		'LPT6',
		'LPT7',
		'LPT8',
		'LPT9',
	];
	if (reservedNames.includes(name.toUpperCase())) {
		return {valid: false, error: 'Checkpoint name is reserved by the system'};
	}

	// Check if name starts or ends with dot or space
	if (
		name.startsWith('.') ||
		name.endsWith('.') ||
		name.startsWith(' ') ||
		name.endsWith(' ')
	) {
		return {
			valid: false,
			error: 'Checkpoint name cannot start or end with a dot or space',
		};
	}

	return {valid: true};
}

/**
 * Generate a unique checkpoint name based on timestamp
 */
export function generateCheckpointName(customName?: string): string {
	if (customName) {
		const validation = validateCheckpointName(customName);
		if (validation.valid) {
			return customName.trim();
		}
		// If custom name is invalid, fall back to timestamp-based name
	}

	const now = new Date();
	const timestamp = now
		.toISOString()
		.replace(/[:.]/g, '-')
		.replace('T', '-')
		.split('.')[0];
	return `checkpoint-${timestamp}`;
}

/**
 * Calculate total size of checkpoints
 */
export function calculateTotalCheckpointsSize(
	checkpoints: CheckpointMetadata[],
): number {
	// This is an estimation since we don't have exact sizes in metadata
	// In a real implementation, you might store size in metadata or calculate it
	return checkpoints.length * 1024; // Rough estimate
}

/**
 * Sort checkpoints by different criteria
 */
export type SortCriteria = 'timestamp' | 'name' | 'messageCount' | 'filesCount';
export type SortDirection = 'asc' | 'desc';

export function sortCheckpoints(
	checkpoints: CheckpointMetadata[],
	criteria: SortCriteria = 'timestamp',
	direction: SortDirection = 'desc',
): CheckpointMetadata[] {
	const sorted = [...checkpoints].sort((a, b) => {
		let comparison = 0;

		switch (criteria) {
			case 'timestamp':
				comparison =
					new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
				break;
			case 'name':
				comparison = a.name.localeCompare(b.name);
				break;
			case 'messageCount':
				comparison = a.messageCount - b.messageCount;
				break;
			case 'filesCount':
				comparison = a.filesChanged.length - b.filesChanged.length;
				break;
		}

		return direction === 'desc' ? -comparison : comparison;
	});

	return sorted;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get checkpoint description from first user message
 */
export function getCheckpointDescription(messages: any[]): string {
	const userMessages = messages.filter(m => m.role === 'user');
	if (userMessages.length === 0) {
		return 'Empty conversation';
	}

	const firstMessage = userMessages[0].content || '';
	return truncateText(firstMessage, 100);
}

/**
 * Check if checkpoint name already exists (case-insensitive)
 */
export function checkDuplicateName(
	name: string,
	existingNames: string[],
): boolean {
	const lowerName = name.toLowerCase();
	return existingNames.some(existing => existing.toLowerCase() === lowerName);
}

/**
 * Sanitize checkpoint name for filesystem
 */
export function sanitizeCheckpointName(name: string): string {
	return name
		.trim()
		.replace(/[<>:"/\\|?*]/g, '_')
		.replace(/^\.+|\.+$/g, '')
		.replace(/^\s+|\s+$/g, '')
		.substring(0, 100);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	const lastDot = filename.lastIndexOf('.');
	return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
}

/**
 * Group files by extension
 */
export function groupFilesByExtension(
	files: string[],
): Record<string, string[]> {
	const groups: Record<string, string[]> = {};

	for (const file of files) {
		const ext = getFileExtension(file) || 'no-extension';
		if (!groups[ext]) {
			groups[ext] = [];
		}
		groups[ext].push(file);
	}

	return groups;
}

/**
 * Create a summary of files for display
 */
export function createFilesSummary(files: string[]): string {
	if (files.length === 0) {
		return 'No files';
	}

	const groups = groupFilesByExtension(files);
	const summary = Object.entries(groups)
		.map(([ext, fileList]) => {
			if (ext === 'no-extension') {
				return fileList.length === 1 ? fileList[0] : `${fileList.length} files`;
			}
			return fileList.length === 1
				? `1 ${ext} file`
				: `${fileList.length} ${ext} files`;
		})
		.slice(0, 3)
		.join(', ');

	const totalGroups = Object.keys(groups).length;
	return totalGroups > 3 ? `${summary}...` : summary;
}
