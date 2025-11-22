import * as vscode from 'vscode';
import {WebSocketClient} from './websocket-client';
import {ServerMessage} from './protocol';

/**
 * Webview provider for the Chat panel
 */
export class ChatPanelProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'nanocoder.chatPanel';

	private view?: vscode.WebviewView;
	private messages: Array<{role: string; content: string}> = [];

	constructor(
		private extensionUri: vscode.Uri,
		private wsClient: WebSocketClient,
	) {
		// Listen for messages from CLI
		wsClient.onMessage(message => {
			this.handleServerMessage(message);
		});
	}

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this.extensionUri],
		};

		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

		// Handle messages from webview
		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'sendMessage':
					this.sendMessage(data.message);
					break;
				case 'ready':
					this.updateWebview();
					break;
			}
		});
	}

	private handleServerMessage(message: ServerMessage): void {
		if (message.type === 'assistant_message') {
			if (message.isStreaming) {
				// Update last message if streaming
				const lastMessage = this.messages[this.messages.length - 1];
				if (lastMessage && lastMessage.role === 'assistant') {
					lastMessage.content = message.content;
				} else {
					this.messages.push({role: 'assistant', content: message.content});
				}
			} else {
				// Final message
				const lastMessage = this.messages[this.messages.length - 1];
				if (lastMessage && lastMessage.role === 'assistant') {
					lastMessage.content = message.content;
				} else {
					this.messages.push({role: 'assistant', content: message.content});
				}
			}
			this.updateWebview();
		} else if (message.type === 'status') {
			this.updateStatus(message.model, message.provider, message.connected);
		}
	}

	private sendMessage(content: string): void {
		if (!content.trim()) return;

		// Add user message to history
		this.messages.push({role: 'user', content});
		this.updateWebview();

		// Get context from active editor
		const editor = vscode.window.activeTextEditor;
		const context = editor
			? {
					filePath: editor.document.uri.fsPath,
					selection: editor.selection.isEmpty
						? undefined
						: editor.document.getText(editor.selection),
					cursorPosition: {
						line: editor.selection.active.line,
						character: editor.selection.active.character,
					},
			  }
			: undefined;

		// Send to CLI
		this.wsClient.send({
			type: 'send_prompt',
			prompt: content,
			context,
		});
	}

	private updateWebview(): void {
		if (this.view) {
			this.view.webview.postMessage({
				type: 'updateMessages',
				messages: this.messages,
			});
		}
	}

	private updateStatus(
		model?: string,
		provider?: string,
		connected?: boolean,
	): void {
		if (this.view) {
			this.view.webview.postMessage({
				type: 'updateStatus',
				model,
				provider,
				connected,
			});
		}
	}

	public addUserMessage(content: string): void {
		this.messages.push({role: 'user', content});
		this.updateWebview();
	}

	public clearMessages(): void {
		this.messages = [];
		this.updateWebview();
	}

	private getHtmlForWebview(_webview: vscode.Webview): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Nanocoder Chat</title>
	<style>
		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}
		body {
			font-family: var(--vscode-font-family);
			font-size: var(--vscode-font-size);
			color: var(--vscode-foreground);
			background-color: var(--vscode-sideBar-background);
			display: flex;
			flex-direction: column;
			height: 100vh;
		}
		.status-bar {
			padding: 8px 12px;
			background: var(--vscode-titleBar-activeBackground);
			border-bottom: 1px solid var(--vscode-panel-border);
			font-size: 11px;
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.status-dot {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			background: var(--vscode-testing-iconFailed);
		}
		.status-dot.connected {
			background: var(--vscode-testing-iconPassed);
		}
		.messages {
			flex: 1;
			overflow-y: auto;
			padding: 12px;
		}
		.message {
			margin-bottom: 12px;
			padding: 8px 12px;
			border-radius: 6px;
			max-width: 90%;
		}
		.message.user {
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			margin-left: auto;
		}
		.message.assistant {
			background: var(--vscode-editor-inactiveSelectionBackground);
		}
		.message pre {
			background: var(--vscode-textCodeBlock-background);
			padding: 8px;
			border-radius: 4px;
			overflow-x: auto;
			margin: 8px 0;
		}
		.message code {
			font-family: var(--vscode-editor-font-family);
			font-size: var(--vscode-editor-font-size);
		}
		.input-container {
			padding: 12px;
			border-top: 1px solid var(--vscode-panel-border);
		}
		.input-wrapper {
			display: flex;
			gap: 8px;
		}
		textarea {
			flex: 1;
			padding: 8px;
			border: 1px solid var(--vscode-input-border);
			background: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border-radius: 4px;
			resize: none;
			font-family: inherit;
			font-size: inherit;
			min-height: 60px;
		}
		textarea:focus {
			outline: 1px solid var(--vscode-focusBorder);
		}
		button {
			padding: 8px 16px;
			background: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-family: inherit;
		}
		button:hover {
			background: var(--vscode-button-hoverBackground);
		}
		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
		.empty-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			height: 100%;
			color: var(--vscode-descriptionForeground);
			text-align: center;
			padding: 20px;
		}
		.empty-state h3 {
			margin-bottom: 8px;
		}
	</style>
