import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {PendingChange, FileChangeMessage} from './protocol';

/**
 * Manages file diffs and change previews
 */
export class DiffManager {
	private pendingChanges: Map<string, PendingChange> = new Map();
	private openEditors: Map<string, vscode.Uri[]> = new Map();
	private tempDir: string;
	private onChangeCallbacks: Set<() => void> = new Set();

	constructor(private context: vscode.ExtensionContext) {
		this.tempDir = path.join(context.globalStorageUri.fsPath, 'temp-diffs');
		this.ensureTempDir();
	}

	private ensureTempDir(): void {
		if (!fs.existsSync(this.tempDir)) {
			fs.mkdirSync(this.tempDir, {recursive: true});
		}
	}

	/**
	 * Add a new pending file change
	 */
	addPendingChange(message: FileChangeMessage): void {
		const change: PendingChange = {
			id: message.id,
			filePath: message.filePath,
			originalContent: message.originalContent,
			newContent: message.newContent,
			toolName: message.toolName,
			timestamp: Date.now(),
		};

		this.pendingChanges.set(message.id, change);
		this.notifyChanges();
	}

	/**
	 * Get all pending changes
	 */
	getPendingChanges(): PendingChange[] {
		return Array.from(this.pendingChanges.values()).sort(
			(a, b) => a.timestamp - b.timestamp,
		);
	}

	/**
	 * Get a specific pending change
	 */
	getPendingChange(id: string): PendingChange | undefined {
		return this.pendingChanges.get(id);
	}

	/**
	 * Show diff preview for a pending change
	 */
	async showDiff(id: string): Promise<void> {
		const change = this.pendingChanges.get(id);
		if (!change) {
			vscode.window.showErrorMessage(`Change ${id} not found`);
			return;
		}

		const fileName = path.basename(change.filePath);
		const isNewFile = change.originalContent === '';

		// For new files, show the content directly with syntax highlighting
		if (isNewFile) {
			const modifiedUri = vscode.Uri.file(
				path.join(this.tempDir, `${id}-new-${fileName}`),
			);
			fs.writeFileSync(modifiedUri.fsPath, change.newContent, 'utf-8');

			// Track this editor
			this.openEditors.set(id, [modifiedUri]);

			// Open the new file content for preview
			const doc = await vscode.workspace.openTextDocument(modifiedUri);
			await vscode.window.showTextDocument(doc, {
				preview: true,
				preserveFocus: false,
			});

			return;
		}

		// For existing files, show diff
		const originalUri = vscode.Uri.file(
			path.join(this.tempDir, `${id}-original-${fileName}`),
		);
		const modifiedUri = vscode.Uri.file(
			path.join(this.tempDir, `${id}-modified-${fileName}`),
		);

		// Track these editors
		this.openEditors.set(id, [originalUri, modifiedUri]);

		// Write temp files for diff
		fs.writeFileSync(originalUri.fsPath, change.originalContent, 'utf-8');
		fs.writeFileSync(modifiedUri.fsPath, change.newContent, 'utf-8');

		// Open diff editor
		const title = `Nanocoder: ${fileName} (${change.toolName})`;
		await vscode.commands.executeCommand(
			'vscode.diff',
			originalUri,
			modifiedUri,
			title,
			{preview: true},
		);
	}

	/**
	 * Close diff for a pending change (called when CLI confirms/rejects)
	 */
	async closeDiff(id: string): Promise<void> {
		await this.closeEditors(id);
		this.removePendingChange(id);
	}

	/**
	 * Close diff editors associated with a change
	 */
	private async closeEditors(id: string): Promise<void> {
		const uris = this.openEditors.get(id);
		if (!uris) {
			return;
		}

		// Close all tabs showing these URIs
		const allTabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);

		for (const tab of allTabs) {
			let shouldClose = false;
			const input = tab.input;

			if (input instanceof vscode.TabInputText) {
				// Check if this is one of our temp files
				shouldClose = uris.some(uri => uri.fsPath === input.uri.fsPath);
			} else if (input instanceof vscode.TabInputTextDiff) {
				// Check if this is our diff editor
				shouldClose =
					uris.some(uri => uri.fsPath === input.original.fsPath) ||
					uris.some(uri => uri.fsPath === input.modified.fsPath);
			}

			if (shouldClose) {
				await vscode.window.tabGroups.close(tab);
			}
		}

