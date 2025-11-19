# Utility Functions

This directory contains shared utility functions extracted to eliminate code duplication (DRY principle) across the codebase.

## Tool-Related Utilities

The following utilities were created as part of a DRY refactoring effort to eliminate repeated patterns when handling AI tool calls:

### `tool-args-parser.ts`

Provides `parseToolArguments()` for parsing tool call arguments from various formats (JSON strings or objects).

**Key Design Decision: Dual Parsing Modes**

This utility supports two error handling strategies:

- **Lenient mode (default)**: Returns unparsed value on JSON parse failure. Used for display/UI purposes where graceful degradation is acceptable.
- **Strict mode**: Throws error on JSON parse failure. Used for tool execution where malformed arguments must be caught early.

**Usage Examples:**
```typescript
// Lenient mode for display
const args = parseToolArguments(toolCall.function.arguments);

// Strict mode for tool execution
const args = parseToolArguments(toolCall.function.arguments, {strict: true});
```

**Rationale:** The codebase has two distinct use cases:
1. **Tool execution** (`message-handler.ts`): Must fail fast on invalid arguments to prevent executing tools with malformed data
2. **Tool display** (hooks, components): Should gracefully handle parse failures to keep the UI responsive

### `error-formatter.ts`

Provides `formatError()` to consistently format error objects into string messages. Handles both `Error` instances and unknown error types.

**Usage Example:**
```typescript
try {
  await doSomething();
} catch (error) {
  const message = formatError(error);
  console.error(message);
}
```

### `tool-result-display.tsx`

Provides `displayToolResult()` to display tool execution results with proper formatting. Extracted from `useChatHandler` and `useToolHandler` to eliminate ~70 lines of duplication.

**Key Features:**
- Detects error results and displays them with `ErrorMessage` component
- Uses tool-specific formatters when available via `ToolManager`
- Falls back to raw result display when formatter fails or is unavailable
- Handles both React elements and string formatter results

### `tool-cancellation.ts`

Provides `createCancellationResults()` to create standardized cancellation results when users cancel tool execution. Maintains conversation state integrity by generating proper `ToolResult` objects.

## Testing

All utility functions have comprehensive test coverage:
- `tool-args-parser.spec.ts`: Tests both lenient and strict modes, edge cases
- `error-formatter.spec.ts`: Tests Error instances, non-Error types, edge cases
- `tool-cancellation.spec.ts`: Tests single/multiple tool calls, field mapping
- `tool-result-display.spec.tsx`: Tests error display, formatter execution, fallback behavior

Run tests with:
```bash
npm test
```

## Architecture Notes

### Why Not Use the Utility Everywhere?

You may notice that `parseToolArguments()` is not used in every location that parses JSON. This is intentional:

- **Tool execution paths** (`message-handler.ts`): Use strict mode to catch malformed arguments
- **Display/UI paths** (hooks, components): Use lenient mode for graceful degradation

This dual-mode design was chosen after discovering that the original codebase had two distinct error handling patterns:
- 1 location with strict parsing (throws on error)
- 8 locations with lenient parsing (silent failure)

Rather than force all code to use the same strategy, we preserved both behaviors while eliminating the duplication through a configurable utility function.

### Future Improvements

If you find yourself needing to add more parsing locations:
1. Determine if you need strict or lenient error handling
2. Use `parseToolArguments()` with the appropriate `strict` option
3. Add tests for your use case

If you need a third error handling strategy, consider:
1. Adding a new parameter to `parseToolArguments()`
2. Creating a separate utility function
3. Documenting the rationale in this README
