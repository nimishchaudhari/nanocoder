import { Command } from "../../types/index.js";
import { primaryColor } from "../../ui/colors.js";

export const exitCommand: Command = {
  name: "exit",
  description: "Exit the application",
  handler: async (_args: string[]) => {
    console.log();
    console.log(primaryColor("Goodbye!"));
    console.log();
    process.exit(0);
  },
};
