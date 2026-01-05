# AGENTS.md

AI coding agent instructions for **@nanocollective/nanocoder**

## Project Overview

A local-first CLI coding agent that brings the power of agentic coding tools like Claude Code and Gemini CLI to local models or controlled APIs like OpenRouter

**Project Type:** React Web Application
**Primary Language:** TypeScript (99% of codebase)

## Architecture

**Key Frameworks & Libraries:**
- React (^19.0.0) - web

**Project Structure:**
- `assets/` - Static assets
- `docs/` - Documentation
- `source/` - Source code
- `.github/assets/` - Static assets
- `source/ai-sdk-client/` - Project files
- `source/app/` - Application code
- `source/commands/` - Project files
- `source/components/` - React/UI components
- `source/config/` - Configuration files
- `source/context/` - Project files
- `source/custom-commands/` - Project files
- `source/hooks/` - Project files
- `source/init/` - Project files
- `source/lsp/` - Project files
- `source/markdown-parser/` - Project files
- `source/mcp/` - Project files
- `source/model-database/` - Project files
- `source/models/` - Data models
- `source/security/` - Project files
- `source/services/` - Service layer

## Key Files

**Configuration:**
- `package.json` - Node.js dependencies and scripts
- `plugins/vscode/package.json` - Node.js dependencies and scripts
- `pnpm-lock.yaml` - Configuration file

**Documentation:**
- `.devcontainer/README.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`

## Development Commands

**Build:**
```bash
npm run build
```

**Development:**
```bash
npm run dev
```

**Start:**
```bash
npm run start
```

## Code Style Guidelines

- Use camelCase for variables and functions
- Use PascalCase for classes and components
- Prefer const/let over var
- Use async/await over callbacks when possible
- Use functional components with hooks
- Follow React naming conventions for components

## Testing

**Test Files:**
- `.nanocoder/commands/test.md`
- `scripts/test.sh`
- `source/ai-sdk-client/ai-sdk-client.spec.ts`
- `source/ai-sdk-client/chat/chat-handler.spec.ts`
- `source/ai-sdk-client/chat/streaming-handler.spec.ts`

## Existing Project Guidelines

*The following guidelines were found in existing AI configuration files:*

### AI Agent Guidelines
**From AGENTS.md:**
## Project Overview
A local-first CLI coding agent that brings the power of agentic coding tools like Claude Code and Gemini CLI to local models or controlled APIs like OpenRouter

**Project Type:** React Web Application
**Primary Language:** TypeScript (98% of codebase)

## Architecture
**Key Frameworks & Libraries:**

- React (^19.0.0) - web

**Project Structure:**

- `assets/` - Static assets
- `docs/` - Documentation
- `source/` - Source code
- `source/app/` - Application code
- `source/commands/` - Project files
- `source/components/` - React/UI components
- `source/config/` - Configuration files
- `source/context/` - Project files
- `source/custom-commands/` - Project files
- `source/hooks/` - Project files
- `source/init/` - Project files
- `source/lsp/` - Project files
- `source/markdown-parser/` - Project files
- `source/mcp/` - Project files
- `source/model-database/` - Project files
- `source/models/` - Data models
- `source/tokenization/` - Project files
- `source/tool-calling/` - Project files
- `source/tools/` - Project files
- `source/types/` - Project files

## Code Style Guidelines
- Use camelCase for variables and functions
- Use PascalCase for classes and components
- Prefer const/let over var
- Use async/await over callbacks when possible
- Use functional components with hooks
- Follow React naming conventions for components

## Testing
**Test Files:**

- `.nanocoder/commands/test.md`
- `scripts/test.sh`
- `source/ai-sdk-client-empty-message.spec.ts`
- `source/ai-sdk-client-error-handling.spec.ts`
- `source/ai-sdk-client-maxretries.spec.ts`

## Existing Project Guidelines
_The following guidelines were found in existing AI configuration files:_

### AI Agent Guidelines
**From AGENTS.md:**

## Project Overview
A local-first CLI coding agent that brings the power of agentic coding tools like Claude Code and Gemini CLI to local models or controlled APIs like OpenRouter

**Project Type:** React Web Application
**Primary Language:** TypeScript (98% of codebase)

## Architecture
**Key Frameworks & Libraries:**

- React (^19.0.0) - web

**Project Structure:**

- `docs/` - Documentation
- `source/` - Source code
- `source/app/` - Application code
- `source/commands/` - Project files
- `source/components/` - React/UI components
- `source/config/` - Configuration files
- `source/custom-commands/` - Project files
- `source/hooks/` - Project files
- `source/init/` - Project files
- `source/integration/` - Project files
- `source/mcp/` - Project files
- `source/recommendations/` - Project files
- `source/system/` - Project files
- `source/tool-calling/` - Project files
- `source/tools/` - Project files
- `source/types/` - Project files
- `source/utils/` - Utility functions
- `source/wizard/` - Project files
- `source/app/prompts/` - Project files
- `source/app/utils/` - Utility functions

