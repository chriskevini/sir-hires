/**
 * Profile template strings and configuration
 * SINGLE SOURCE OF TRUTH for MarkdownDB profile schema
 */

/**
 * Standard profile template showing all available fields with examples
 * This template is already used in the Profile page UI
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

/**
 * Few-shot examples for LLM profile extraction
 * Used to teach the LLM how to convert unstructured text to MarkdownDB format
 */
export interface ProfileExtractionExample {
  input: string;
  output: string;
}

export const PROFILE_EXTRACTION_EXAMPLES: ProfileExtractionExample[] = [
  {
    input: `John Smith
Senior Software Engineer at Google
john.smith@gmail.com | San Francisco, CA | github.com/jsmith

Experience:
- Senior Engineer at Google (2020-Present): Led team of 5 engineers building cloud infrastructure
- Software Engineer at Facebook (2017-2020): Built React components for News Feed
- Intern at Microsoft (Summer 2016): Worked on Azure deployment tools

Education:
- BS Computer Science, Stanford University, 2017
- MS Computer Science, MIT, 2019

Skills: Python, Go, Kubernetes, React
Interests: Rock climbing, photography`,
    output: `<PROFILE>
NAME: John Smith
ADDRESS: San Francisco, CA
EMAIL: john.smith@gmail.com
GITHUB: github.com/jsmith

# EDUCATION
## EDU_1
DEGREE: Bachelor of Science in Computer Science
SCHOOL: Stanford University
LOCATION: N/A
START: N/A
END: 2017

## EDU_2
DEGREE: Master of Science in Computer Science
SCHOOL: MIT
LOCATION: N/A
START: N/A
END: 2019

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL
TITLE: Senior Software Engineer
AT: Google
START: 2020
END: ONGOING
BULLETS:
- Led team of 5 engineers building cloud infrastructure

## EXP_2
TYPE: PROFESSIONAL
TITLE: Software Engineer
AT: Facebook
START: 2017
END: 2020
BULLETS:
- Built React components for News Feed

## EXP_3
TYPE: PROFESSIONAL
TITLE: Intern
AT: Microsoft
START: Summer 2016
END: Summer 2016
BULLETS:
- Worked on Azure deployment tools

# INTERESTS:
- Rock climbing
- Photography`,
  },
  {
    input: `Jane Doe | jane@example.com

Education
• PhD in Machine Learning, UC Berkeley (2018-2022)
• BA Mathematics, Harvard (2014-2018)

Work
1. Research Scientist @ OpenAI (2022-Present)
   - Developed GPT-4 training pipeline
2. ML Engineer @ Tesla (2020-2022)
   - Autopilot neural network optimization

Personal Projects
- Built open-source ML framework (github.com/jdoe/mlkit)
- Contributed to TensorFlow core

Hobbies: Tennis, cooking`,
    output: `<PROFILE>
NAME: Jane Doe
EMAIL: jane@example.com

# EDUCATION
## EDU_1
DEGREE: Bachelor of Arts in Mathematics
SCHOOL: Harvard
LOCATION: N/A
START: 2014
END: 2018

## EDU_2
DEGREE: PhD in Machine Learning
SCHOOL: UC Berkeley
LOCATION: N/A
START: 2018
END: 2022

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL
TITLE: Research Scientist
AT: OpenAI
START: 2022
END: ONGOING
BULLETS:
- Developed GPT-4 training pipeline

## EXP_2
TYPE: PROFESSIONAL
TITLE: ML Engineer
AT: Tesla
START: 2020
END: 2022
BULLETS:
- Autopilot neural network optimization

## EXP_3
TYPE: PROJECT
TITLE: Open-source ML framework
BULLETS:
- Built open-source ML framework (github.com/jdoe/mlkit)

## EXP_4
TYPE: PROJECT
TITLE: TensorFlow Contributor
BULLETS:
- Contributed to TensorFlow core

# INTERESTS:
- Tennis
- Cooking`,
  },
  {
    input: `Alex Chen
alex.chen@email.com | New York, NY
LinkedIn: linkedin.com/in/alexchen

PROFESSIONAL EXPERIENCE
Tech Lead - Amazon Web Services (2019-Present)
• Architected serverless solutions for enterprise clients
• Managed team of 8 engineers

Software Developer - IBM (2015-2019)
• Backend API development using Java

EDUCATION
MIT - Bachelor's in Computer Engineering (2011-2015)

VOLUNTEER
Coding instructor at local non-profit (2020-Present)
• Teach Python to underserved youth`,
    output: `<PROFILE>
NAME: Alex Chen
ADDRESS: New York, NY
EMAIL: alex.chen@email.com

# EDUCATION
## EDU_1
DEGREE: Bachelor's in Computer Engineering
SCHOOL: MIT
LOCATION: N/A
START: 2011
END: 2015

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL
TITLE: Tech Lead
AT: Amazon Web Services
START: 2019
END: ONGOING
BULLETS:
- Architected serverless solutions for enterprise clients
- Managed team of 8 engineers

## EXP_2
TYPE: PROFESSIONAL
TITLE: Software Developer
AT: IBM
START: 2015
END: 2019
BULLETS:
- Backend API development using Java

## EXP_3
TYPE: VOLUNTEER
TITLE: Coding Instructor
AT: Local non-profit
START: 2020
END: ONGOING
BULLETS:
- Teach Python to underserved youth`,
  },
];

