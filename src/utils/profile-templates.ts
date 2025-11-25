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

/**
 * Few-shot examples for LLM profile extraction
 * Used to teach the LLM how to convert unstructured resume text to MarkdownDB format
 */
export interface ProfileExtractionExample {
  input: string;
  output: string;
}

export const PROFILE_EXTRACTION_EXAMPLES: ProfileExtractionExample[] = [
  {
    input: `Jane Smith
jane.smith@email.com | 555-123-4567 | San Francisco, CA
GitHub: github.com/janesmith

EDUCATION
Bachelor of Science in Software Engineering
Stanford University, Stanford, CA
Graduated: May 2018

EXPERIENCE
Full Stack Developer at WebCorp (Jan 2020 - Present)
- Developed REST APIs using Node.js and Express
- Built responsive UIs with React and TypeScript
- Reduced page load times by 40%

Junior Developer at StartupXYZ (Jun 2018 - Dec 2019)
- Maintained legacy PHP codebase
- Implemented automated testing with Jest

Personal Project: Weather App
- Built mobile app with React Native
- Integrated OpenWeather API
- Published to App Store

SKILLS
Languages: JavaScript, TypeScript, Python
Frameworks: React, Node.js, Express`,

    output: `<PROFILE>
NAME: Jane Smith
ADDRESS: San Francisco, CA
EMAIL: jane.smith@email.com
PHONE: 555-123-4567
GITHUB: github.com/janesmith

# EDUCATION
## EDU_1
DEGREE: Bachelor of Science in Software Engineering
SCHOOL: Stanford University
LOCATION: Stanford, CA
START: N/A
END: May 2018

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL
TITLE: Full Stack Developer
AT: WebCorp
START: January 2020
END: ONGOING
BULLETS:
- Developed REST APIs using Node.js and Express
- Built responsive UIs with React and TypeScript
- Reduced page load times by 40%

## EXP_2
TYPE: PROFESSIONAL
TITLE: Junior Developer
AT: StartupXYZ
START: June 2018
END: December 2019
BULLETS:
- Maintained legacy PHP codebase
- Implemented automated testing with Jest

## EXP_3
TYPE: PROJECT
TITLE: Weather App
BULLETS:
- Built mobile app with React Native
- Integrated OpenWeather API
- Published to App Store

# SKILLS:
- JavaScript, TypeScript, Python
- React, Node.js, Express`,
  },
  {
    input: `MICHAEL CHEN
michael.chen@gmail.com
New York, NY 10001

SUMMARY
Senior Data Scientist with 8 years of experience in machine learning and analytics.

WORK HISTORY
Data Scientist - Tech Giants Inc (2020-Present)
• Led ML initiatives for recommendation system
• Improved model accuracy by 25%
• Mentored team of 5 junior data scientists

Data Analyst - Analytics Co (2018-2020)
• Built dashboards using Tableau
• Analyzed customer behavior patterns

Research Assistant - MIT (2015-2018)
• Conducted research on neural networks
• Published 3 papers in peer-reviewed journals

EDUCATION
PhD in Computer Science - MIT (2015-2018)
MS in Statistics - Columbia University (2013-2015)
BS in Mathematics - UC Berkeley (2009-2013)

VOLUNTEER
Tutor at Code.org - Teaching kids programming since 2019`,

    output: `<PROFILE>
NAME: Michael Chen
ADDRESS: New York, NY 10001
EMAIL: michael.chen@gmail.com

# EDUCATION
## EDU_1
DEGREE: PhD in Computer Science
SCHOOL: MIT
START: 2015
END: 2018

## EDU_2
DEGREE: MS in Statistics
SCHOOL: Columbia University
START: 2013
END: 2015

## EDU_3
DEGREE: BS in Mathematics
SCHOOL: UC Berkeley
START: 2009
END: 2013

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL
TITLE: Senior Data Scientist
AT: Tech Giants Inc
START: 2020
END: ONGOING
BULLETS:
- Led ML initiatives for recommendation system
- Improved model accuracy by 25%
- Mentored team of 5 junior data scientists

## EXP_2
TYPE: PROFESSIONAL
TITLE: Data Analyst
AT: Analytics Co
START: 2018
END: 2020
BULLETS:
- Built dashboards using Tableau
- Analyzed customer behavior patterns

## EXP_3
TYPE: PROFESSIONAL
TITLE: Research Assistant
AT: MIT
START: 2015
END: 2018
BULLETS:
- Conducted research on neural networks
- Published 3 papers in peer-reviewed journals

## EXP_4
TYPE: VOLUNTEER
TITLE: Programming Tutor
AT: Code.org
START: 2019
END: ONGOING
BULLETS:
- Teaching kids programming`,
  },
  {
    input: `Sarah Johnson | sarah.j@proton.me | Austin, TX

Recent grad looking for entry-level roles!

University of Texas at Austin
Computer Science, GPA: 3.8
Graduated Dec 2024

PROJECTS
E-commerce Website (Solo Project)
- Built with Django and PostgreSQL
- Implemented payment processing with Stripe
- Deployed on Heroku

Hackathon Winner: HealthTracker App (Team of 4)
- Won 1st place at HackUT 2024
- Mobile app for tracking fitness goals
- Used Firebase for backend

INTERESTS
Rock climbing, photography, open source contributions`,

    output: `<PROFILE>
NAME: Sarah Johnson
ADDRESS: Austin, TX
EMAIL: sarah.j@proton.me

# EDUCATION
## EDU_1
DEGREE: Bachelor of Science in Computer Science
SCHOOL: University of Texas at Austin
LOCATION: Austin, TX
START: N/A
END: December 2024
GPA: 3.8

# EXPERIENCE
## EXP_1
TYPE: PROJECT
TITLE: E-commerce Website
BULLETS:
- Built with Django and PostgreSQL
- Implemented payment processing with Stripe
- Deployed on Heroku

## EXP_2
TYPE: PROJECT
TITLE: HealthTracker App
BULLETS:
- Won 1st place at HackUT 2024
- Mobile app for tracking fitness goals
- Used Firebase for backend
- Team of 4 members

# INTERESTS:
- Rock climbing
- Photography
- Open source contributions`,
  },
];

