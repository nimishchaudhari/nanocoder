import { primaryColor, whiteColor } from "./colors.js";

// Function to wrap text to fit within content width
function wrapText(text: string, width: number): string[] {
  const lines: string[] = [];
  const originalLines = text.split("\n");

  for (const originalLine of originalLines) {
    if (originalLine.length === 0) {
      lines.push("");
      continue;
    }

    // Strip ANSI codes for length calculation but preserve them in output
    const cleanLine = originalLine.replace(/\u001b\[[0-9;]*m/g, "");

    if (cleanLine.length <= width) {
      lines.push(originalLine);
    } else {
      // Simple word wrapping - split at spaces when possible
      let currentLine = "";
      let currentCleanLine = "";
      const words = originalLine.split(" ");

      for (const word of words) {
        if (!word) continue;
        const cleanWord = word.replace(/\u001b\[[0-9;]*m/g, "");
        const testCleanLine =
          currentCleanLine + (currentCleanLine ? " " : "") + cleanWord;

        if (testCleanLine.length <= width) {
          currentLine += (currentLine ? " " : "") + word;
          currentCleanLine = testCleanLine;
        } else {
          if (currentLine) {
            lines.push(currentLine);
            currentLine = word;
            currentCleanLine = cleanWord;
          } else {
            // Single word is too long, force break
            lines.push(word);
          }
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }
  }

  return lines;
}

export function borderedContent(
  title: string,
  content: string,
  width: number = 78
): void {
  const contentWidth = width - 4; // Account for "│ " and " │"
  const contentLines = wrapText(content, contentWidth);

  console.log();
  // Top border with rounded corners
  console.log(primaryColor("╭" + "─".repeat(width - 2) + "╮"));

  // Title header
  const headerText = ` ${title} `;
  const headerPadding = " ".repeat(width - headerText.length - 2);
  console.log(
    primaryColor("│") +
      whiteColor(headerText) +
      headerPadding +
      primaryColor("│")
  );

  // Separator line
  console.log(primaryColor("├" + "─".repeat(width - 2) + "┤"));

  // Content lines
  contentLines.forEach((line) => {
    const cleanLength = line.replace(/\u001b\[[0-9;]*m/g, "").length;
    const padding = " ".repeat(Math.max(0, contentWidth - cleanLength));
    console.log(primaryColor("│ ") + line + padding + primaryColor(" │"));
  });

  // Bottom border with rounded corners
  console.log(primaryColor("╰" + "─".repeat(width - 2) + "╯"));
}
