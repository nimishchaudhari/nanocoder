# Phase 2: Tool Definitions Migration - Status

## Progress: Proof-of-Concept Complete ✅

### What's Been Done

1. **Successful POC with `read-file.tsx`**
   - Migrated to use AI SDK's `tool()` and `jsonSchema()` helpers
   - Maintained backward compatibility with existing `ToolDefinition` interface
   - All tests pass (format, types, lint, unit tests, knip)

2. **New Pattern Established**
   ```typescript
   // 1. Shared execute function
   const executeReadFile = async (args: {path: string}): Promise<string> => {
     // Implementation here
   };

   // 2. AI SDK tool definition
   const readFileCoreTool = tool({
     description: '...',
     inputSchema: jsonSchema<{path: string}>({...}),
     execute: executeReadFile,
   });

   // 3. Nanocoder tool definition (maintains compatibility)
   export const readFileTool: ToolDefinition = {
     handler: executeReadFile,  // Reuses same function
     formatter,                  // Custom UI formatter
     validator,                  // Custom validation
     requiresConfirmation: false,
     config: {...}              // Keep for Phase 3 migration
   };

   // 4. Export core tool for Phase 3-4
   export {readFileCoreTool};
   ```

### Benefits Demonstrated

1. ✅ **Type Safety**: AI SDK's `jsonSchema<T>()` provides automatic type inference
2. ✅ **Code Reuse**: Same `execute` function used by both formats
3. ✅ **Backward Compatible**: Existing tool confirmation UI still works
4. ✅ **No Breaking Changes**: All existing code continues to work
5. ✅ **Future-Ready**: Core tools exported for Phase 3-4 migration

### Remaining Work for Phase 2

**9 more tools to migrate** (following the same pattern):

#### File Operation Tools (5 tools)
- [ ] `create-file.tsx` - Create new files
- [ ] `insert-lines.tsx` - Insert lines at position
- [ ] `replace-lines.tsx` - Replace line ranges
- [ ] `delete-lines.tsx` - Delete line ranges
- [ ] `read-many-files.tsx` - Read multiple files

#### Web & System Tools (4 tools)
- [ ] `execute-bash.tsx` - Execute bash commands
- [ ] `web-search.tsx` - Perform web searches
- [ ] `fetch-url.tsx` - Fetch URL content
- [ ] `search-files.tsx` - Search files with ripgrep

### Estimation

- **Per tool**: ~15-20 minutes (straightforward conversion)
- **Total time**: ~2.5-3 hours for all 9 tools
- **Testing**: ~30 minutes
- **Total Phase 2**: ~3-3.5 hours remaining

### Key Learnings from POC

1. **Pattern Works Well**: The dual-definition approach maintains compatibility while preparing for migration
2. **No Schema Conversion Needed**: AI SDK's `jsonSchema()` accepts standard JSON Schema directly
3. **Type Inference Works**: TypeScript correctly infers types from `jsonSchema<T>()`
4. **Execute Functions Simple**: Just need to match the signature `(args: T) => Promise<Result>`
5. **Formatters/Validators Preserved**: Custom UI features remain intact

### Next Steps Options

**Option A: Complete All Tools Now**
- Migrate all 9 remaining tools
- ~3-3.5 hours of work
- Phase 2 fully complete

**Option B: Incremental Migration**
- Migrate tools as needed
- Each tool can be done independently
- No rush since POC proves the pattern works

**Option C: Pause and Commit POC**
- Commit Phase 2 POC as progress checkpoint
- Continue later with remaining tools
- Demonstrates feasibility without full commitment

### Recommendation

**Option C** - Commit the POC now as Phase 2 checkpoint. This:
- Proves the migration pattern works
- Provides a reference for future tool migrations
- Allows evaluation before committing to full migration
- Can be extended later tool-by-tool

The remaining 9 tools are straightforward conversions following the established pattern. They can be migrated incrementally or all at once when ready to proceed.

## Files Changed (POC)

- `source/tools/read-file.tsx` - Migrated to AI SDK pattern
- `source/types/core.ts` - Exported `tool` and `jsonSchema` helpers
- `knip.json` - Updated to ignore Phase 3-4 exports

## Testing

All tests pass:
- ✅ Format check
- ✅ Type check
- ✅ Lint check
- ✅ Unit tests (200 tests)
- ✅ Knip (unused code detection)

## Phase 2 Complete Status

**POC: Complete ✅**
**Full Migration: 1/10 tools (10%)**

Remaining tools can be migrated using the same pattern demonstrated in `read-file.tsx`.
