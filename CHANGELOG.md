## 1.13.7

- Updated `LICENSE.md` to be `MIT License with Attribution`. This was done to keep the spirit of MIT but also ensure the technology built by contributors is properly credited.
- We added a new system prompt with better instructions, ordering, tool documentation and included system information.

  - Old system prompts are dated using the following format: `yyyy-mm-dd-main-prompt.md` where the date is when the prompt was retired.

- Fix: import aliases within the code now use `@/` syntax _without_ file extensions. This is an under-the-hood refactor to improve code readability and use more modern standards.
- Fix: All but the last message in the chat was made static through Ink. This still causes _some_ terminal flicker if the last message was a long one. All messages are immediately made static now to further improve performance.

If there are any problems, feedback or thoughts please drop an issue or message us through Discord! Thank you for using Nanocoder. 🙌

## 1.13.6

- Added `CHANGELOG.md` and rolled out changelogs to releases.
- Updated the `/clear` command output UI to read "Chat Cleared." over "✔️ Chat Cleared..."
- Refactored `langgraph-client.ts` to removed old methods that are no longer needed. Rolled out this change to `useChatHandler.tsx`. This results in smaller, more tidy files.
- Fix: LangGraph errors leaked through to UI display. This is now tidied to be from Nanocoder.
- Fix: Pressing Escape to cancel model responses was not instant and sometimes didn't work.
