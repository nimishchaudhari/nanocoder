import { Command } from "../../types/index.js";
import { select } from "@inquirer/prompts";
import { successColor, errorColor } from "../../ui/colors.js";
import { getCurrentChatSession } from "../chat.js";

export const providerCommand: Command = {
  name: "provider",
  description: "Switch between AI providers",
  handler: async (_args: string[]) => {
    const chatSession = getCurrentChatSession();
    if (!chatSession) {
      console.log(errorColor("No active chat session found."));
      return;
    }

    try {
      const availableProviders = chatSession.getAvailableProviders();
      const currentProvider = chatSession.getCurrentProvider();

      const providerChoices = availableProviders.map((provider) => ({
        name: `${provider}${provider === currentProvider ? " (current)" : ""}`,
        value: provider,
      }));

      console.log();
      
      // Add bottom margin for provider selection input
      process.stdout.write('\n\n\n\n\n\u001b[5A');
      
      const selectedProvider = await select({
        message: "Select a provider:",
        choices: providerChoices,
        default: currentProvider,
      });
      console.log();

      if (selectedProvider !== currentProvider) {
        await chatSession.setProvider(selectedProvider);
        console.log(
          successColor(`✓ Provider changed to: ${selectedProvider}`)
        );
        console.log(
          successColor(`✓ Current model: ${chatSession.getCurrentModel()}`)
        );
        console.log(successColor("✓ Chat history cleared"));
      } else {
        console.log("Provider unchanged.");
      }
      console.log();
    } catch (error) {
      console.log(errorColor(`Error switching provider: ${error}`));
    }
    console.log();
  },
};
