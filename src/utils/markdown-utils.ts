/**
 * Markdown utility functions for sir-hires Chrome extension
 */

import { marked } from 'marked';

/**
 * Convert markdown text to HTML using the marked library
 * Supports full markdown spec including headers, lists, links, code blocks, tables, etc.
 * Horizontal rules (---) can be used as page break hints in PDF output
 * @param text - The markdown text to convert
 * @returns HTML string
 */
export function markdownToHtml(text: string): string {
  if (!text) return '';

  // Configure marked for better HTML output
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  });

  // Parse markdown
  const html = marked.parse(text) as string;

  return html;
}
