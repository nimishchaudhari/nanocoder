import { readFileSync } from "fs";
import type { CustomCommandMetadata, ParsedCommand } from "./types.js";

/**
 * Simple YAML frontmatter parser for command files
 */
function parseSimpleFrontmatter(frontmatter: string): CustomCommandMetadata {
  const metadata: CustomCommandMetadata = {};
  const lines = frontmatter.split("\n");
  
  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    
    if (key === "description") {
      // Remove quotes if present
      metadata.description = value.replace(/^["']|["']$/g, "");
    } else if (key === "aliases") {
      // Parse array format: [alias1, alias2] or ["alias1", "alias2"]
      const arrayMatch = value.match(/^\[(.*)\]$/);
      if (arrayMatch && arrayMatch[1]) {
        metadata.aliases = arrayMatch[1]
          .split(",")
          .map(s => s.trim().replace(/^["']|["']$/g, ""))
          .filter(s => s.length > 0);
      }
    } else if (key === "parameters") {
      // Parse array format: [param1, param2] or ["param1", "param2"]
      const arrayMatch = value.match(/^\[(.*)\]$/);
      if (arrayMatch && arrayMatch[1]) {
        metadata.parameters = arrayMatch[1]
          .split(",")
          .map(s => s.trim().replace(/^["']|["']$/g, ""))
          .filter(s => s.length > 0);
      }
    }
  }
  
  return metadata;
}

/**
 * Parse a markdown file with optional YAML frontmatter
 */
export function parseCommandFile(filePath: string): ParsedCommand {
  const fileContent = readFileSync(filePath, "utf-8");
  
  // Check for frontmatter
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = fileContent.match(frontmatterRegex);
  
  if (match && match[1] && match[2]) {
    // Parse YAML frontmatter
    const frontmatter = match[1];
    const content = match[2];
    let metadata: CustomCommandMetadata = {};
    
    try {
      metadata = parseSimpleFrontmatter(frontmatter);
    } catch (error) {
      // If parsing fails, treat entire file as content
      console.warn(`Failed to parse frontmatter in ${filePath}:`, error);
      return {
        metadata: {},
        content: fileContent,
      };
    }
    
    return {
      metadata,
      content: content.trim(),
    };
  }
  
  // No frontmatter, entire file is content
  return {
    metadata: {},
    content: fileContent.trim(),
  };
}

/**
 * Replace template variables in command content
 */
export function substituteTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  
  // Replace {{variable}} patterns
  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(pattern, value);
  }
  
  return result;
}