## Code Style Guidelines
- Use camelCase for variables and functions
- Use PascalCase for classes and components
- Prefer const/let over var
- Use async/await over callbacks when possible
- Use functional components with hooks
- Follow React naming conventions for components

## Testing
**Test Files:**

- `.nanocoder/commands/test.md`
- `scripts/test.sh`
- `source/components/assistant-message.spec.tsx`
- `source/components/user-input.spec.tsx`
- `source/components/user-message.spec.tsx`

## Existing Project Guidelines
_The following guidelines were found in existing AI configuration files:_

### AI Agent Guidelines
**From CLAUDE.md:**

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript in dist/ with executable permissions
- `npm run start` - Run the compiled application from dist/cli.js
- `npm run dev` - Watch mode compilation (tsc --watch)
- `npm run prepublishOnly` - Build before publishing (runs automatically)

### Testing and Code Quality
- `npm run test:all` - Run full test suite: prettier format check, TypeScript check, linting, AVA tests, and knip unused code check (or use `./scripts/test.sh`)
- `npm run test:ava` - Run only AVA tests
- `npm run test:ava:coverage` - Run AVA tests with code coverage (c8)
- `npm run test:format` - Check code formatting with Prettier
- `npm run test:types` - TypeScript type checking without compilation
- `npm run test:lint` - Run ESLint on all files
- `npm run test:lint:fix` - Auto-fix ESLint issues
- `npm run test:knip` - Check for unused code/imports
- `npm run format` - Format code with Prettier (write mode)
- AVA tests located in `source/**/*.spec.ts` with tsx loader

### Core Structure
Nanocoder is a React-based CLI coding agent built with Ink.js that provides local-first AI assistance with multiple provider support (Ollama, OpenRouter, OpenAI-compatible APIs).

**Entry Point**: `source/cli.tsx` → Ink render of `App` component from `source/app.tsx`

### State Management Pattern
**Central State Hub** (`useAppState.tsx`)

- All state variables declared here
- Exported setters/updaters as part of return object
- Prevents prop drilling across deeply nested components

**Derived Handlers** (Extracted to hooks)

- `useChatHandler`: Uses state from `useAppState`
- `useToolHandler`: Uses state from `useAppState`
- `useModeHandlers`: Uses state from `useAppState`
- All hooks receive necessary state and setState functions
- App.tsx orchestrates these hooks and passes their methods to UI components

**Message Queue Pattern** (`message-queue.ts`)

- Global callback for adding components to chat
- Allows deeply nested components to add messages
- Used for streaming responses without prop drilling

### LLM Client Architecture
**Client Factory** (`client-factory.ts`)

- Single entry point: `createLLMClient(provider?)`
- Implements provider fallback logic
- Returns `{client, actualProvider}` tuple
- Handles `ConfigurationError` for missing config

**AI SDK Client** (`ai-sdk-client.ts`)

- Uses Vercel AI SDK with `createOpenAICompatible`
- Compatible with any OpenAI-compatible API
- Handles both tool-calling and non-tool-calling models
- Stream support for real-time responses
- Error parsing and user-friendly messages

**Tool Integration**

- Passes `AISDKCoreTool[]` definitions to LLM via AI SDK
- LLM returns `ToolCall[]` when needed
- Tools executed locally via tool handlers
- Results sent back to LLM for context

### Build Process
1. **tsc**: Compile TypeScript to JavaScript
2. **tsc-alias**: Resolve path aliases in compiled output
3. **chmod +x**: Make dist/cli.js executable
4. **prepublishOnly**: Runs before npm publish

## AI Coding Assistance Notes
**Important Considerations:**

- Check package.json for available scripts before running commands
- Be aware of Node.js version requirements
- Consider impact on bundle size when adding dependencies
- Follow React hooks best practices
- Consider component reusability when creating new components
- Project has 177 files across 31 directories
- Check build configuration files before making structural changes

**From CLAUDE.md:**

### Build and Run
- `npm run build` - Compile TypeScript to JavaScript in dist/ with executable permissions
- `npm run start` - Run the compiled application from dist/cli.js
- `npm run dev` - Watch mode compilation (tsc --watch)
- `npm run prepublishOnly` - Build before publishing (runs automatically)

### Testing and Code Quality
- `npm run test:all` - Run full test suite: prettier format check, TypeScript check, linting, AVA tests, and knip unused code check (or use `./scripts/test.sh`)
- `npm run test:ava` - Run only AVA tests
- `npm run test:ava:coverage` - Run AVA tests with code coverage (c8)
- `npm run test:format` - Check code formatting with Prettier
- `npm run test:types` - TypeScript type checking without compilation
- `npm run test:lint` - Run ESLint on all files
- `npm run test:lint:fix` - Auto-fix ESLint issues
- `npm run test:knip` - Check for unused code/imports
- `npm run format` - Format code with Prettier (write mode)
- AVA tests located in `source/**/*.spec.ts` with tsx loader

