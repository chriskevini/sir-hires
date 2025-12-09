/**
 * Markdown utility functions for sir-hires Chrome extension
 */

import { marked } from 'marked';

/**
 * Convert markdown text to HTML using the marked library
 * Supports full markdown spec including headers, lists, links, code blocks, tables, etc.
 * Preserves consecutive newlines for page break control
 * @param text - The markdown text to convert
 * @returns HTML string
 */
export function markdownToHtml(text: string): string {
  if (!text) return '';

  // Preserve consecutive newlines by replacing them with placeholders
  // This allows users to add extra spacing or push content to next page
  const textWithPlaceholders = text.replace(/\n\n\n+/g, (match) => {
    const numNewlines = match.length - 1; // Number of newlines (minus 1 for paragraph break)
    const numExtraBreaks = Math.floor(numNewlines / 2); // Each pair becomes extra spacing
    return '\n\n' + '<!-- EXTRA_BREAK -->'.repeat(numExtraBreaks);
  });

  // Configure marked for better HTML output
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  // Parse markdown
  let html = marked.parse(textWithPlaceholders) as string;

  // Replace placeholders with actual line breaks
  html = html.replace(/<!-- EXTRA_BREAK -->/g, '<br><br>');

  return html;
}
