export type EditMode =
	| 'insert'
	| 'replace'
	| 'delete'
	| 'move'
	| 'find_replace';

export interface EditArgs {
	path: string;
	mode: EditMode;
	line_number?: number;
	end_line?: number;
	content?: string;
	target_line?: number;
	old_text?: string;
	new_text?: string;
	replace_all?: boolean;
}

export interface EditResult {
	success: boolean;
	message: string;
	context?: string;
}

export interface LineChange {
	lineNum: number;
	lineContent: string;
	startPos: number;
}

export interface ValidationResult {
	isValid: boolean;
	error?: string;
}

export interface BashToolResult {
	fullOutput: string;
	llmContext: string;
}