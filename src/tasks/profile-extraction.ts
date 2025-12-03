/**
 * Profile Extraction Task
 * SINGLE SOURCE OF TRUTH for profile extraction LLM configuration
 */

import type { TaskConfig } from './types';

export const profileExtraction = {
  systemPrompt: `Parse RAWTEXT into a <PROFILE> block.

### GUIDELINES
1. Format dates as "Month Year" or "Present".
2. Omit fields with missing data.
3. Map side projects/hackathons to "TECHNICAL PROJECT EXPERIENCE".
4. Map unpaid/non-profit work to "VOLUNTEER".

### EXAMPLE
Input:
Jordan Lee | SF, CA | jordan@example.com
Engineer @ TechFlow (Jan 2020 - Present). Led migration. Managed 5 devs.
Side Project: CryptoTracker - Python script.
B.S. CS, UC Berkeley (2012 - 2016)
Interest: Hiking, Fishing

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

# INTERESTS
- Hiking
- Fishing
</PROFILE>`,

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
