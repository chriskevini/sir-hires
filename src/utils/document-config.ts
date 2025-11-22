/**
 * Default document configuration for DraftingView
 * Defines document types, labels, ordering, and placeholders
 */

export interface DefaultDocConfig {
  label: string;
  order: number;
  defaultTitle: (jobTitle?: string, company?: string) => string;
  placeholder: string;
}

/**
 * Default document configurations
 * Can be used to generate initial documents or display metadata
 */
export const defaultDocuments: Record<string, DefaultDocConfig> = {
  tailoredResume: {
    label: 'Resume/CV',
    order: 0,
    defaultTitle: (jobTitle = 'Resume', company = 'Company') =>
      `${jobTitle} - ${company}`,
    placeholder:
      'Write your tailored resume here using Markdown formatting...\n\nExample:\n# Your Name\nemail@example.com | linkedin.com/in/yourprofile\n\n## Summary\nExperienced software engineer...',
  },
  coverLetter: {
    label: 'Cover Letter',
    order: 1,
    defaultTitle: (jobTitle = 'Position', company = 'Company') =>
      `Cover Letter - ${jobTitle} at ${company}`,
    placeholder:
      'Write your cover letter here using Markdown formatting...\n\nExample:\nDear Hiring Manager,\n\nI am writing to express my interest...',
  },
};

/**
 * Counts words in a text string
 * @param text - The text to count words in
 * @returns Number of words
 */
export const countWords = (text: string): number => {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};
