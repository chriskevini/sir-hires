/**
 * Synthesis Task
 * SINGLE SOURCE OF TRUTH for document synthesis LLM configuration
 *
 * Contains:
 * - Task configuration (temperature, tokens, context)
 * - LLM synthesis prompt
 * - Document templates (resume, cover letter)
 * - Document configuration (labels, ordering, placeholders)
 */

import type { TaskConfig } from './types';

// =============================================================================
// TASK CONFIGURATION
// =============================================================================

/**
 * Default task instruction for synthesis
 * Used as the final context item when invoking the LLM
 */
export const SYNTHESIS_DEFAULT_TASK =
  'Follow the TEMPLATE and TONE and output only the final document.';

// =============================================================================
// LLM PROMPT
// =============================================================================

/**
 * Centralized LLM synthesis prompt (system prompt only)
 * SINGLE SOURCE OF TRUTH for document synthesis rules
 *
 * Context items (passed via user prompt):
 * - profile: User profile content (MarkdownDB format)
 * - job: Job content (MarkdownDB format)
 * - task: Instructions
 * - template: Document template being edited
 * - tone: Tone modifier for synthesis
 */
export const SYNTHESIS_PROMPT =
  'Analyze the given PROFILE and JOB to find the most relevant experiences and skills.';

// =============================================================================
// TASK CONFIG
// =============================================================================

/**
 * Task configuration for document synthesis
 * Imported by config.ts and used by llm-client
 */
export const synthesisConfig: TaskConfig = {
  temperature: 0.7,
  maxTokens: 2000,
  prompt: SYNTHESIS_PROMPT,
  context: ['profile', 'job', 'task', 'template', 'tone'],
};

// =============================================================================
// DOCUMENT TEMPLATES
// =============================================================================

/**
 * Configuration for a default document type
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
  blank: {
    label: 'Blank',
    order: 99, // New docs go at end
    defaultTitle: () => 'Blank - Untitled',
    placeholder: 'Start writing...',
  },
  tailoredResume: {
    label: 'Resume/CV',
    order: 0,
    defaultTitle: (jobTitle = 'Untitled', company = 'Unknown') =>
      `Resume - ${jobTitle} - ${company}`,
    placeholder:
      'Write your tailored resume here using Markdown formatting...\n\nExample:\n# Your Name\nemail@example.com | linkedin.com/in/yourprofile\n\n## Summary\nExperienced software engineer...',
  },
  coverLetter: {
    label: 'Cover Letter',
    order: 1,
    defaultTitle: (jobTitle = 'Untitled', company = 'Unknown') =>
      `Cover Letter - ${jobTitle} - ${company}`,
    placeholder:
      'Write your cover letter here using Markdown formatting...\n\nExample:\nDear Hiring Manager,\n\nI am writing to express my interest...',
  },
};

/**
 * Initial content templates for new documents
 * These templates include formatting guidelines and placeholder structure
 */
export const documentTemplates = {
  blank: '',
  tailoredResume: `
# **[Name]**
[Address]
[Phone] | [Email]

---

### Skills

- [Skill 1]
- [Skill 2]

### Professional Experience

**[Experience Title]** | [At]
*[Month Year] - [Month Year]*

- [Bullet 1]
- [Bullet 2]

### Technical Project Experience (DELETE if irrelevant)

**[Project Title]** 

- [Bullet 1]
- [Bullet 2]

### Education

**[Degree]** | [University]
*[Month Year] - [Month Year]*
`,

  coverLetter: `
# **[Name]**
[Address]
[Phone] | [Email]

---

[Date]

Hiring Manager
[Company Name]
[Company Address]

Re: Application for [Job Title]

Dear Hiring Manager,

[Opening Hook: Enthusiasm & Fit]

[Value Proposition: Evidence & Skills]

[Closing: Call to Action]

Sincerely,

[Name]
`,
};
