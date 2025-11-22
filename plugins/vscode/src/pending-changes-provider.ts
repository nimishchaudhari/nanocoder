import * as vscode from 'vscode';
import * as path from 'path';
import {DiffManager} from './diff-manager';
import {PendingChange} from './protocol';

/**
 * Tree data provider for the Pending Changes view
 */
export class PendingChangesProvider
	implements vscode.TreeDataProvider<PendingChangeItem>
{
	private _onDidChangeTreeData = new vscode.EventEmitter<
		PendingChangeItem | undefined | null | void
	>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	constructor(private diffManager: DiffManager) {
		// Refresh when pending changes update
		diffManager.onChanges(() => {
			this.refresh();
		});
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: PendingChangeItem): vscode.TreeItem {
		return element;
	}

	getChildren(): PendingChangeItem[] {
		const changes = this.diffManager.getPendingChanges();

		if (changes.length === 0) {
			return [];
		}

		return changes.map(change => new PendingChangeItem(change));
	}
}

class PendingChangeItem extends vscode.TreeItem {
	constructor(public readonly change: PendingChange) {
		super(path.basename(change.filePath), vscode.TreeItemCollapsibleState.None);

		this.description = change.toolName;
		this.tooltip = `${change.filePath}\n\nTool: ${
			change.toolName
		}\nTime: ${new Date(change.timestamp).toLocaleTimeString()}`;

		// Icon based on operation type
		if (change.toolName === 'create_file') {
			this.iconPath = new vscode.ThemeIcon('new-file');
		} else if (
			change.toolName === 'replace_lines' ||
			change.toolName === 'insert_lines'
		) {
			this.iconPath = new vscode.ThemeIcon('edit');
		} else if (change.toolName === 'delete_lines') {
			this.iconPath = new vscode.ThemeIcon('trash');
		} else {
			this.iconPath = new vscode.ThemeIcon('file');
		}

		// Click to show diff
		this.command = {
			command: 'nanocoder.showDiff',
			title: 'Show Diff',
			arguments: [change.id],
		};

		this.contextValue = 'pendingChange';
	}
}
