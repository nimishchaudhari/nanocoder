# AI SDK Native Types Migration Proposal

## Executive Summary

This proposal outlines a plan to migrate Nanocoder from custom type definitions and conversion layers to AI SDK's native types and utilities. The migration will reduce code complexity, improve type safety, leverage AI SDK's built-in MCP support, and align with industry standards.

## Current Architecture

### Pain Points

1. **Manual Type Conversions** (`source/ai-sdk-client.ts`)

   - `convertMessagesToAISDK()`: Converts custom `Message[]` to AI SDK format
   - `jsonSchemaToZod()`: ~80 lines of JSON Schema → Zod conversion
   - `convertToAISDKTools()`: Tool format conversion
   - Tool results converted to user messages (workaround for complexity)

2. **Custom Type Definitions** (`source/types/core.ts`)

   - Custom `Message`, `Tool`, `ToolCall`, `ToolResult` interfaces
   - Custom `LLMClient` interface that abstracts AI SDK
   - Not leveraging AI SDK's built-in type inference

3. **Custom MCP Integration** (`source/mcp/`)

   - Custom `MCPClient` implementation
   - Custom `MCPToolAdapter` to convert MCP tools
   - Not using AI SDK's `experimental_createMCPClient()`

4. **Tool Definition Complexity**
   - Tools defined with JSON Schema in custom format
   - Separate handler functions not integrated with tool definitions
   - Missing AI SDK's automatic type inference

### What Works Well

1. **Tool Confirmation System** - Custom UI for approving tool execution
2. **Tool Formatters** - React components for displaying tool calls
3. **Tool Validators** - Pre-execution validation logic
4. **Development Modes** - normal/auto-accept/plan modes
5. **Provider Abstraction** - Multi-provider support

## Proposed Architecture

### Core Changes

#### 1. Adopt AI SDK Message Types

**Before:**

```typescript
// source/types/core.ts
export interface Message {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
	name?: string;
}
```

**After:**

```typescript
// Import AI SDK types
import type {
	CoreMessage,
	CoreSystemMessage,
	CoreUserMessage,
	CoreAssistantMessage,
	CoreToolMessage,
} from 'ai';

// Use directly or create type aliases for clarity
export type Message = CoreMessage;
export type SystemMessage = CoreSystemMessage;
export type UserMessage = CoreUserMessage;
export type AssistantMessage = CoreAssistantMessage;
export type ToolMessage = CoreToolMessage;
```

**Benefits:**

- No conversion needed in `ai-sdk-client.ts`
- Proper tool result format with `toolCallId`, `toolName`, `output`
- Better for multi-turn tool calling
- Automatic compatibility with `response.messages`

#### 2. Use AI SDK Tool Definitions

**Before:**

```typescript
// source/tools/read-file.tsx
export const readFileTool: ToolDefinition = {
	handler: async args => {
		/* ... */
	},
	formatter: async (args, result) => {
		/* ... */
	},
	validator: async args => {
		/* ... */
	},
	config: {
		type: 'function',
		function: {
			name: 'read_file',
			description: '...',
			parameters: {
				type: 'object',
				properties: {
					/* JSON Schema */
				},
				required: ['path'],
			},
		},
	},
};
```

**After:**

```typescript
// source/tools/read-file.tsx
import {tool, jsonSchema} from 'ai';

// Core tool definition using AI SDK
export const readFileCoreTool = tool({
	description: 'Read the contents of a file with line numbers',
	inputSchema: jsonSchema<{path: string}>({
		type: 'object',
		properties: {
			path: {
				type: 'string',
				description: 'The path to the file to read.',
			},
		},
		required: ['path'],
	}),
	execute: async ({path}) => {
		// Handler logic here
		const absPath = resolve(path);
		const content = await readFile(absPath, 'utf-8');
		// ... format with line numbers
		return result;
	},
});

// Nanocoder-specific extensions
export const readFileTool = {
	coreTool: readFileCoreTool,
	formatter: async (args, result) => {
		/* React component */
	},
	validator: async args => {
		/* validation logic */
	},
	requiresConfirmation: false,
};
```

