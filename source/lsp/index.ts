/**
 * LSP Integration Module
 *
 * Provides Language Server Protocol support for Nanocoder:
 * - Auto-discovery of installed language servers
 * - Multi-language support with routing
 * - Diagnostics, completions, code actions, and formatting
 */

export {type LSPServerConfig} from './lsp-client';

export {
	getLSPManager,
	type LSPManagerConfig,
	type LSPInitResult,
	type DiagnosticsResult,
} from './lsp-manager';

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
} from './protocol';
