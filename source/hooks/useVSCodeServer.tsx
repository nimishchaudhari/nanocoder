import {useEffect, useRef, useCallback, useState} from 'react';
import {VSCodeServer, getVSCodeServer, DEFAULT_PORT} from '@/vscode/index';
import type {DiagnosticInfo} from '@/vscode/protocol';
import * as fs from 'fs';

interface UseVSCodeServerProps {
	enabled: boolean;
	port?: number;
	currentModel?: string;
	currentProvider?: string;
	onPrompt?: (
		prompt: string,
		context?: {
			filePath?: string;
			selection?: string;
			cursorPosition?: {line: number; character: number};
		},
	) => void;
	onDiagnosticsReceived?: (diagnostics: DiagnosticInfo[]) => void;
}

interface UseVSCodeServerReturn {
	isConnected: boolean;
	connectionCount: number;
	sendAssistantMessage: (content: string, isStreaming?: boolean) => void;
	notifyFileChange: (
		filePath: string,
		originalContent: string,
		newContent: string,
		toolName: string,
		toolArgs: Record<string, unknown>,
	) => string | null;
	requestDiagnostics: (filePath?: string) => void;
	updateStatus: () => void;
}

/**
 * Hook to manage VS Code server integration
 */
export function useVSCodeServer({
	enabled,
	port = DEFAULT_PORT,
	currentModel,
	currentProvider,
	onPrompt,
	onDiagnosticsReceived,
}: UseVSCodeServerProps): UseVSCodeServerReturn {
	const serverRef = useRef<VSCodeServer | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [connectionCount, setConnectionCount] = useState(0);

	// Store callbacks in refs to avoid re-creating server on callback changes
	const onPromptRef = useRef(onPrompt);
	const onDiagnosticsReceivedRef = useRef(onDiagnosticsReceived);
	const currentModelRef = useRef(currentModel);
	const currentProviderRef = useRef(currentProvider);

	// Keep refs up to date
	useEffect(() => {
		onPromptRef.current = onPrompt;
	}, [onPrompt]);

	useEffect(() => {
		onDiagnosticsReceivedRef.current = onDiagnosticsReceived;
	}, [onDiagnosticsReceived]);

	useEffect(() => {
		currentModelRef.current = currentModel;
	}, [currentModel]);

	useEffect(() => {
		currentProviderRef.current = currentProvider;
	}, [currentProvider]);

	// Initialize server on mount if enabled
	useEffect(() => {
		if (!enabled) {
			return;
		}

		const initServer = async () => {
			const server = getVSCodeServer(port);
			serverRef.current = server;

			// Set up callbacks using refs
			server.onCallbacks({
				onPrompt: (prompt, context) => {
					onPromptRef.current?.(prompt, context);
				},
				onDiagnosticsResponse: diagnostics => {
					onDiagnosticsReceivedRef.current?.(diagnostics);
				},
				onConnect: () => {
					setIsConnected(true);
					setConnectionCount(server.getConnectionCount());
					console.log('VS Code extension connected');
					// Send current status
					if (currentModelRef.current || currentProviderRef.current) {
						server.sendStatus(
							currentModelRef.current,
							currentProviderRef.current,
						);
					}
				},
				onDisconnect: () => {
					const hasConnections = server.hasConnections();
					setIsConnected(hasConnections);
					setConnectionCount(server.getConnectionCount());
				},
				onChangeApplied: id => {
					console.log(`Change ${id} applied by VS Code`);
				},
				onChangeRejected: id => {
					console.log(`Change ${id} rejected by VS Code`);
				},
			});

			// Start the server
			const started = await server.start();
			if (started) {
				console.log(`VS Code server started on port ${port}`);
			} else {
				console.error('Failed to start VS Code server');
			}
		};

		void initServer();

		// Cleanup on unmount
		return () => {
			if (serverRef.current) {
				void serverRef.current.stop();
				serverRef.current = null;
			}
		};
	}, [enabled, port]);

	// Update status when model/provider changes
	useEffect(() => {
		if (serverRef.current && enabled && isConnected) {
			serverRef.current.sendStatus(currentModel, currentProvider);
		}
	}, [enabled, currentModel, currentProvider, isConnected]);

	const sendAssistantMessage = useCallback(
		(content: string, isStreaming = false) => {
			if (serverRef.current && enabled) {
				serverRef.current.sendAssistantMessage(content, isStreaming);
			}
		},
		[enabled],
	);

	const notifyFileChange = useCallback(
		(
			filePath: string,
			originalContent: string,
			newContent: string,
			toolName: string,
			toolArgs: Record<string, unknown>,
		): string | null => {
			if (serverRef.current && enabled && isConnected) {
				return serverRef.current.sendFileChange(
					filePath,
					originalContent,
					newContent,
					toolName,
					toolArgs,
				);
			}
			return null;
		},
		[enabled, isConnected],
	);

	const requestDiagnostics = useCallback(
		(filePath?: string) => {
			if (serverRef.current && enabled) {
				serverRef.current.requestDiagnostics(filePath);
			}
		},
		[enabled],
	);

	const updateStatus = useCallback(() => {
		if (serverRef.current && enabled) {
			serverRef.current.sendStatus(currentModel, currentProvider);
		}
	}, [enabled, currentModel, currentProvider]);

	return {
		isConnected,
		connectionCount,
		sendAssistantMessage,
		notifyFileChange,
		requestDiagnostics,
		updateStatus,
	};
}

/**
 * Check if VS Code mode was requested via CLI flag
 */
export function isVSCodeModeEnabled(): boolean {
	return process.argv.includes('--vscode');
}

/**
 * Get VS Code server port from CLI args or default
 */
export function getVSCodePort(): number {
	const portArgIndex = process.argv.findIndex(
		arg => arg === '--vscode-port' || arg === '-p',
	);
	if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
		const port = parseInt(process.argv[portArgIndex + 1], 10);
		if (!isNaN(port) && port > 0 && port < 65536) {
			return port;
		}
	}
	return DEFAULT_PORT;
}

/**
 * Helper to create file change notification with automatic content reading
 */
export function createFileChangeFromTool(
	filePath: string,
	newContent: string,
	_toolName: string,
	_toolArgs: Record<string, unknown>,
): {
	originalContent: string;
	newContent: string;
} {
	let originalContent = '';
	try {
		if (fs.existsSync(filePath)) {
			originalContent = fs.readFileSync(filePath, 'utf-8');
		}
	} catch {
		// File doesn't exist or can't be read - that's fine for create operations
	}

	return {
		originalContent,
		newContent,
	};
}
