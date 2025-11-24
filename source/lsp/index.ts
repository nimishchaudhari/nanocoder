/**
 * LSP Integration Module
 *
 * Provides Language Server Protocol support for Nanocoder:
 * - Auto-discovery of installed language servers
 * - Multi-language support with routing
 * - Diagnostics, completions, code actions, and formatting
 */

export {LSPClient, type LSPServerConfig, type LSPClientEvents} from './lsp-client';

export {
	LSPManager,
	getLSPManager,
	resetLSPManager,
	type LSPManagerConfig,
	type LSPInitResult,
	type DiagnosticsResult,
} from './lsp-manager';

export {
	discoverLanguageServers,
	getServerForLanguage,
	getLanguageId,
	getMissingServerHints,
	findLocalServer,
	getKnownServersStatus,
} from './server-discovery';

export {
	type Diagnostic,
	type Position,
	type Range,
	type Location,
	type CompletionItem,
	type CodeAction,
	type TextEdit,
	type WorkspaceEdit,
	type FormattingOptions,
	type PublishDiagnosticsParams,
	DiagnosticSeverity,
	CompletionItemKind,
	LSPMethods,
} from './protocol';