**Benefits:**

- Automatic type inference from schema to execute function
- No manual Zod conversion needed
- `jsonSchema()` accepts standard JSON Schema
- Execute function integrated with tool definition
- Can still add custom formatters/validators for UI

#### 3. Simplify AI SDK Client

**Before:**

```typescript
// Complex conversion functions
function convertMessagesToAISDK(messages: Message[]): any[] { /* ... */ }
function jsonSchemaToZod(schema: any): z.ZodType { /* ... */ }
function convertToAISDKTools(tools: Tool[]): Record<string, any> { /* ... */ }

async chat(messages: Message[], tools: Tool[], signal?: AbortSignal) {
  const aiMessages = convertMessagesToAISDK(messages);
  const aiTools = convertToAISDKTools(tools);
  // ...
}
```

**After:**

```typescript
// Direct usage, no conversions
async chat(messages: CoreMessage[], tools: ToolDefinition[], signal?: AbortSignal) {
  const result = await generateText({
    model: this.provider.chat(this.currentModel),
    messages, // Already in correct format
    tools: Object.fromEntries(
      tools.map(t => [t.coreTool.name, t.coreTool])
    ),
    abortSignal: signal
  });

  return {
    messages: result.messages, // Properly formatted
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    text: result.text,
    finishReason: result.finishReason
  };
}
```

**Benefits:**

- Remove ~150 lines of conversion code
- Use `response.messages` directly
- Proper tool message format
- Better type safety

#### 4. Leverage AI SDK MCP Client

**Current Implementation:**

```typescript
// source/mcp/mcp-client.ts - ~200+ lines
// source/mcp/mcp-tool-adapter.ts - ~60 lines
```

**Proposed:**

```typescript
// Evaluate using AI SDK's experimental_createMCPClient
import {experimental_createMCPClient} from 'ai';

const mcpClient = await experimental_createMCPClient({
	servers: config.mcpServers.map(server => ({
		name: server.name,
		transport: {
			type: 'stdio',
			command: server.command,
			args: server.args,
			env: server.env,
		},
	})),
});

// Tools are automatically in AI SDK format
const mcpTools = await mcpClient.tools();
```

**Decision Point:**

- Test `experimental_createMCPClient()` capabilities
- If insufficient, keep custom client but return AI SDK tool format
- Migration can be phased: types first, MCP client later

#### 5. Update LLMClient Interface

**Before:**

```typescript
export interface LLMClient {
	chat(
		messages: Message[],
		tools: Tool[],
		signal?: AbortSignal,
	): Promise<LLMChatResponse>;
	// ...
}
```

**After:**

```typescript
import type {CoreMessage, CoreTool, GenerateTextResult} from 'ai';

export interface LLMClient {
	chat(
		messages: CoreMessage[],
		tools: NanocoderTool[], // Wrapper around CoreTool
		signal?: AbortSignal,
	): Promise<GenerateTextResult>;
	// ...
}

// Extended tool definition with Nanocoder features
export interface NanocoderTool {
	coreTool: ReturnType<typeof tool>; // AI SDK tool
	formatter?: ToolFormatter;
	validator?: ToolValidator;
	requiresConfirmation?: boolean;
}
```

## Migration Plan

### Phase 1: Type Aliases (Low Risk, Foundation)

**Objective:** Introduce AI SDK types alongside existing types

**Tasks:**

1. Add type aliases in `source/types/core.ts`
   ```typescript
   import type {CoreMessage, CoreTool} from 'ai';
   export type Message = CoreMessage;
   export type Tool = CoreTool;
   ```
2. Update imports gradually, file by file
3. Run tests continuously to ensure compatibility
4. No behavioral changes, pure type refactoring

**Estimated Effort:** 2-4 hours
**Risk:** Low (types are compatible)

