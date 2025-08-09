import type { Command } from "../../types/index.js";
import { promptHistory } from "../prompt-history.js";
import { primaryColor } from "../../ui/colors.js";
import * as p from "@clack/prompts";

export const historyCommand: Command = {
  name: "history",
  description: "Select from recent prompt history",
  handler: async () => {
    const history = promptHistory.getHistory();

    if (history.length === 0) {
      p.log.info("No prompt history available.");
      return;
    }

    // Reverse to show most recent first
    const recentHistory = [...history].reverse();

    const selected = await p.select({
      message: primaryColor("Select a prompt from history:"),
      options: recentHistory.map((prompt, index) => ({
        label: prompt.length > 60 ? `${prompt.slice(0, 60)}...` : prompt,
        value: prompt,
        hint: `#${history.length - index}`,
      })),
    });

    if (p.isCancel(selected)) {
      p.log.info("Selection cancelled.");
      return;
    }

    // Return the selected prompt so it gets executed
    return `EXECUTE_PROMPT:${selected}`;
  },
};
