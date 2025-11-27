/**
 * Document templates and configuration for DraftingView
 * Defines document types, labels, ordering, placeholders, and initial content templates
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