### Phase 2: Tool Definitions (Medium Risk, High Value)

**Objective:** Migrate tool definitions to use `tool()` and `jsonSchema()`

**Tasks:**

1. Create new tool definition pattern (see example above)
2. Migrate one tool as proof of concept (e.g., `read-file.tsx`)
3. Test thoroughly with tool confirmation UI
4. Migrate remaining tools:
   - `read-many-files.tsx`
   - `create-file.tsx`
   - `insert-lines.tsx`
   - `replace-lines.tsx`
   - `delete-lines.tsx`
   - `search-files.tsx`
   - `execute-bash.tsx`
   - `web-search.tsx`
   - `fetch-url.tsx`
5. Update `source/tools/index.ts` exports
6. Update `ToolManager` to work with new format

**Estimated Effort:** 8-12 hours
**Risk:** Medium (requires careful testing of tool execution)

### Phase 3: Message Handling (Medium Risk, High Value)

**Objective:** Use proper tool message format instead of converting to user messages

**Tasks:**

1. Update `ai-sdk-client.ts`:
   - Remove `convertMessagesToAISDK()`
   - Remove manual tool result → user message conversion
   - Use `response.messages` directly
2. Update `useChatHandler.tsx`:
   - Use `CoreToolMessage` format for tool results
   - Update message construction after tool execution
3. Update message display components:
   - Ensure they can handle all AI SDK message types
4. Test multi-turn tool calling thoroughly

**Estimated Effort:** 6-8 hours
**Risk:** Medium (core conversation handling)

### Phase 4: Simplify AI SDK Client (Low Risk, Cleanup)

**Objective:** Remove conversion functions and simplify implementation

**Tasks:**

1. Remove `jsonSchemaToZod()` function (~80 lines)
2. Remove `convertToAISDKTools()` function
3. Simplify `chat()` and `chatStream()` methods
4. Update return types to match AI SDK directly
5. Clean up type casts and `any` usage

**Estimated Effort:** 3-4 hours
**Risk:** Low (previous phases enable this)

### Phase 5: Evaluate MCP Client Migration (Low Priority, Experimental)

**Objective:** Assess if AI SDK's MCP client can replace custom implementation

**Tasks:**

1. Create proof-of-concept with `experimental_createMCPClient()`
2. Test with existing MCP servers
3. Verify tool format compatibility
4. Compare features with custom client
5. Decision: migrate or keep custom (but return AI SDK format)

**Estimated Effort:** 4-6 hours
**Risk:** Low (experimental feature, can revert)

### Phase 6: Testing & Documentation (Critical)

**Objective:** Ensure stability and document changes

**Tasks:**

1. Add unit tests for new tool definitions
2. Add integration tests for tool calling flow
3. Test with multiple providers (Ollama, OpenRouter, etc.)
4. Test MCP tool integration
5. Update CLAUDE.md with new architecture
6. Add migration notes to documentation
7. Run full test suite: `pnpm test:all`

**Estimated Effort:** 4-6 hours
**Risk:** Low (quality assurance)

## Total Estimated Effort

- **Phase 1:** 2-4 hours
- **Phase 2:** 8-12 hours
- **Phase 3:** 6-8 hours
- **Phase 4:** 3-4 hours
- **Phase 5:** 4-6 hours (optional)
- **Phase 6:** 4-6 hours

**Total: 27-40 hours** (without Phase 5: 23-34 hours)

## Benefits Summary

### Code Reduction

- Remove `jsonSchemaToZod()`: ~80 lines
- Remove `convertMessagesToAISDK()`: ~20 lines
- Remove `convertToAISDKTools()`: ~25 lines
- Simplify `chat()` methods: ~50 lines
- **Total: ~175 lines removed**

### Quality Improvements