/**
 * System prompt for LLM profile extraction
 * Teaches the model how to parse resume text into MarkdownDB format
 */
export const PROFILE_EXTRACTION_PROMPT = `You are a resume parser that converts unstructured resume text into structured MarkdownDB profile format.

# MarkdownDB Profile Format Rules:

1. **Start with <PROFILE> tag**
2. **Basic Info (KEY: value pairs):**
   - NAME: (required)
   - ADDRESS: (city, state preferred)
   - EMAIL: (required if available)
   - PHONE: (optional)
   - Additional fields: WEBSITE, GITHUB, LINKEDIN, etc.

3. **Education Section:**
   - Use # EDUCATION header
   - Each entry: ## EDU_N (N = 1, 2, 3...)
   - Required: DEGREE, SCHOOL
   - Optional: LOCATION, START, END, GPA

4. **Experience Section:**
   - Use # EXPERIENCE header
   - Each entry: ## EXP_N (N = 1, 2, 3...)
   - Required: TYPE [PROFESSIONAL|PROJECT|VOLUNTEER], TITLE
   - Optional: AT (employer/org), START, END
   - BULLETS: (use - prefix for list items)

5. **Other Sections:**
   - # SKILLS: (bullet list with -)
   - # INTERESTS: (bullet list with -)
   - # CERTIFICATIONS: (bullet list with -)

6. **Formatting Guidelines:**
   - Use "ONGOING" for current positions (not "Present")
   - Use "N/A" for missing required fields
   - Keep bullet points concise and action-oriented
   - Preserve important metrics and achievements
   - Dates: prefer "Month YYYY" format or just "YYYY"
   - Comments: use // for inline notes

# Examples:

${PROFILE_EXTRACTION_EXAMPLES.map(
  (ex, i) => `## Example ${i + 1}

INPUT:
${ex.input}

OUTPUT:
${ex.output}

---`
).join('\n\n')}

# Task:

Extract the following resume text into MarkdownDB profile format:`;
