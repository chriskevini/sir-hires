/**
 * Markdown utility functions for sir-hires Chrome extension
 */

import { escapeHtml } from './shared-utils';

/**
 * Convert markdown text to HTML (basic implementation for printing)
 * Handles paragraphs and line breaks
 * @param text - The markdown text to convert
 * @returns HTML string
 */
export function markdownToHtml(text: string): string {
  if (!text) return '';
  let html = escapeHtml(text);
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  if (html.trim()) {
    html = `<p>${html}</p>`;
  }
  return html;
}
