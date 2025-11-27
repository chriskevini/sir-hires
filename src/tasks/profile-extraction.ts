/**
 * Profile Extraction Task
 * SINGLE SOURCE OF TRUTH for profile extraction LLM configuration
 *
 * Contains:
 * - Task configuration (temperature, tokens, context)
 * - LLM extraction prompt
 * - MarkdownDB profile template schema
 *
 * NOTE: Parser functions remain in src/utils/profile-parser.ts
 * (used by non-LLM components)
 */

import type { TaskConfig } from './types';

// =============================================================================
// MARKDOWNDB TEMPLATE
// =============================================================================

/**
 * Standard profile template showing all available fields with examples
 * SINGLE SOURCE OF TRUTH for MarkdownDB profile schema
 */
export const PROFILE_TEMPLATE = `<PROFILE>
NAME: Place Holder // required
ADDRESS: 123 Main Street, Anytown, CA 45678
EMAIL: name@email.com
// ex: PHONE, WEBSITE, GITHUB

# EDUCATION
## EDU_1
DEGREE: Master of Science in Computer Science // required
SCHOOL: University of Helsinki // required
LOCATION: Helsinki, Finland
START: September 1988
END: March 1997
// ex: GPA

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Senior Developer // required
AT: Tech Solutions Inc.
START: October 2020
END: ONGOING
BULLETS:
- Built API...
- Led team...

## EXP_2
TYPE: PROJECT // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Linux Kernel // required
BULLETS:
- Architected kernel...
- Integrated Rust...

## EXP_3
TYPE: VOLUNTEER // required [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: Community Volunteer // required
AT: Local Non-Profit
BULLETS:
- Supported educational...
- Helped organize...

# INTERESTS:
- Scuba diving
- Reading
// ex: # CERTIFICATIONS:`;

// =============================================================================
// LLM PROMPT
// =============================================================================

/**
 * Centralized LLM extraction prompt (system prompt)
 * SINGLE SOURCE OF TRUTH for profile extraction rules
 *
 * The prompt includes the template schema and few-shot examples inline.
 * Only rawText (resume/CV content) is passed as context.
 */
export const PROFILE_EXTRACTION_PROMPT = `You are an expert Resume Parser. Transform resumes into the MarkdownDB format shown in TEMPLATE.

### RULES
1. **Dates:** "Month Year" format. Use "ONGOING" for current positions.
2. **Headers:** Number sections as EDU_1, EXP_1, etc.
3. **Lists:** Create simple lists for SKILLS, CERTIFICATIONS, INTERESTS if present.
4. **Experience:** ALL work, projects, and volunteering go under # EXPERIENCE with TYPE field.
5. **Missing Data:** Omit fields with unknown values entirely.

### EXPERIENCE TYPES (STRICT)
* PROFESSIONAL: Jobs, employment, paid work
* PROJECT: Side projects, hackathons, academic projects, courses
* VOLUNTEER: Unpaid work, non-profit, community service

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
## EDU_1
DEGREE: B.S. CS
SCHOOL: UC Berkeley
START: 2012
END: 2016

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL
TITLE: Engineer
AT: TechFlow
START: January 2020
END: ONGOING
BULLETS:
- Led migration.
- Managed 5 devs.

## EXP_2
TYPE: PROJECT
TITLE: CryptoTracker
BULLETS:
- Python script.

# SKILLS:
- Python
- React

Output ONLY the <PROFILE> data block. No conversational text.`;

// =============================================================================
// TASK CONFIG
// =============================================================================

/**
 * Task configuration for profile extraction
 * Imported by config.ts and used by llm-client
 */
export const profileExtractionConfig: TaskConfig = {
  temperature: 0.3,
  maxTokens: 4000, // Higher default for longer resumes
  prompt: PROFILE_EXTRACTION_PROMPT,
  context: ['rawText'],
};
