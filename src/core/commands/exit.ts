import { Command } from "../../types/index.js";
import { endConversation } from "../../ui/output.js";

export const exitCommand: Command = {
  name: "exit",
  description: "Exit the application",
  handler: async (_args: string[]) => {
    endConversation();
    process.exit(0);
  },
};
