/**
 * Job template strings and configuration
 * SINGLE SOURCE OF TRUTH for MarkdownDB job schema
 */

/**
 * Standard job template showing all available fields with examples
 */
export const JOB_TEMPLATE = `<JOB>
TITLE: Senior Cloud Infrastructure Engineer // required
COMPANY: Stellar Innovations Inc. // required
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID // [ONSITE|REMOTE|HYBRID]
SALARY_RANGE_MIN: 100,000
SALARY_RANGE_MAX: 150,000
PAY_PERIOD: ANNUAL // [HOURLY|ANNUAL|MONTHLY|WEEKLY|BIWEEKLY|SEMIMONTHLY]
EMPLOYMENT_TYPE: FULL-TIME // [FULL-TIME|PART-TIME|CONTRACT|INTERNSHIP]
EXPERIENCE_LEVEL: SENIOR // [ENTRY|MID|SENIOR|LEAD]
POSTED_DATE: 2025-11-15
CLOSING_DATE: 2025-12-31

# DESCRIPTION:
- Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.
- Develop and manage CI/CD pipelines using GitLab or Jenkins.
- Provide subject matter expertise on security, reliability, and cost optimization.

# REQUIRED_SKILLS: // required
- 7+ years of experience in DevOps or SRE roles.
- Expert-level proficiency with Terraform and Kubernetes.
- Strong knowledge of Python or Go for scripting.

# PREFERRED_SKILLS:
- Experience with FinOps principles and tooling.
- AWS Certified DevOps Engineer - Professional.
- Background in the FinTech industry.

# ABOUT_COMPANY:
- Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.
- **Culture:** We emphasize radical ownership, transparency, and continuous learning.
- **Team Structure:** Teams are cross-functional, highly autonomous, and empowered to make core product decisions.
- **Benefits:** We offer unlimited PTO, 1000% 401(k) matching and excellent health coverage.
- **Values:** We are committed to fostering diversity, equity, and inclusion in the workplace.`;

/**
 * Few-shot examples for LLM job extraction
 * Used to teach the LLM how to convert unstructured text to MarkdownDB format
 */
export interface JobExtractionExample {
  input: string;
  output: string;
}

export const JOB_EXTRACTION_EXAMPLES: JobExtractionExample[] = [
  {
    input:
      'Hiring a Junior Web Dev at TechStart! $60k-$80k. You must know React and HTML. Work from home available. Apply by Dec 1st.',
    output: `<JOB>
TITLE: Junior Web Developer
COMPANY: TechStart
ADDRESS: N/A
REMOTE_TYPE: REMOTE
SALARY_RANGE_MIN: 60,000
SALARY_RANGE_MAX: 80,000
PAY_PERIOD: ANNUAL
EMPLOYMENT_TYPE: FULL-TIME
EXPERIENCE_LEVEL: ENTRY
POSTED_DATE: N/A
CLOSING_DATE: 2025-12-01

# DESCRIPTION:
- Develop web applications using React and HTML.

# REQUIRED_SKILLS:
- React
- HTML

# PREFERRED_SKILLS:

# ABOUT_COMPANY:
`,
  },
  {
    input:
      'Principal Architect needed. 10+ years exp required. Contract role for 6 months. New York City. Pay is 150/hr.',
    output: `<JOB>
TITLE: Principal Architect
COMPANY: UNKNOWN
ADDRESS: New York City, NY
REMOTE_TYPE: ONSITE
SALARY_RANGE_MIN: N/A
SALARY_RANGE_MAX: N/A
EMPLOYMENT_TYPE: CONTRACT
EXPERIENCE_LEVEL: LEAD
POSTED_DATE: N/A
CLOSING_DATE: N/A

# DESCRIPTION:
- Lead architectural design for complex systems.

# REQUIRED_SKILLS:
- 10+ years experience
- System Architecture

# PREFERRED_SKILLS:

# ABOUT_COMPANY:
`,
  },
  {
    input:
      'Acme Corp is looking for a Marketing Manager. Hybrid (2 days in SF office). Salary: 120,000. Great benefits.',
    output: `<JOB>
TITLE: Marketing Manager
COMPANY: Acme Corp
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID
SALARY_RANGE_MIN: 120,000
SALARY_RANGE_MAX: 120,000
PAY_PERIOD: ANNUAL
EMPLOYMENT_TYPE: FULL-TIME
EXPERIENCE_LEVEL: MID
POSTED_DATE: N/A
CLOSING_DATE: N/A

# DESCRIPTION:
- Manage marketing campaigns and strategy.

# REQUIRED_SKILLS:
- Marketing Strategy

# PREFERRED_SKILLS:

# ABOUT_COMPANY:
- Offers great benefits.
`,
  },
];

/**
 * Helper function to format examples for LLM prompts
 * Converts structured examples into prompt text
 */
export function formatExamplesForPrompt(
  examples: JobExtractionExample[] = JOB_EXTRACTION_EXAMPLES
): string {
  return examples
    .map(
      (example) => `**Input:**
"${example.input}"

**Output:**
${example.output}`
    )
    .join('\n');
}

/**
 * Centralized LLM extraction prompt
 * SINGLE SOURCE OF TRUTH for job extraction rules
 * Used by both background script and job-details entrypoint
 */
export const JOB_EXTRACTION_PROMPT = `
### ROLE
You are an expert Data Extraction Engine. Your sole purpose is to parse unstructured job descriptions into a human-readable, structured data block.

### OBJECTIVE
Extract relevant data from the text and map it to the schema below. Output ONLY the data block. Do not include conversational text.

### DATA RULES
1.  **Missing Data (Fields):**
    * For key-value fields (Top section), if data is missing, output "UNKNOWN".
2.  **Missing Data (Lists):**
    * If a list section (e.g., Preferred Skills, About Company) has no data, **omit the entire section**. Do not output the Header or "UNKNOWN".
3.  **Dates:** Convert all dates to YYYY-MM-DD. If year is implied, use 2025.
4.  **Salary Handling:**
    * Extract raw numbers only (no currency symbols).
    * If the salary is Hourly, set PAY_PERIOD to "HOURLY".
    * If the salary is Annual, set PAY_PERIOD to "ANNUAL".
5.  **Location:** Expand city abbreviations to full names (e.g., "NYC" -> "New York, NY").
6.  **Lists:** Format descriptions and skills as bullet points.

### ENUMERATION MAPPING (STRICT)
Map values to these exact categories:
* **REMOTE_TYPE:** [ONSITE | REMOTE | HYBRID]. Default: ONSITE.
* **EMPLOYMENT_TYPE:** [FULL-TIME | PART-TIME | CONTRACT | INTERNSHIP].
    * Default: FULL-TIME.
    * "Intern", "Summer Analyst", "Co-op", "Cooperative Education", "Student Position" -> INTERNSHIP
    * "Freelance", "C2C" -> CONTRACT
* **EXPERIENCE_LEVEL:** [ENTRY | MID | SENIOR | LEAD].
    * 0-2 years -> ENTRY
    * 3-5 years -> MID
    * 5-8 years -> SENIOR
    * 8+ years -> LEAD

### FEW-SHOT EXAMPLES

${formatExamplesForPrompt()}

### CURRENT TASK
Analyze the job listing provided below and output the <JOB> data sheet:

`;
