/**
 * Profile template strings and configuration
 * SINGLE SOURCE OF TRUTH for MarkdownDB profile schema
 */

/**
 * Standard profile template showing all available fields with examples
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

export const PROFILE_EXTRACTION_PROMPT = `
>> Task
Parse and transform resumes into a structured format. Output the <PROFILE> data block exactly as shown.

>> Rules
- Dates: "Month Year" format. Use "ONGOING" if current.
- Number headers: EDU_1, EXP_1, etc.
- If present, create simple lists for SKILLS, CERTIFICATIONS, etc.
- ALL work, projects, and volunteering go under # EXPERIENCE with TYPE field.
- DO NOT output fields with unknown values.

>> Experience Types
- PROFESSIONAL: jobs, employment
- PROJECT: side projects, hackathons, academic projects, courses
- VOLUNTEER: unpaid, non-profit, community service

>> Output Format
<PROFILE>
NAME:
ADDRESS: 
EMAIL: 
PHONE: 
WEBSITE: 
GITHUB: 

# EDUCATION
## EDU_1
DEGREE: [required]
SCHOOL: [required]
LOCATION: 
START: 
END: 

# EXPERIENCE
## EXP_1
TYPE: [PROFESSIONAL|PROJECT|VOLUNTEER]
TITLE: [required]
AT: 
START: 
END: 
BULLETS:
- [action/result]

>> Example
Input: Jordan Lee | SF, CA | jordan@example.com
Engineer @ TechFlow (Jan 2020 - Present) - Led migration. Managed 5 devs.
Project: CryptoTracker - Python script.
B.S. CS, UC Berkeley (2012 - 2016)
Skills: Python, React
Interests: Hiking, Chess

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

# INTERESTS:
- Hiking
- Chess

>>Parse this resume:
`;