### Core Structure
Nanocoder is a React-based CLI coding agent built with Ink.js that provides local-first AI assistance with multiple provider support (Ollama, OpenRouter, OpenAI-compatible APIs).

**Entry Point**: `source/cli.tsx` → Ink render of `App` component from `source/app.tsx`

### State Management Pattern
**Central State Hub** (`useAppState.tsx`)

- All state variables declared here
- Exported setters/updaters as part of return object
- Prevents prop drilling across deeply nested components

**Derived Handlers** (Extracted to hooks)

- `useChatHandler`: Uses state from `useAppState`
- `useToolHandler`: Uses state from `useAppState`
- `useModeHandlers`: Uses state from `useAppState`
- All hooks receive necessary state and setState functions
- App.tsx orchestrates these hooks and passes their methods to UI components

**Message Queue Pattern** (`message-queue.ts`)

- Global callback for adding components to chat
- Allows deeply nested components to add messages
- Used for streaming responses without prop drilling

### LLM Client Architecture
**Client Factory** (`client-factory.ts`)

- Single entry point: `createLLMClient(provider?)`
- Implements provider fallback logic
- Returns `{client, actualProvider}` tuple
- Handles `ConfigurationError` for missing config

**AI SDK Client** (`ai-sdk-client.ts`)

- Uses Vercel AI SDK with `createOpenAICompatible`
- Compatible with any OpenAI-compatible API
- Handles both tool-calling and non-tool-calling models
- Stream support for real-time responses
- Error parsing and user-friendly messages

**Tool Integration**

- Passes `AISDKCoreTool[]` definitions to LLM via AI SDK
- LLM returns `ToolCall[]` when needed
- Tools executed locally via tool handlers
- Results sent back to LLM for context

### Build Process
1. **tsc**: Compile TypeScript to JavaScript
2. **tsc-alias**: Resolve path aliases in compiled output
3. **chmod +x**: Make dist/cli.js executable
4. **prepublishOnly**: Runs before npm publish

## AI Coding Assistance Notes
**Important Considerations:**

- Check package.json for available scripts before running commands
- Be aware of Node.js version requirements
- Consider impact on bundle size when adding dependencies
- Follow React hooks best practices
- Consider component reusability when creating new components
- Project has 289 files across 45 directories
- Check build configuration files before making structural changes

**From CLAUDE.md:**
# Build and run
pnpm run build          # Compile TypeScript to dist/ with executable permissions
pnpm run start          # Run the compiled application
pnpm run dev            # Watch mode compilation (tsc --watch)

# Testing (run before committing)
pnpm run test:all       # Full suite: format, lint, types, AVA tests, knip

## Project Overview
Nanocoder is a React-based CLI coding agent built with Ink.js that provides local-first AI assistance with multiple provider support (Ollama, OpenRouter, any OpenAI-compatible API).

**Entry point**: `source/cli.tsx` → Ink render of `App` from `source/app.tsx`

### State Management Pattern
All state lives in `useAppState.tsx`. Other hooks (`useChatHandler`, `useToolHandler`, `useModeHandlers`) receive state and setters from it. `App.tsx` orchestrates these hooks together. Global `message-queue.ts` allows deep components to add chat messages.

### LLM Client Architecture
`client-factory.ts` creates clients via `createLLMClient(provider?)`. Uses Vercel AI SDK with `createOpenAICompatible` for any OpenAI-compatible API. Supports streaming responses and tool calling.

## Code Style
- **TypeScript strict mode** with `@/*` path alias mapping to `source/*`
- **Biome** for formatting (tabs, single quotes, semicolons, trailing commas)
- **Key lint rules**: `useExhaustiveDependencies: error`, `noUnusedVariables: error`, `noUnusedImports: error`
- **React 19** with Ink.js for CLI rendering

## Testing
- **Framework**: AVA with tsx loader
- **Location**: `source/**/*.spec.ts` files alongside source
- **Serial execution**: Tests run one at a time
- **Run single test**: `pnpm run test:ava source/path/to/file.spec.ts`


## AI Coding Assistance Notes

**Important Considerations:**
- Check package.json for available scripts before running commands
- Be aware of Node.js version requirements
- Consider impact on bundle size when adding dependencies
- Follow React hooks best practices
- Consider component reusability when creating new components
- Project has 562 files across 86 directories
- Large codebase: Focus on specific areas when making changes
- Check build configuration files before making structural changes

## Repository

**Source:** https://github.com/Nano-Collective/nanocoder.git

---

*This AGENTS.md file was generated by Nanocoder. Update it as your project evolves.*