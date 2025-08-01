import { Command } from "../../types/index.js";
import { getCurrentChatSession } from "../chat.js";

export const clearCommand: Command = {
  name: "clear",
  description: "Clear the chat history and model context",
  handler: async (_args: string[]) => {
    const chatSession = getCurrentChatSession();
    if (chatSession) {
      await chatSession.clearHistory();
    }
    
    // Clear screen and scrollback buffer using ANSI escape sequences
    process.stdout.write('\u001b[2J\u001b[3J\u001b[H');
    console.log("Chat history and model context cleared.");
    console.log();
    return "";
  },
};
