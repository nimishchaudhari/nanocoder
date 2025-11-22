import * as vscode from 'vscode';
import * as path from 'path';
import {WebSocketClient} from './websocket-client';
import {DiffManager} from './diff-manager';
import {ChatPanelProvider} from './chat-panel';
import {PendingChangesProvider} from './pending-changes-provider';
import {
	ServerMessage,
	FileChangeMessage,
	DiagnosticInfo,
	DEFAULT_PORT,
} from './protocol';

let wsClient: WebSocketClient;
let diffManager: DiffManager;
let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
	outputChannel = vscode.window.createOutputChannel('Nanocoder');
	outputChannel.appendLine('Nanocoder extension activating...');

	// Initialize components
	wsClient = new WebSocketClient(outputChannel);
	diffManager = new DiffManager(context);

	// Create status bar item
	statusBarItem = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right,
		100,
	);
	statusBarItem.command = 'nanocoder.connect';
	updateStatusBar(false);
	statusBarItem.show();

	// Register tree view for pending changes
	const pendingChangesProvider = new PendingChangesProvider(diffManager);
	vscode.window.registerTreeDataProvider(
		'nanocoder.pendingChanges',
		pendingChangesProvider,
	);

	// Register chat panel webview
	const chatPanelProvider = new ChatPanelProvider(
		context.extensionUri,
		wsClient,
	);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			ChatPanelProvider.viewType,
			chatPanelProvider,
		),
	);

	// Handle messages from CLI
	wsClient.onMessage(message => handleServerMessage(message));

	// Register commands
	context.subscriptions.push(
		vscode.commands.registerCommand('nanocoder.connect', connect),
		vscode.commands.registerCommand('nanocoder.disconnect', disconnect),
		vscode.commands.registerCommand(
			'nanocoder.askAboutSelection',
			askAboutSelection,
		),
		vscode.commands.registerCommand('nanocoder.openChat', openChat),
		vscode.commands.registerCommand('nanocoder.applyDiff', applyDiff),
		vscode.commands.registerCommand('nanocoder.rejectDiff', rejectDiff),
		vscode.commands.registerCommand('nanocoder.showDiff', showDiff),
		vscode.commands.registerCommand('nanocoder.applyAll', applyAll),
		vscode.commands.registerCommand('nanocoder.rejectAll', rejectAll),
		vscode.commands.registerCommand('nanocoder.startCli', startCli),
	);

	// Auto-connect if configured
	const config = vscode.workspace.getConfiguration('nanocoder');
	if (config.get<boolean>('autoConnect', true)) {
		setTimeout(() => connect(), 1000);
	}

	context.subscriptions.push(
		statusBarItem,
		outputChannel,
		{dispose: () => wsClient.disconnect()},
		{dispose: () => diffManager.dispose()},
	);

	outputChannel.appendLine('Nanocoder extension activated');
}

export function deactivate() {
	wsClient?.disconnect();
	diffManager?.dispose();
}

// Connection management
async function connect(): Promise<void> {
	const config = vscode.workspace.getConfiguration('nanocoder');
	const port = config.get<number>('serverPort', DEFAULT_PORT);

	updateStatusBar(false, 'Connecting...');

	const connected = await wsClient.connect(port);

	if (connected) {
		updateStatusBar(true);
		sendWorkspaceContext();
		vscode.window.showInformationMessage('Connected to Nanocoder CLI');
	} else {
		updateStatusBar(false);
		const action = await vscode.window.showWarningMessage(
			'Could not connect to Nanocoder CLI. Is it running?',
			'Start CLI',
			'Retry',
		);
		if (action === 'Start CLI') {
			startCli();
		} else if (action === 'Retry') {
			connect();
		}
	}
}

function disconnect(): void {
	wsClient.disconnect();
	updateStatusBar(false);
	vscode.window.showInformationMessage('Disconnected from Nanocoder CLI');
}

// Status bar updates
function updateStatusBar(connected: boolean, text?: string): void {
	if (text) {
		statusBarItem.text = `$(sync~spin) ${text}`;
	} else if (connected) {
		statusBarItem.text = '$(check) Nanocoder';
		statusBarItem.tooltip = 'Connected to Nanocoder CLI';
		statusBarItem.command = 'nanocoder.disconnect';
	} else {
		statusBarItem.text = '$(plug) Nanocoder';
		statusBarItem.tooltip = 'Click to connect to Nanocoder CLI';
		statusBarItem.command = 'nanocoder.connect';
	}
}

// Message handling
function handleServerMessage(message: ServerMessage): void {
	switch (message.type) {
		case 'file_change':
			handleFileChange(message);
			break;
		case 'status':
			if (message.model) {
				statusBarItem.text = `$(check) ${message.model}`;
			}
			break;
		case 'connection_ack':
			outputChannel.appendLine(
				`Connected to CLI v${message.cliVersion} (protocol v${message.protocolVersion})`,
			);
			break;
		case 'diagnostics_request':
			handleDiagnosticsRequest(message.filePath);
			break;
	}
}

