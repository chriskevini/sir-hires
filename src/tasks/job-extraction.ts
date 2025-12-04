/**
 * Job Extraction Task
 * SINGLE SOURCE OF TRUTH for job extraction LLM configuration
 */

import type { TaskConfig } from './types';

export const jobExtraction = {
  systemPrompt: `Parse RAWTEXT into a <JOB> block.

### GUIDELINES
1. Format dates as YYYY-MM-DD.
2. Omit fields and sections with missing data.

### ENUMERATIONS
* REMOTE TYPE: [On-site|Remote|Hybrid]
* PAY PERIOD: [Annual|Hourly]
* EMPLOYMENT TYPE: [Full-time|Part-time|Contract|Internship]
  - Intern, Co-op, Student Position -> Internship
  - Freelance, C2C -> Contract
* EXPERIENCE LEVEL: [Entry|Mid|Senior|Lead].
  - 0-2 years -> Entry, 3-5 -> Mid, 5-8 -> Senior, 8+ -> Lead

### DEFAULTS
On-site, Annual, Full-time

### EXAMPLES
**Input:** "Hiring a Junior Web Dev at TechStart! $60k-$80k. You must know React and HTML. Work from home available. Apply by Dec 1st."

**Output:**
<JOB>
TITLE: Junior Web Developer
COMPANY: TechStart
REMOTE TYPE: Remote
SALARY MIN: 60,000
SALARY MAX: 80,000
PAY PERIOD: Annual
EMPLOYMENT TYPE: Full-time
EXPERIENCE LEVEL: Entry
CLOSING DATE: 2025-12-01

# DESCRIPTION
- Develop web applications using React and HTML.

# REQUIRED SKILLS
- React
- HTML
</JOB>

**Input:** "Principal Architect needed. 10+ years exp required. Contract role for 6 months. New York City. Pay is 150/hr."

**Output:**
<JOB>
TITLE: Principal Architect
ADDRESS: New York City, NY
REMOTE TYPE: On-site
SALARY MIN: 150
SALARY MAX: 150
PAY PERIOD: Hourly
EMPLOYMENT TYPE: Contract
EXPERIENCE LEVEL: Lead

# DESCRIPTION
- Lead architectural design for complex systems.

# REQUIRED SKILLS
- 10+ years experience
- System Architecture

**Input:** "Acme Corp is looking for a Marketing Manager. Hybrid (2 days in SF office). Salary: 120,000. Great benefits."

**Output:**
<JOB>
TITLE: Marketing Manager
COMPANY: Acme Corp
ADDRESS: San Francisco, CA
REMOTE TYPE: Hybrid
SALARY MIN: 120,000
SALARY MAX: 120,000
PAY PERIOD: Annual
EMPLOYMENT TYPE: Full-time
EXPERIENCE LEVEL: Mid

# DESCRIPTION
- Manage marketing campaigns and strategy.

# REQUIRED SKILLS
- Marketing Strategy

# ABOUT COMPANY
- Offers great benefits.
</JOB>`,

  context: ['rawText'] as const,
  temperature: 0.3,
  maxTokens: 2000,

  template: `<JOB>
TITLE: Senior Cloud Infrastructure Engineer // required
COMPANY: Stellar Innovations Inc. // required
ADDRESS: San Francisco, CA
REMOTE TYPE: HYBRID // [ONSITE|REMOTE|HYBRID]
SALARY RANGE MIN: 100,000
SALARY RANGE MAX: 150,000
PAY PERIOD: ANNUAL // [HOURLY|ANNUAL|MONTHLY|WEEKLY|BIWEEKLY|SEMIMONTHLY]
EMPLOYMENT TYPE: FULL-TIME // [FULL-TIME|PART-TIME|CONTRACT|INTERNSHIP]
EXPERIENCE LEVEL: SENIOR // [ENTRY|MID|SENIOR|LEAD]
POSTED DATE: 2025-11-15
CLOSING DATE: 2025-12-31

# DESCRIPTION
- Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.
- Develop and manage CI/CD pipelines using GitLab or Jenkins.
- Provide subject matter expertise on security, reliability, and cost optimization.

# REQUIRED SKILLS // required
- 7+ years of experience in DevOps or SRE roles.
- Expert-level proficiency with Terraform and Kubernetes.
- Strong knowledge of Python or Go for scripting.

# PREFERRED SKILLS
- Experience with FinOps principles and tooling.
- AWS Certified DevOps Engineer - Professional.
- Background in the FinTech industry.

# ABOUT COMPANY
- Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.
- **Culture:** We emphasize radical ownership, transparency, and continuous learning.
- **Team Structure:** Teams are cross-functional, highly autonomous, and empowered to make core product decisions.
- **Benefits:** We offer unlimited PTO, 1000% 401(k) matching and excellent health coverage.
- **Values:** We are committed to fostering diversity, equity, and inclusion in the workplace.`,
} satisfies TaskConfig & { template: string };
