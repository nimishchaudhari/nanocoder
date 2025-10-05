export type MessageType = 'info' | 'error' | 'success';

export interface MessageQueueItem {
	type: MessageType;
	message: string;
	key?: string;
	hideBox?: boolean;
}

export interface NpmRegistryResponse {
	version: string;
	name: string;
	[key: string]: any;
}

export interface UpdateInfo {
	hasUpdate: boolean;
	currentVersion: string;
	latestVersion?: string;
	updateCommand?: string;
}
