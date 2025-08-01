import type { OllamaConfig, Colors } from "../types/index.js";

export const ollamaConfig: OllamaConfig = {
  model: "qwen3:0.6b",
  maxTokens: 4096,
  contextSize: 4000, // Default context size for qwen3:0.6b, adjust to match your Ollama settings
};

export const colors: Colors = {
  white: "#ffffff",
  primary: "#CAAD8D",
  tool: "#0d9488",
  success: "#00d492",
  error: "#ff6467",
  secondary: "#9ca3af",
  blue: "#8ec6ff",
};

export const promptPath = "./src/prompt.md";