</head>
<body>
	<div class="status-bar">
		<span class="status-dot" id="statusDot"></span>
		<span id="statusText">Disconnected</span>
	</div>
	<div class="messages" id="messages">
		<div class="empty-state">
			<h3>Nanocoder Chat</h3>
			<p>Start a conversation with your AI coding assistant.</p>
		</div>
	</div>
	<div class="input-container">
		<div class="input-wrapper">
			<textarea
				id="input"
				placeholder="Ask Nanocoder something..."
				rows="2"
			></textarea>
			<button id="sendBtn">Send</button>
		</div>
	</div>
	<script>
		const vscode = acquireVsCodeApi();
		const messagesEl = document.getElementById('messages');
		const inputEl = document.getElementById('input');
		const sendBtn = document.getElementById('sendBtn');
		const statusDot = document.getElementById('statusDot');
		const statusText = document.getElementById('statusText');

		let isConnected = false;

		function escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		}

		function formatMessage(content) {
			// Simple markdown-like formatting
			let html = escapeHtml(content);

			// Code blocks
			html = html.replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>');

			// Inline code
			html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');

			// Line breaks
			html = html.replace(/\\n/g, '<br>');

			return html;
		}

		function renderMessages(messages) {
			if (messages.length === 0) {
				messagesEl.innerHTML = '<div class="empty-state"><h3>Nanocoder Chat</h3><p>Start a conversation with your AI coding assistant.</p></div>';
				return;
			}

			messagesEl.innerHTML = messages.map(msg =>
				'<div class="message ' + msg.role + '">' + formatMessage(msg.content) + '</div>'
			).join('');

			messagesEl.scrollTop = messagesEl.scrollHeight;
		}

		function updateStatus(model, provider, connected) {
			isConnected = connected;
			statusDot.className = 'status-dot' + (connected ? ' connected' : '');
			if (connected && model) {
				statusText.textContent = model + (provider ? ' (' + provider + ')' : '');
			} else {
				statusText.textContent = 'Disconnected';
			}
			sendBtn.disabled = !connected;
		}

		function sendMessage() {
			const message = inputEl.value.trim();
			if (message && isConnected) {
				vscode.postMessage({ type: 'sendMessage', message });
				inputEl.value = '';
			}
		}

		sendBtn.addEventListener('click', sendMessage);
		inputEl.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				sendMessage();
			}
		});

		window.addEventListener('message', (event) => {
			const data = event.data;
			switch (data.type) {
				case 'updateMessages':
					renderMessages(data.messages);
					break;
				case 'updateStatus':
					updateStatus(data.model, data.provider, data.connected);
					break;
			}
		});

		// Signal ready
		vscode.postMessage({ type: 'ready' });
	</script>
</body>
</html>`;
	}
}