1. **Better Type Safety:** AI SDK's type inference catches errors at compile time
2. **Less Maintenance:** Conversion code is brittle and hard to maintain
3. **Standards Alignment:** Using AI SDK types = following industry patterns
4. **Future-Proof:** Leverage AI SDK updates and new features
5. **Proper Tool Results:** Better multi-turn tool calling support

### Feature Enhancements

1. **Potential for `maxSteps`:** Enable automatic multi-step tool calling
2. **Better MCP Integration:** Possibly replace custom MCP client
3. **Middleware Support:** Could use AI SDK middleware (extractReasoning, etc.)
4. **Provider Registry:** Could leverage AI SDK's multi-provider management

## Risks & Mitigation

### Risk: Breaking Changes During Migration

**Mitigation:**

- Phased approach allows reverting individual phases
- Maintain backward compatibility during transition
- Comprehensive testing at each phase

### Risk: AI SDK Types Don't Match Exact Needs

**Mitigation:**

- Type aliases allow adding custom properties
- Can extend AI SDK types with intersections
- Keep custom features (formatters, validators) separate

### Risk: Experimental MCP Client Insufficient

**Mitigation:**

- Phase 5 is optional and low priority
- Can keep custom MCP client indefinitely
- Just ensure it returns AI SDK tool format

### Risk: Testing Coverage Gaps

**Mitigation:**

- Phase 6 dedicated to testing
- Test with real providers and MCP servers
- Manual testing of tool confirmation UI

## Success Criteria

1. ✅ All tests pass (`pnpm test:all`)
2. ✅ Tool calling works with all providers
3. ✅ Tool confirmation UI functions correctly
4. ✅ MCP tools integrate properly
5. ✅ Multi-turn tool calling works
6. ✅ ~175+ lines of conversion code removed
7. ✅ No regression in functionality
8. ✅ Documentation updated

## Recommendation

**Proceed with migration in phases 1-4, skip phase 5 initially.**

The benefits significantly outweigh the risks:

- Reduced complexity and maintenance burden
- Better type safety and developer experience
- Alignment with AI SDK standards
- Future-proof architecture

Phase 5 (MCP client) can be evaluated later once the core migration is stable.

## Next Steps

1. Review and approve this proposal
2. Create feature branch: `feat/ai-sdk-native-types`
3. Begin Phase 1: Type aliases
4. Iterate through phases with testing
5. Create pull request with comprehensive testing
6. Merge and update documentation

## AI SDK UI: Should We Use It?

### What is AI SDK UI?

AI SDK UI provides React hooks (`useChat`, `useCompletion`, `useObject`) that abstract chat state management and streaming. The `useChat` hook provides:

- **State Management:** `messages`, `status`, `error`
- **Methods:** `sendMessage()`, `stop()`, `setMessages()`, `addToolResult()`
- **Auto-streaming:** Handles streaming updates automatically
- **Tool Support:** Built-in `onToolCall` and `addToolResult()` for tool calling

### Current Nanocoder State Management

**Current Implementation (1267 lines across 3 hooks):**

- `useAppState.tsx` (228 lines): 30+ state variables, setters, and utilities
- `useChatHandler.tsx` (580 lines): Message handling, tool calling flow, streaming
- `useToolHandler.tsx` (459 lines): Tool confirmation, execution, result handling

### Analysis: Should We Adopt AI SDK UI?

**❌ NO - AI SDK UI is NOT a Good Fit for Nanocoder**

Here's why:

#### 1. **Browser-Centric Design, Not Terminal-Compatible**

AI SDK UI is designed for web browsers with HTTP transports:

```typescript
// useChat expects HTTP endpoints
const {messages, sendMessage} = useChat({
	api: '/api/chat', // HTTP endpoint
	// ...
});
```

Nanocoder directly calls AI SDK Core functions (no HTTP layer):

```typescript
// Nanocoder's approach - direct client calls
const result = await client.chat(messages, tools, signal);
```

**Issue:** `useChat` assumes a client-server architecture. Nanocoder runs everything locally in the terminal without HTTP.