function handleFileChange(message: FileChangeMessage): void {
	const config = vscode.workspace.getConfiguration('nanocoder');
	const showDiffPreview = config.get<boolean>('showDiffPreview', true);

	// Add to pending changes
	diffManager.addPendingChange(message);

	if (showDiffPreview) {
		// Show diff immediately
		diffManager.showDiff(message.id);
	} else {
		// Notify user
		vscode.window
			.showInformationMessage(
				`Nanocoder wants to modify ${path.basename(message.filePath)}`,
				'Show Diff',
				'Apply',
				'Reject',
			)
			.then(action => {
				if (action === 'Show Diff') {
					diffManager.showDiff(message.id);
				} else if (action === 'Apply') {
					applyDiff(message.id);
				} else if (action === 'Reject') {
					rejectDiff(message.id);
				}
			});
	}
}

function handleDiagnosticsRequest(filePath?: string): void {
	const diagnostics: DiagnosticInfo[] = [];

	if (filePath) {
		// Get diagnostics for specific file
		const uri = vscode.Uri.file(filePath);
		const fileDiagnostics = vscode.languages.getDiagnostics(uri);
		diagnostics.push(...convertDiagnostics(uri, fileDiagnostics));
	} else {
		// Get all diagnostics
		const allDiagnostics = vscode.languages.getDiagnostics();
		for (const [uri, fileDiagnostics] of allDiagnostics) {
			diagnostics.push(...convertDiagnostics(uri, fileDiagnostics));
		}
	}

	wsClient.send({
		type: 'diagnostics_response',
		diagnostics,
	});
}

function convertDiagnostics(
	uri: vscode.Uri,
	diagnostics: readonly vscode.Diagnostic[],
): DiagnosticInfo[] {
	return diagnostics.map(d => ({
		filePath: uri.fsPath,
		line: d.range.start.line + 1, // 1-indexed
		character: d.range.start.character + 1,
		message: d.message,
		severity: severityToString(d.severity),
		source: d.source,
	}));
}

function severityToString(
	severity: vscode.DiagnosticSeverity,
): DiagnosticInfo['severity'] {
	switch (severity) {
		case vscode.DiagnosticSeverity.Error:
			return 'error';
		case vscode.DiagnosticSeverity.Warning:
			return 'warning';
		case vscode.DiagnosticSeverity.Information:
			return 'info';
		case vscode.DiagnosticSeverity.Hint:
			return 'hint';
	}
}

// Command handlers
async function askAboutSelection(): Promise<void> {
	if (!wsClient.isConnected()) {
		const action = await vscode.window.showWarningMessage(
			'Not connected to Nanocoder CLI',
			'Connect',
		);
		if (action === 'Connect') {
			await connect();
		}
		return;
	}

	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showWarningMessage('No active editor');
		return;
	}

	const selection = editor.selection;
	const selectedText = editor.document.getText(selection);
	const filePath = editor.document.uri.fsPath;

	// Prompt for question
	const question = await vscode.window.showInputBox({
		prompt: 'What would you like to ask about this code?',
		placeHolder: 'e.g., "Explain this function" or "How can I optimize this?"',
	});

	if (!question) return;

	// Build prompt with context
	const prompt = selectedText
		? `Regarding this code from ${path.basename(
				filePath,
		  )}:\n\`\`\`\n${selectedText}\n\`\`\`\n\n${question}`
		: question;

	wsClient.send({
		type: 'send_prompt',
		prompt,
		context: {
			filePath,
			selection: selectedText || undefined,
			cursorPosition: {
				line: selection.active.line,
				character: selection.active.character,
			},
		},
	});

	// Open chat panel to show response
	vscode.commands.executeCommand('nanocoder.chatPanel.focus');
}

function openChat(): void {
	vscode.commands.executeCommand('nanocoder.chatPanel.focus');
}

async function showDiff(id: string): Promise<void> {
	await diffManager.showDiff(id);
}

async function applyDiff(id: string): Promise<void> {
	const success = await diffManager.applyChange(id);
	if (success) {
		wsClient.send({type: 'apply_change', id});
	}
}

function rejectDiff(id: string): void {
	diffManager.rejectChange(id);
	wsClient.send({type: 'reject_change', id});
}

async function applyAll(): Promise<void> {
	await diffManager.applyAll();
}

function rejectAll(): void {
	diffManager.rejectAll();
}

function startCli(): void {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	const cwd = workspaceFolder?.uri.fsPath || process.cwd();

	// Create terminal and run nanocoder
	const terminal = vscode.window.createTerminal({
		name: 'Nanocoder',
		cwd,
	});

	terminal.sendText('nanocoder --vscode');
	terminal.show();

	// Try to connect after a delay
	setTimeout(() => connect(), 3000);
}

// Send workspace context to CLI
function sendWorkspaceContext(): void {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	const activeEditor = vscode.window.activeTextEditor;

	// Get open files
	const openFiles = vscode.workspace.textDocuments
		.filter(doc => doc.uri.scheme === 'file')
		.map(doc => doc.uri.fsPath);

	// Get diagnostics for open files
	const diagnostics: DiagnosticInfo[] = [];
	for (const filePath of openFiles) {
		const uri = vscode.Uri.file(filePath);
		const fileDiagnostics = vscode.languages.getDiagnostics(uri);
		diagnostics.push(...convertDiagnostics(uri, fileDiagnostics));
	}

	wsClient.send({
		type: 'context',
		workspaceFolder: workspaceFolder?.uri.fsPath,
		openFiles,
		activeFile: activeEditor?.document.uri.fsPath,
		diagnostics,
	});
}
