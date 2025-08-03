import { highlight } from 'cli-highlight';

export function highlightCodeBlocks(content: string): string {
  // Regex to match code blocks with language specifier
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  return content.replace(codeBlockRegex, (match, lang, code) => {
    try {
      const highlighted = highlight(code.trim(), { 
        language: lang || 'javascript',
        theme: 'default' 
      });
      return `\`\`\`${lang || ''}\n${highlighted}\n\`\`\``;
    } catch (error) {
      // If highlighting fails, return original
      return match;
    }
  });
}

export function highlightInlineCode(content: string): string {
  // Match `code` patterns that aren't part of code blocks
  const inlineCodeRegex = /(?<!`)`([^`\n]+)`(?!`)/g;
  
  return content.replace(inlineCodeRegex, (match, code) => {
    try {
      const highlighted = highlight(code, { 
        language: 'javascript',
        theme: 'default' 
      });
      return `\`${highlighted}\``;
    } catch {
      return match;
    }
  });
}

export function highlightContent(content: string): string {
  // First highlight code blocks, then inline code
  let highlighted = highlightCodeBlocks(content);
  highlighted = highlightInlineCode(highlighted);
  return highlighted;
}