/**
 * Helper function to format profile examples for LLM prompts
 * Converts structured examples into prompt text
 */
export function formatProfileExamplesForPrompt(
  examples: ProfileExtractionExample[] = PROFILE_EXTRACTION_EXAMPLES
): string {
  return examples
    .map(
      (example) => `**Input:**
"${example.input}"

**Output:**
${example.output}`
    )
    .join('\n\n---\n\n');
}

/**
 * Centralized LLM extraction prompt
 * SINGLE SOURCE OF TRUTH for profile extraction rules
 * Used by background script for streaming profile extraction
 */
export const PROFILE_EXTRACTION_PROMPT = `
### ROLE
You are an expert Resume/Profile Parser. Your sole purpose is to extract structured profile data from unstructured resume/profile text.

### OBJECTIVE
Extract relevant data from the text and map it to the <PROFILE> schema below. Output ONLY the data block. Do not include conversational text.

### DATA RULES
1.  **Missing Data (Fields):**
    * For key-value fields (Top section), if data is missing, output "N/A".
2.  **Missing Data (Sections):**
    * If a section (e.g., EDUCATION, EXPERIENCE) is completely missing, omit the entire section.
    * If a section exists but has no entries, omit the section.
3.  **Dates:** 
    * Convert dates to readable format (e.g., "September 2020", "2020", "Summer 2016").
    * For ongoing positions, use "ONGOING".
4.  **Entry IDs:**
    * Use sequential IDs: EDU_1, EDU_2, etc. for education entries.
    * Use sequential IDs: EXP_1, EXP_2, etc. for experience entries.
    * **CRITICAL**: IDs MUST match pattern EDU_\\d+ or EXP_\\d+ (e.g., EDU_1, EXP_10).
5.  **Experience Types:**
    * Map to exactly one: [PROFESSIONAL | PROJECT | VOLUNTEER]
    * Full-time jobs, internships, contract work → PROFESSIONAL
    * Personal projects, open-source contributions → PROJECT
    * Non-profit, community service → VOLUNTEER
6.  **Bullet Points:**
    * Extract key accomplishments and responsibilities.
    * Keep bullets concise (1-2 lines max).
    * Use action verbs (Built, Led, Developed, Architected, etc.).
7.  **Contact Info:**
    * Extract NAME (required), EMAIL, ADDRESS, PHONE, WEBSITE, GITHUB, LINKEDIN if available.
    * For ADDRESS, extract city and state/country only (e.g., "San Francisco, CA").

### SCHEMA REFERENCE
\`\`\`
<PROFILE>
NAME: [Required]
ADDRESS: [City, State/Country]
EMAIL: [Email address]
PHONE: [Phone number]
WEBSITE: [Personal website]
GITHUB: [GitHub URL]

# EDUCATION
## EDU_1
DEGREE: [Degree name] // required
SCHOOL: [School name] // required
LOCATION: [City, State/Country]
START: [Start date]
END: [End date or ONGOING]
GPA: [GPA if available]

# EXPERIENCE
## EXP_1
TYPE: [PROFESSIONAL|PROJECT|VOLUNTEER] // required
TITLE: [Job title or project name] // required
AT: [Company/organization name]
START: [Start date]
END: [End date or ONGOING]
BULLETS:
- [Accomplishment or responsibility]
- [Accomplishment or responsibility]

# INTERESTS:
- [Interest or hobby]
- [Interest or hobby]

# CERTIFICATIONS:
- [Certification name]
\`\`\`

### FEW-SHOT EXAMPLES

${formatProfileExamplesForPrompt()}

### CURRENT TASK
Analyze the profile/resume text provided below and output the <PROFILE> data sheet. Follow the schema exactly, including section markers (##) and entry IDs (EDU_1, EXP_1, etc.):

`;
