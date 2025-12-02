/**
 * Job Extraction Task
 * SINGLE SOURCE OF TRUTH for job extraction LLM configuration
 *
 * Contains:
 * - Task configuration (temperature, tokens, context)
 * - LLM extraction prompt
 * - MarkdownDB job template schema
 *
 * NOTE: Parser functions remain in src/utils/job-parser.ts
 * (used by non-LLM components)
 */

import type { TaskConfig } from './types';

// =============================================================================
// MARKDOWNDB TEMPLATE
// =============================================================================

/**
 * Standard job template showing all available fields with examples
 * SINGLE SOURCE OF TRUTH for MarkdownDB job schema
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

# DESCRIPTION
- Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.
- Develop and manage CI/CD pipelines using GitLab or Jenkins.
- Provide subject matter expertise on security, reliability, and cost optimization.

# REQUIRED_SKILLS // required
- 7+ years of experience in DevOps or SRE roles.
- Expert-level proficiency with Terraform and Kubernetes.
- Strong knowledge of Python or Go for scripting.

# PREFERRED_SKILLS
- Experience with FinOps principles and tooling.
- AWS Certified DevOps Engineer - Professional.
- Background in the FinTech industry.

# ABOUT_COMPANY
- Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.
- **Culture:** We emphasize radical ownership, transparency, and continuous learning.
- **Team Structure:** Teams are cross-functional, highly autonomous, and empowered to make core product decisions.
- **Benefits:** We offer unlimited PTO, 1000% 401(k) matching and excellent health coverage.
- **Values:** We are committed to fostering diversity, equity, and inclusion in the workplace.`;

// =============================================================================
// LLM PROMPT
// =============================================================================

/**
 * Centralized LLM extraction prompt (system prompt)
 * SINGLE SOURCE OF TRUTH for job extraction rules
 *
 * The prompt includes the template schema and few-shot examples inline.
 * Only rawText (job posting content) is passed as context.
 */
export const JOB_EXTRACTION_PROMPT = `
You are an expert Data Extraction Engine. Parse unstructured job descriptions into the MarkdownDB format shown in TEMPLATE.

### RULES
1. **Missing Fields:** Output "UNKNOWN" for missing key-value fields.
2. **Missing Lists:** Omit empty list sections entirely (no header, no "UNKNOWN").
3. **Dates:** YYYY-MM-DD format. Assume 2025 if year not specified.
4. **Salary:** Numbers only (no symbols). Set PAY_PERIOD to HOURLY or ANNUAL.
5. **Location:** Expand abbreviations (e.g., "NYC" -> "New York, NY").
6. **Lists:** Format as bullet points.

### ENUMERATIONS (STRICT)
* REMOTE_TYPE: [ONSITE | REMOTE | HYBRID]. Default: ONSITE.
* EMPLOYMENT_TYPE: [FULL-TIME | PART-TIME | CONTRACT | INTERNSHIP]. Default: FULL-TIME.
  - "Intern", "Co-op", "Student Position" -> INTERNSHIP
  - "Freelance", "C2C" -> CONTRACT
* EXPERIENCE_LEVEL: [ENTRY | MID | SENIOR | LEAD].
  - 0-2 years -> ENTRY, 3-5 -> MID, 5-8 -> SENIOR, 8+ -> LEAD

### EXAMPLES

**Input:** "Hiring a Junior Web Dev at TechStart! $60k-$80k. You must know React and HTML. Work from home available. Apply by Dec 1st."

**Output:**
<JOB>
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

# DESCRIPTION
- Develop web applications using React and HTML.

# REQUIRED_SKILLS
- React
- HTML

**Input:** "Principal Architect needed. 10+ years exp required. Contract role for 6 months. New York City. Pay is 150/hr."

**Output:**
<JOB>
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

# DESCRIPTION
- Lead architectural design for complex systems.

# REQUIRED_SKILLS
- 10+ years experience
- System Architecture

**Input:** "Acme Corp is looking for a Marketing Manager. Hybrid (2 days in SF office). Salary: 120,000. Great benefits."

**Output:**
<JOB>
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

# DESCRIPTION
- Manage marketing campaigns and strategy.

# REQUIRED_SKILLS
- Marketing Strategy

# ABOUT_COMPANY
- Offers great benefits.

Output ONLY the <JOB> data block. No conversational text.
`;

// =============================================================================
// TASK CONFIG
// =============================================================================

/**
 * Task configuration for job extraction
 * Imported by config.ts and used by llm-client
 */
export const jobExtractionConfig: TaskConfig = {
  temperature: 0.3,
  maxTokens: 2000,
  prompt: JOB_EXTRACTION_PROMPT,
  context: ['rawText'],
};
