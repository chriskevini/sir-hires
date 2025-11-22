/**
 * Text manipulation utilities
 */

/**
 * Counts words in a text string
 * @param text - The text to count words in
 * @returns The number of words
 */
export const countWords = (text: string): number => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

/**
 * Gets complete lines from partial text (useful for streaming)
 * Removes the last incomplete line if present
 * @param content - The content to process
 * @returns Complete lines with trailing newline
 */
export const getCompleteLines = (content: string): string => {
  if (!content) return '';
  const lines = content.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] !== '') {
    lines.pop();
  }
  return lines.join('\n') + (lines.length > 0 ? '\n' : '');
};
