/**
 * Profile Extraction Task
 * SINGLE SOURCE OF TRUTH for profile extraction LLM configuration
 */

import type { TaskConfig } from './types';

export const profileExtraction = {
  systemPrompt: `
You are an expert Resume Parser. Transform resumes into the MarkdownDB format shown in TEMPLATE.

### RULES
1. **Dates:** "Month Year" format. Use "ONGOING" for current positions.
2. **Sections:** Use "# SECTION NAME" for sections (EDUCATION, PROFESSIONAL EXPERIENCE, etc.)
3. **Items:** Use "## Item Title" for each entry within a section.
4. **Lists:** Use "- bullet" directly under items. For simple lists (INTERESTS, SKILLS), bullets go directly under section.
5. **Missing Data:** Omit fields with unknown values entirely.

### SECTION TYPES
* EDUCATION: Degrees, courses
* PROFESSIONAL EXPERIENCE: Jobs, employment, paid work
* TECHNICAL PROJECT EXPERIENCE: Side projects, hackathons, academic projects
* VOLUNTEER: Unpaid work, non-profit, community service
* INTERESTS: Hobbies, interests (simple list)
* SKILLS: Technical skills (simple list)
* CERTIFICATIONS: Professional certifications (simple list)

### EXAMPLE
Input: Jordan Lee | SF, CA | jordan@example.com
Engineer @ TechFlow (Jan 2020 - Present) - Led migration. Managed 5 devs.
Project: CryptoTracker - Python script.
B.S. CS, UC Berkeley (2012 - 2016)
Skills: Python, React

Output:
<PROFILE>
NAME: Jordan Lee
ADDRESS: SF, CA
EMAIL: jordan@example.com

# EDUCATION

## B.S. Computer Science
SCHOOL: UC Berkeley
START: 2012
END: 2016

# PROFESSIONAL EXPERIENCE

## Engineer
AT: TechFlow
START: January 2020
END: ONGOING
- Led migration.
- Managed 5 devs.

# TECHNICAL PROJECT EXPERIENCE

## CryptoTracker
- Python script.

# SKILLS
- Python
- React

Output ONLY the <PROFILE> data block. No conversational text.`,

  context: ['rawText'] as const,
  temperature: 0.3,
  maxTokens: 4000,

  template: `<PROFILE>
NAME: Place Holder // required
ADDRESS: 123 Main Street, Anytown, CA 45678
EMAIL: name@email.com
// PHONE, WEBSITE, GITHUB

# EDUCATION

## Master of Science in Computer Science
SCHOOL: University of Helsinki
LOCATION: Helsinki, Finland
START: September 1988
END: March 1997
// GPA

# PROFESSIONAL EXPERIENCE

## Senior Developer
AT: Tech Solutions Inc.
START: October 2020
END: ONGOING
- Built API...
- Led team...

# TECHNICAL PROJECT EXPERIENCE

## Linux Kernel
- Architected kernel...
- Integrated Rust...

# VOLUNTEER

## Community Volunteer
AT: Local Non-Profit
- Supported educational...
- Helped organize...

# INTERESTS
- Scuba diving
- Reading
// # CERTIFICATIONS
`,
} satisfies TaskConfig & { template: string };
