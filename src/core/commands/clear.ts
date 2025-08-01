import { Command } from "../../types/index.js";
import { getCurrentChatSession } from "../chat.js";

export const clearCommand: Command = {
  name: "clear",
  description: "Clear the chat history and model context",
  handler: async (_args: string[]) => {
    console.clear();

    const chatSession = getCurrentChatSession();
    if (chatSession) {
      chatSession.clearHistory();
      console.log("Chat history and model context cleared.");
      console.log();
      return "";
    }
    console.log();
    console.log("Chat history cleared.");
    console.log();
    return "";
  },
};