#### 2. **Transport Layer Mismatch**

AI SDK UI 5.0 uses a "transport" architecture:

- Messages sent to server endpoint
- Server streams responses back
- Browser receives and updates UI

Nanocoder's architecture:

- All processing happens in-process
- Direct AI SDK Core API calls
- No HTTP transport needed

**Workaround Needed:** Would need to create custom "transport" that wraps direct API calls, adding unnecessary complexity.

#### 3. **Tool Confirmation Flow Not Supported**

Nanocoder's key feature: **Manual tool confirmation**

Current flow:

1. Model proposes tool calls
2. User sees confirmation UI (one tool at a time)
3. User approves/rejects/edits
4. Tool executes
5. Result sent back to model

AI SDK UI's `useChat`:

- `onToolCall` is informational only
- `addToolResult()` expects you to execute immediately
- No built-in pause-for-confirmation pattern

**Issue:** Would need to override/hack the tool calling flow, negating the benefits of using `useChat`.

#### 4. **Development Modes Not Compatible**

Nanocoder has three modes:

- **Normal:** Tool confirmation required
- **Auto-accept:** Automatic execution
- **Plan:** Blocks file modifications

AI SDK UI: Single execution model, no mode concept.

#### 5. **Chat Queue and Component Rendering**

Nanocoder uses custom rendering:

- `chatComponents` array with React elements
- Tool formatters return React components
- Displayed via Ink's `<Static>` component
- Custom UI for tool results, errors, etc.

AI SDK UI: Message-based rendering designed for browser DOM.

#### 6. **Custom State Requirements**

Nanocoder needs state that `useChat` doesn't provide:

- `isToolConfirmationMode`, `isToolExecuting`
- `pendingToolCalls`, `currentToolIndex`, `completedToolResults`
- `developmentMode`, `isCancelling`
- `displayMessages` vs full `messages` (performance optimization)
- `messageTokenCache` for context tracking
- Mode states: `isModelSelectionMode`, `isProviderSelectionMode`, etc.

**Issue:** Would still need `useAppState` even with `useChat`, so no reduction in complexity.

#### 7. **Streaming Architecture Difference**

Nanocoder's streaming:

- Token batching (10 tokens / 75ms) for performance
- Custom `StreamingMessage` component outside `<Static>`
- Direct access to AI SDK's `textStream`

AI SDK UI: Manages streaming internally, less control over rendering.

### Verdict: Keep Custom Hooks

**Recommendation:** Do NOT migrate to AI SDK UI.

**Reasons:**

1. ✅ **Nanocoder's direct API approach is simpler** - No HTTP overhead
2. ✅ **Tool confirmation is a core feature** - Not supported by `useChat`
3. ✅ **Custom UI components** - Better suited for terminal (Ink)
4. ✅ **Development modes** - Unique to Nanocoder
5. ✅ **State requirements** - Too specialized for `useChat`
6. ✅ **Performance optimizations** - Custom batching, display limits

**What We SHOULD Do:**

- ✅ Migrate to AI SDK Core types (as per original proposal)
- ✅ Use `tool()`, `jsonSchema()`, `CoreMessage` types
- ✅ Optionally use `experimental_createMCPClient()`
- ❌ Skip AI SDK UI - it's designed for browser web apps, not terminal apps

### Alternative: `convertToModelMessages` Utility

If we adopt AI SDK's message types (Phase 3), we might benefit from:

- `convertToModelMessages()` - Convert UI messages to model messages (if needed)
- `pruneMessages()` - Intelligent message pruning for context limits

These are standalone utilities that don't require `useChat`.

## Questions for Discussion

1. Should we migrate MCP client (Phase 5) or keep custom implementation?
2. Any specific tools that need special attention during migration?
3. Should we use `maxSteps` for automatic multi-turn tool calling or keep manual control?
4. Could `pruneMessages()` help with context management?
5. Timeline preferences - all at once or spread over multiple PRs?
