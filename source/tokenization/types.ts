/**
 * Tokenizer interface and types
 */

import type {Message} from '@/types/core.js';

/**
 * Tokenizer interface for encoding text and counting tokens
 */
export interface Tokenizer {
	/**
	 * Encode text and return token count
	 */
	encode(text: string): number;

	/**
	 * Count tokens in a message (content + role)
	 */
	countTokens(message: Message): number;

	/**
	 * Get the tokenizer name/type
	 */
	getName(): string;
}

/**
 * Provider types for tokenizer selection
 */
export type TokenizerProvider =
	| 'openai'
	| 'anthropic'
	| 'llama'
	| 'fallback'
	| 'auto';
