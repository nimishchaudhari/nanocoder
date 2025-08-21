// import type { Command } from "../types/index.js";
// import { primaryColor, secondaryColor } from "../../ui/colors.js";
// import { getCurrentChatSession } from "../chat.js";
// import { borderedContent } from "../ui/bordered-content.js";

// export const commandsCommand: Command = {
//   name: "custom-commands",
//   description: "List all custom commands from .nanocoder/commands",
//   handler: async (_args: string[]): Promise<void> => {
//     const chatSession = getCurrentChatSession();
//     if (!chatSession) {
//       p.log.error("No active chat session found.");
//       return;
//     }

//     const customLoader = chatSession.getCustomCommandLoader();
//     const commands = customLoader.getAllCommands();

//     if (commands.length === 0) {
//       borderedContent(
//         "No custom commands found",
//         `${
//           `To create custom commands:\n` +
//           `1. Create a ${secondaryColor(
//             ".nanocoder/commands"
//           )} directory in your project\n` +
//           `2. Add ${secondaryColor(".md")} files with command prompts\n` +
//           `3. Optionally add frontmatter for metadata:\n\n` +
//           `${secondaryColor("---")}\n` +
//           `${secondaryColor("description: Generate unit tests")}\n` +
//           `${secondaryColor("aliases: [test, unittest]")}\n` +
//           `${secondaryColor("parameters: [filename]")}\n` +
//           `${secondaryColor("---")}\n` +
//           `${secondaryColor(
//             "Generate comprehensive unit tests for {{filename}}..."
//           )}\n`
//         }`
//       );
//       return;
//     }

//     // Sort all commands alphabetically by full name
//     const sortedCommands = commands.sort((a, b) =>
//       a.fullName.localeCompare(b.fullName)
//     );

//     let output = `\n`;

//     // Show all commands in a flat list
//     for (const cmd of sortedCommands) {
//       output += formatCommand(cmd) + "\n";
//     }

//     borderedContent("Custom Commands", output.trim());
//   },
// };

// function formatCommand(cmd: any): string {
//   const parts: string[] = [`• /${cmd.fullName}`];

//   if (cmd.metadata.parameters && cmd.metadata.parameters.length > 0) {
//     parts.push(cmd.metadata.parameters.map((p: string) => `<${p}>`).join(" "));
//   }

//   if (cmd.metadata.description) {
//     parts.push(`- ${cmd.metadata.description}`);
//   }

//   if (cmd.metadata.aliases && cmd.metadata.aliases.length > 0) {
//     const aliasNames = cmd.metadata.aliases.map((a: string) =>
//       cmd.namespace ? `${cmd.namespace}:${a}` : a
//     );
//     parts.push(`(aliases: ${aliasNames.join(", ")})`);
//   }

//   return parts.join(" ");
// }
