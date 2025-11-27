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
 * Initial content templates for new documents
 * These templates include formatting guidelines and placeholder structure
 */
export const documentTemplates = {
  tailoredResume: `
# Tailored Resume
# Do not paraphrase achievements.
# Bullet points MUST be copied from the Master Resume verbatim.
# Only include content relevant to the target job description.
# Limit the final document to a single page.

[YOUR FULL NAME]
[YOUR PHONE NUMBER] | [YOUR EMAIL] | [YOUR LINKEDIN PROFILE URL]

---

## Summary (Optional)
[1-4 sentences summarizing your career and aligning it with the role.]

---

## Experience

### [COMPANY NAME] | [CITY, STATE]
**[Job Title]** | [Month Year] – [Month Year]
* [Master Resume Bullet 1 - Copied Verbatim]
* [Master Resume Bullet 2 - Copied Verbatim]

---

## Skills
[List technical skills, tools, and languages relevant to the job posting.]

---

## Education
**[Degree Name]** | [University Name] | [City, State] | [Month Year]
`,

  coverLetter: `
# Cover Letter
# Paraphrase and synthesize achievements. Maintain a confident tone.
# All hard skills and project details MUST be supported by facts traceable to the Master Resume.
# Address the top job requirements. Soft skills and contextual anecdotes are exempt from factual checks.

[YOUR FULL NAME]
[YOUR STREET ADDRESS] | [YOUR CITY, POSTAL CODE]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS] | [YOUR LINKEDIN PROFILE URL]

[DATE]

[RECIPIENT NAME]
[RECIPIENT TITLE]
[COMPANY NAME]
[COMPANY STREET ADDRESS] | [COMPANY CITY, POSTAL CODE]

Dear [RECIPIENT NAME or RECIPIENT TITLE],

[HOOK: State your most relevant career achievement, a powerful statistic, or a strong declaration of your passion and alignment with the company's mission/role.]

[RELEVANCE: Connect your top 2-3 skills to the job requirements. Use a quantifiable achievement from a previous role.]

[CULTURE/COMPANY FIT: Explain why you are applying to this specific company, citing its mission, values, or recent work.]

[CALL TO ACTION: Reiterate your enthusiasm. Clearly state how to reach you, and guide the recipient to your comprehensive portfolio/work samples, whether they are attached to this email/application or hosted on your website.]

Sincerely,
[YOUR SIGNATURE]
[YOUR FULL NAME]
`,
};