		this.openEditors.delete(id);
	}

	/**
	 * Apply a pending change to the actual file
	 */
	async applyChange(id: string): Promise<boolean> {
		const change = this.pendingChanges.get(id);
		if (!change) {
			vscode.window.showErrorMessage(`Change ${id} not found`);
			return false;
		}

		try {
			// Close diff editors first
			await this.closeEditors(id);

			const uri = vscode.Uri.file(change.filePath);

			// Check if file exists
			const fileExists = fs.existsSync(change.filePath);

			if (fileExists) {
				// Open the document and apply changes
				const document = await vscode.workspace.openTextDocument(uri);
				const edit = new vscode.WorkspaceEdit();
				const fullRange = new vscode.Range(
					document.positionAt(0),
					document.positionAt(document.getText().length),
				);
				edit.replace(uri, fullRange, change.newContent);
				await vscode.workspace.applyEdit(edit);
				await document.save();
			} else {
				// Create new file
				const dirPath = path.dirname(change.filePath);
				if (!fs.existsSync(dirPath)) {
					fs.mkdirSync(dirPath, {recursive: true});
				}
				fs.writeFileSync(change.filePath, change.newContent, 'utf-8');

				// Open the new file
				const document = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(document);
			}

			// Remove from pending
			this.removePendingChange(id);

			vscode.window.showInformationMessage(
				`Applied changes to ${path.basename(change.filePath)}`,
			);
			return true;
		} catch (error) {
			vscode.window.showErrorMessage(
				`Failed to apply changes: ${
					error instanceof Error ? error.message : error
				}`,
			);
			return false;
		}
	}

	/**
	 * Reject a pending change
	 */
	async rejectChange(id: string): Promise<boolean> {
		const change = this.pendingChanges.get(id);
		if (!change) {
			return false;
		}

		// Close diff editors first
		await this.closeEditors(id);

		this.removePendingChange(id);

		vscode.window.showInformationMessage(
			`Rejected changes to ${path.basename(change.filePath)}`,
		);
		return true;
	}

	/**
	 * Remove a pending change and clean up temp files
	 */
	private removePendingChange(id: string): void {
		const change = this.pendingChanges.get(id);
		if (change) {
			const fileName = path.basename(change.filePath);
			const originalPath = path.join(
				this.tempDir,
				`${id}-original-${fileName}`,
			);
			const modifiedPath = path.join(
				this.tempDir,
				`${id}-modified-${fileName}`,
			);

			// Clean up temp files
			try {
				if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
				if (fs.existsSync(modifiedPath)) fs.unlinkSync(modifiedPath);
			} catch {
				// Ignore cleanup errors
			}

			this.pendingChanges.delete(id);
			this.notifyChanges();
		}
	}

	/**
	 * Apply all pending changes
	 */
	async applyAll(): Promise<void> {
		const changes = this.getPendingChanges();
		for (const change of changes) {
			await this.applyChange(change.id);
		}
	}

	/**
	 * Reject all pending changes
	 */
	rejectAll(): void {
		const ids = Array.from(this.pendingChanges.keys());
		for (const id of ids) {
			this.rejectChange(id);
		}
	}

	/**
	 * Subscribe to changes in pending changes list
	 */
	onChanges(callback: () => void): vscode.Disposable {
		this.onChangeCallbacks.add(callback);
		return new vscode.Disposable(() => {
			this.onChangeCallbacks.delete(callback);
		});
	}

	private notifyChanges(): void {
		this.onChangeCallbacks.forEach(callback => callback());
	}

	/**
	 * Cleanup all temp files
	 */
	dispose(): void {
		try {
			if (fs.existsSync(this.tempDir)) {
				const files = fs.readdirSync(this.tempDir);
				for (const file of files) {
					fs.unlinkSync(path.join(this.tempDir, file));
				}
			}
		} catch {
			// Ignore cleanup errors
		}
	}
}
