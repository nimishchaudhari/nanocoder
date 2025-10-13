## 1.13.6

- Added `CHANGELOG.md` and rolled out changelogs to releases.
- Updated the `/clear` command output UI to read "Chat Cleared." over "✔️ Chat Cleared..."
- Refactored `langgraph-client.ts` to removed old methods that are no longer needed. Rolled out this change to `useChatHandler.tsx`. This results in smaller, more tidy files.
- Fix: LangGraph errors leaked through to UI display. This now tidied to be from Nanocoder.
- Fix: Pressing Escape to cancel was not instant and sometimes didn't work.
