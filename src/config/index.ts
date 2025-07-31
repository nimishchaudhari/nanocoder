import type { OllamaConfig, Colors } from "../types/index.js";

export const ollamaConfig: OllamaConfig = {
  model: "qwen3:0.6b",
  maxTokens: 4096,
};

export const colors: Colors = {
  user: "#ffffff",
  assistant: "#CAAD8D",
  tool: "#0d9488",
  subtext: "#9ca3af",
};

export const promptPath = "./src/prompt.md";
