# Implementation details of [MarkdownDB](/docs/thoughts/markdown-db.md)

## Profile Template
**This template is designed to be used inside of a prompt to help the LLM identify patterns.**
```
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
- Top level KV pairs have no frivolous styling.
- Keys are always written in ALL_CAPS.
- Keys and values do not need to be quoted.
- Nesting is indicated by #.
- List names always end with a colon independent of nesting.
- List items start with - and do not require a comma.
