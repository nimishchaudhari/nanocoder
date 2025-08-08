import { Command } from "../../types/index.js";
import * as p from "@clack/prompts";
import { getCurrentChatSession } from "../chat.js";
import { successColor } from "../../ui/colors.js";

export const modelCommand: Command = {
  name: "model",
  description: "Select the current model",
  handler: async (args: string[]) => {
    const chatSession = getCurrentChatSession();
    if (!chatSession) {
      p.log.error("No active chat session found.");
      return;
    }

    try {
      // Get list of available models from the current client
      const availableModels = await chatSession.getAvailableModels();

      if (availableModels.length === 0) {
        p.log.error("No models available. Please check your configuration.");
        return;
      }

      const currentModel = chatSession.getCurrentModel();
      const modelChoices = availableModels.map((model) => ({
        name: `${model}${model === currentModel ? " (current)" : ""}`,
        value: model,
      }));

      const selectedModel = await p.select({
        message: "Select a model:",
        options: modelChoices.map((choice) => ({
          label: choice.name,
          value: choice.value,
        })),
      });

      if (p.isCancel(selectedModel)) {
        p.cancel("Operation cancelled");
        return;
      }

      if (selectedModel !== currentModel) {
        chatSession.setModel(selectedModel);
        p.log.success(successColor(`Model changed to: ${selectedModel}`));
      } else {
        p.log.message("Model unchanged.");
      }
    } catch (error) {
      p.log.error(`Error accessing models: ${error}`);
      p.log.warn("Make sure your provider is properly configured.");
    }
  },
};
