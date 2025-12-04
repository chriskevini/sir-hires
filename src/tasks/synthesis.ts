/**
 * Synthesis Task
 * SINGLE SOURCE OF TRUTH for document synthesis LLM configuration
 */

import type { TaskConfig } from './types';
import { CAREER_STRATEGIST_SYSTEM_PROMPT } from './shared';

/**
 * Configuration for a default document type
 */
export interface DefaultDocConfig {
  label: string;
  order: number;
  defaultTitle: (jobTitle?: string, company?: string) => string;
  placeholder: string;
}

export const synthesis = {
  systemPrompt: CAREER_STRATEGIST_SYSTEM_PROMPT,

  context: ['job', 'profile', 'template', 'tone', 'task'] as const,
  temperature: 0.7,
  maxTokens: 2000,

  defaultTask:
    'Follow the TEMPLATE and TONE and output only the final document.',
  defaultTone: 'professional',

  documents: {
    blank: {
      label: 'Blank',
      order: 99,
      defaultTitle: () => 'Blank - Untitled',
      placeholder: 'Start writing...',
    },
    tailoredResume: {
      label: 'Resume/CV',
      order: 0,
      defaultTitle: (jobTitle = 'Untitled', company = 'Unknown') =>
        `Resume - ${jobTitle} - ${company}`,
      placeholder:
        'Paste an old resume that you would like the LLM to try to match or start with a template.',
    },
    coverLetter: {
      label: 'Cover Letter',
      order: 1,
      defaultTitle: (jobTitle = 'Untitled', company = 'Unknown') =>
        `Cover Letter - ${jobTitle} - ${company}`,
      placeholder:
        'Paste an old cover letter that you would like the LLM to try to match or start with a template.',
    },
  } satisfies Record<string, DefaultDocConfig>,

  templates: {
    blank: '',
    tailoredResume: `# **[Name]**
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

    coverLetter: `# **[Name]**
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
  },
} satisfies TaskConfig & {
  defaultTask: string;
  defaultTone: string;
  documents: Record<string, DefaultDocConfig>;
  templates: Record<string, string>;
};
