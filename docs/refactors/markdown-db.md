# Implementation details of [MarkdownDB](/docs/thoughts/markdown-db.md)

## Profile Template
**This template is designed to be used inside of a prompt to help the LLM identify patterns.**
```
<PROFILE>
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
TYPE: PROFESSIONAL // required [PROFFESIONAL|PROJECT|VOLUNTEER]
TITLE: Senior Developer // required
AT: Tech Solutions Inc.
START: October 2020
END: ONGOING
BULLETS:
- Built API...
- Led team...

## EXP_2
TYPE: PROJECT // required [PROFFESIONAL|PROJECT|VOLUNTEER]
TITLE: Linux Kernel // required
BULLETS:
- Architected kernel...
- Integrated Rust...

## EXP_3
TYPE: VOLUNTEER // required [PROFFESIONAL|PROJECT|VOLUNTEER]
TITLE: Community Volunteer // required
AT: Local Non-Profit
BULLETS:
- Supported educational...
- Helped organize...

# INTERESTS:
- Scuba diving
- Reading
// ex: # CERTIFICATIONS:
```
**The explanations below are for the reader's convenience.**
- The first line contains the data artifact's type surrounded by chevrons.
- Top level KV pairs have no frivolous styling.
- Keys are always written in ALL_CAPS.
- Keys and values do not need to be quoted.
- Nesting is indicated by #.
- List names always end with a colon independent of nesting.
- List items start with - and do not require a comma.


## Job Template
```
<JOB>
TITLE: Senior Cloud Infrastructure Engineer // required
COMPANY: Stellar Innovations Inc. // required
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID // [ONSITE|REMOTE|HYBRID]
SALARY_RANGE_MIN: 100,000
SALARY_RANGE_MAX: 150,000
EMPLOYMENT_TYPE: FULL-TIME // [FULL-TIME|PART-TIME|CONTRACT|INTERNSHIP|COOP]
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
- **Values:** We are committed to fostering diversity, equity, and inclusion in the workplace.
```
