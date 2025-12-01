/**
 * Test fixtures for Prompt Playground
 * Pre-built test data for quick iteration on LLM prompts
 */

import { documentTemplates } from '@/tasks/synthesis';

// =============================================================================
// JOB EXTRACTION FIXTURES
// =============================================================================

export const JOB_FIXTURE_COMPLETE = `Software Engineer - Full Stack
TechCorp Inc.
San Francisco, CA (Hybrid - 2 days in office)

Salary: $150,000 - $200,000 per year

About the Role:
We're looking for a Senior Full Stack Engineer to join our growing team. You'll be working on our flagship product, helping to build scalable web applications that serve millions of users.

Requirements:
- 5+ years of experience in software development
- Strong proficiency in React, TypeScript, and Node.js
- Experience with PostgreSQL and Redis
- Familiarity with AWS services (EC2, S3, Lambda)
- Excellent communication skills

Nice to Have:
- Experience with GraphQL
- Knowledge of Kubernetes
- Previous startup experience

Benefits:
- Unlimited PTO
- 401(k) matching
- Health, dental, and vision insurance
- Remote work flexibility

Posted: November 15, 2025
Application Deadline: December 31, 2025`;

export const JOB_FIXTURE_MINIMAL = `Hiring: Web Developer at StartupXYZ
Remote position, $80k-$100k
Must know JavaScript and React
Apply now!`;

export const JOB_FIXTURE_MESSY = `AMAZING OPPORTUNITY

We're looking for a rockstar developer!!!

Position: Maybe Senior? Or Mid? IDK, depends on experience
Company: CoolTech (we're in stealth mode)
Location: Anywhere! Or maybe NYC sometimes? 

Pay: Competitive (trust us bro)

What we need:
* coding skills (duh)
* someone who can work fast
* 10x developer mindset
* must be passionate about disrupting industries

We offer:
- pizza fridays
- ping pong table
- "unlimited" vacation (but don't actually take it lol)

DM us if interested, no deadline, first come first serve!`;

// =============================================================================
// PROFILE EXTRACTION FIXTURES
// =============================================================================

export const PROFILE_FIXTURE_COMPLETE = `JANE DOE
123 Main Street, San Francisco, CA 94102
jane.doe@email.com | (555) 123-4567
linkedin.com/in/janedoe | github.com/janedoe

SUMMARY
Experienced software engineer with 8+ years of full-stack development experience. Passionate about building scalable systems and mentoring junior developers.

EXPERIENCE

Senior Software Engineer | TechCorp Inc.
January 2020 - Present
- Led development of microservices architecture serving 2M+ daily users
- Mentored team of 5 junior developers
- Reduced API response time by 40% through optimization
- Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes

Software Engineer | StartupXYZ
June 2016 - December 2019
- Built customer-facing dashboard using React and TypeScript
- Designed and implemented RESTful APIs
- Collaborated with product team to define technical requirements

EDUCATION

Master of Science in Computer Science
Stanford University | 2014 - 2016
GPA: 3.8

Bachelor of Science in Computer Science
UC Berkeley | 2010 - 2014
GPA: 3.6

SKILLS
JavaScript, TypeScript, Python, React, Node.js, PostgreSQL, MongoDB, AWS, Docker, Kubernetes

CERTIFICATIONS
- AWS Certified Solutions Architect
- Google Cloud Professional Data Engineer`;

export const PROFILE_FIXTURE_MINIMAL = `John Smith
john@email.com

Developer at SomeCo (2020-present)
- Built stuff
- Fixed bugs

BS Computer Science, State University 2019`;

// =============================================================================
// FIXTURE DEFINITIONS BY TASK TYPE
// =============================================================================

export type TaskType =
  | 'job-extraction'
  | 'profile-extraction'
  | 'synthesis'
  | 'custom';

export const FIXTURES: Record<
  TaskType,
  Array<{ label: string; content: string }>
> = {
  'job-extraction': [
    { label: 'Complete Job Posting', content: JOB_FIXTURE_COMPLETE },
    { label: 'Minimal Job', content: JOB_FIXTURE_MINIMAL },
    { label: 'Messy/Informal Job', content: JOB_FIXTURE_MESSY },
  ],
  'profile-extraction': [
    { label: 'Complete Profile', content: PROFILE_FIXTURE_COMPLETE },
    { label: 'Minimal Profile', content: PROFILE_FIXTURE_MINIMAL },
  ],
  synthesis: [
    { label: 'Resume/CV', content: documentTemplates.tailoredResume },
    { label: 'Cover Letter', content: documentTemplates.coverLetter },
  ],
  custom: [], // Freeform panel manages its own inputs
};
