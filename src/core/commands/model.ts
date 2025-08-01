import { Command } from "../../types/index.js";
import { Ollama } from "ollama";
import inquirer from "inquirer";
import { primaryColor, successColor, errorColor } from "../../ui/colors.js";
import { getCurrentChatSession } from "../chat.js";

export const modelCommand: Command = {
  name: "model",
  description: "Select the current Ollama model",
  handler: async (args: string[]) => {
    const chatSession = getCurrentChatSession();
    if (!chatSession) {
      console.log(errorColor("No active chat session found."));
      return;
    }

    const ollama = new Ollama();

    try {
      // Get list of available models
      const models = await ollama.list();

      if (models.models.length === 0) {
        console.log(
          errorColor("No Ollama models found. Please install a model first.")
        );
        return;
      }

      const currentModel = chatSession.getCurrentModel();
      const modelChoices = models.models.map((model) => ({
        name: `${model.name} (${
          Math.round((model.size / 1024 / 1024 / 1024) * 100) / 100
        }GB)${model.name === currentModel ? " (current)" : ""}`,
        value: model.name,
      }));

      console.log();
      const answer = await inquirer.prompt({
        type: "list",
        name: "selectedModel",
        message: "Select a model:",
        choices: modelChoices,
        default: currentModel,
      });
      console.log();

      if (answer.selectedModel !== currentModel) {
        chatSession.setModel(answer.selectedModel);
        console.log(
          successColor(`✓ Model changed to: ${answer.selectedModel}`)
        );
      } else {
        console.log("Model unchanged.");
      }
      console.log();
    } catch (error) {
      console.log(errorColor(`Error accessing Ollama: ${error}`));
      console.log("Make sure Ollama is running and accessible.");
    }
  },
};
