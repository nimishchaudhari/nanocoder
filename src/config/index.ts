import type { AppConfig, Colors } from "../types/index.js";
import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Function to load app configuration from agents.config.json if it exists
function loadAppConfig(): AppConfig {
  const agentsJsonPath = join(process.cwd(), "agents.config.json");

  if (existsSync(agentsJsonPath)) {
    try {
      const agentsData = JSON.parse(readFileSync(agentsJsonPath, "utf-8"));

      if (agentsData.nanocoder) {
        return {
          openRouter: agentsData.nanocoder.openRouter,
          openAICompatible: agentsData.nanocoder.openAICompatible,
          mcpServers: agentsData.nanocoder.mcpServers,
        };
      }
    } catch (error) {
      console.warn("Failed to parse agents.config.json:", error);
    }
  }

  return {};
}

export const appConfig = loadAppConfig();

// Legacy exports for backwards compatibility
export const ollamaConfig = {
  maxTokens: 4096,
  contextSize: 4000,
};

export const colors: Colors = {
  white: "#c0caf5",
  black: "#1a1b26",
  primary: "#bb9af7",
  tool: "#7dcfff",
  success: "#9ece6a",
  error: "#f7768e",
  secondary: "#565f89",
  blue: "#7aa2f7",
  orange: "#ff9e64",
};

// Get the package root directory (where this module is installed)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Go up from dist/config to package root, then to src/prompt.md
export const promptPath = join(__dirname, "../../src/prompt.md");
