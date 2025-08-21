// import { Command } from "../types/index.js";
// import { getCurrentChatSession } from "../chat.js";
// import { startNewConversation } from "../../ui/output.js";

// export const clearCommand: Command = {
//   name: "clear",
//   description: "Clear the chat history and model context",
//   handler: async (_args: string[]) => {
//     const chatSession = getCurrentChatSession();
//     if (chatSession) {
//       await chatSession.clearHistory();
//     }

//     // End current conversation and start fresh
//     startNewConversation();

//     return "";
//   },
// };
