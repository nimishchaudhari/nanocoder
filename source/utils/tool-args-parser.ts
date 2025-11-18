/**
 * Parse tool arguments from various formats
 * Handles both string-encoded JSON and already-parsed objects
 *
 * This utility eliminates the repeated pattern of:
 * ```
 * let parsedArgs: unknown = toolCall.function.arguments;
 * if (typeof parsedArgs === 'string') {
 *     try {
 *         parsedArgs = JSON.parse(parsedArgs) as Record<string, unknown>;
 *     } catch {
 *         // If parsing fails, use as-is
 *     }
 * }
 * ```
 *
 * @param args - Arguments in any format (string, object, etc.)
 * @returns Parsed arguments as the specified type
 *
 * @example
 * const parsedArgs = parseToolArguments(toolCall.function.arguments);
 * const typedArgs = parseToolArguments<{path: string}>(toolCall.function.arguments);
 */
export function parseToolArguments<T = Record<string, unknown>>(
	args: unknown,
): T {
	if (typeof args === 'string') {
		try {
			return JSON.parse(args) as T;
		} catch {
			// If parsing fails, return as-is (will be cast to T)
			return args as T;
		}
	}
	return args as T;
}
