/**
 * Test fixtures for playground and tests
 * Pre-built test data for quick iteration on LLM prompts
 */

// =============================================================================
// JOB FIXTURES
// =============================================================================

export const RAW_COMPLETE_JOB = `Software Engineer- job post
Quantech
3.3
3.3 out of 5 stars
San Francisco, CA•Hybrid work
$144,900 - $168,400 a year - Full-time
Quantech
San Francisco, CA•Hybrid work
$144,900 - $168,400 a year
Profile insights
Here's how the job qualifications align with your profile.
Skills

Scalable systems

Scalability

Distributed computing

+ show more

Do you have experience in Scalable systems?
&nbsp;
Job details
Here's how the job details align with your profile.
Pay

$144,900 - $168,400 a year
Job type

Full-time
&nbsp;
Benefits
Pulled from the full job description
Health insurance
Retirement plan
Vision insurance
Dental insurance
&nbsp;
Full job description
At Quantech, we're redefining what's possible in digital advertising. As a global Demand Side Platform (DSP) powered by AI, we help marketers connect with the right audiences and deliver measurable results across the Open Web. Our foundation is built on cutting-edge measurement and consumer analytics, giving our clients the tools they need to drive success in an ever-evolving digital landscape.

Since our start in 2006, we've pioneered industry firsts—from launching the original measurement platform for digital publishers to introducing the first AI-driven DSP. If you're ready to be part of a dynamic, forward-thinking team that thrives on creating transformative solutions, Quantcast is the perfect place to grow your career.

Quantech is hiring Software Engineers to join our engineering team in our San Francisco office.
As the real-time pulse of the Internet, Quantech runs the world's largest AI-driven insights and measurement platform directly quantifying over 100 million web destinations. We are using machine learning to drive human learning. Quantcast provides brand marketers and publishers with significant audience insights, predictive targeting and measurement solutions across the customer journey.

You'll have the opportunity to learn Software Engineering methodologies and will own projects from start to finish. You are passionate about building scalable backend systems and customer-facing applications. You will thrive in an environment where independent decision-making based on product requirements is the norm. We foster an agile environment where new ideas and software development come together to effectively pursue some of our industry's toughest problems.
What you'll do:
You will provide technical solutions to take on exciting problems in the advertising industry.
You will partner with a team of engineers and work on a variety of large scale systems.
You will collaborate with Product & Business Operations teams to translate business requirements and build highly robust and scalable products.
You will gain exposure to existing Quantech systems and our technologies to internal and external customers.
You will be responsible for the day-to-day product operations.
Who you are:
1 - 5 years of experience.
You must be work-authorized in the United States without the need for current or future employer sponsorship.
BS, MS or PhD degree in computer science or related field.
This is a hybrid role based in our San Francisco office. To ensure a manageable commute for in-office days, candidates must reside within a 60-mile radius of San Francisco, CA. No relocation candidates at this time.
Excellent command of one or more programming language in Java or Python.
Experience working with distributed systems, big data and large-scale systems.
Deep understanding of algorithms and data structures.
Extraordinary verbal and written interpersonal skills.
The salary range for this position is $144,900 - $168,400.

#LI-AC1

Quantech operates in a hybrid work environment. The in office days are Tuesday, Wednesday, and Thursday.

At Quantech, we craft offers that reflect your unique skills, expertise, and geographic location. On top of a competitive salary, this position includes eligibility for a performance bonus, equity, and a comprehensive benefits package. Depending on your location, this may include generous vacation, medical, dental, and vision coverage, and retirement plans. For more details, visit our Careers page and see how we support our team. Please see the Applicant Privacy Notice for details on our applicant privacy policy.

Founded in 2006 and headquartered in San Francisco, we are a diverse, aligned community with offices across 10 countries worldwide. Join the team that unlocks potential.

Quantech is an Equal Opportunity Employer.

We may use artificial intelligence (AI) tools to support parts of the hiring process, such as reviewing applications, analyzing resumes, or assessing responses. These tools assist our recruitment team but do not replace human judgment. Final hiring decisions are ultimately made by humans. If you would like more information about how your data is processed, please contact us.

&nbsp;`;

export const EXTRACTED_COMPLETE_JOB = `<JOB>
TITLE: Software Engineer
COMPANY: Quantech
ADDRESS: San Francisco, CA
REMOTE TYPE: HYBRID
SALARY RANGE MIN: 144900
SALARY RANGE MAX: 168400
PAY PERIOD: ANNUAL
EMPLOYMENT TYPE: FULL-TIME
EXPERIENCE LEVEL: MID
CLOSING DATE: 2025-12-31

# DESCRIPTION
- Provide technical solutions to address exciting problems in the advertising industry.
- Partner with engineers to work on large-scale systems.
- Collaborate with Product & Business Operations teams to translate business requirements and build robust, scalable products.
- Gain exposure to existing Quantech systems and technologies used by internal and external customers.
- Be responsible for day-to-day product operations.

# REQUIRED SKILLS
- Experience with scalable systems and distributed computing
- Experience with big data and large-scale systems
- Deep understanding of algorithms and data structures
- Proficiency in Java or Python
- Strong verbal and written communication skills

# ABOUT COMPANY
- Founded in 2006, headquartered in San Francisco.
- Operates in a hybrid work environment with in-office days on Tuesday, Wednesday, and Thursday.
- Offices across 10 countries worldwide.
- Equal Opportunity Employer.
- Uses AI tools to support hiring processes; final decisions made by humans.

# BENEFITS
- Health insurance
- Retirement plan
- Vision insurance
- Dental insurance
- Performance bonus
- Equity
- Generous vacation, medical, dental, and vision coverage
</JOB>`;

export const RAW_MINIMAL_JOB = `Hiring: Web Developer at StartupXYZ
Remote position, $80k-$100k
Must know JavaScript and React
Apply now!`;

export const RAW_MESSY_JOB = `AMAZING OPPORTUNITY

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
// PROFILE FIXTURES
// =============================================================================

export const RAW_COMPLETE_PROFILE = `Alexander Sterling
1-98765 Main St.	(778) 555-1234
Burnaby, BC V5B2A9	alex.sterling@email.com

Personal Projects

StellarFlow
Designed a load-balancing algorithm that dynamically assigns tasks to servers based on real-time utilization metrics to optimize throughput.
Implemented asynchronous programming patterns to improve application responsiveness and efficiency.
Refactored legacy codebase, resulting in a 40% reduction in technical debt and improved maintainability.
Employed test-driven development (TDD) principles throughout the software lifecycle.
Integrated proprietary internal API's for seamless data exchange across microservices.
Deployed cloud-native application using Docker containers orchestrated via Kubernetes.
Established CI/CD pipelines using Jenkins for automated testing and deployment.
Developed a caching mechanism using Redis to reduce database read latency by 65%.

TerraMapper
Created responsive user interfaces using Material Design guidelines.
Conducted A/B testing on different UI/UX layouts to determine optimal user engagement.
Authored comprehensive unit, integration, and end-to-end tests using Jest and Cypress.
Maintained code quality through regular peer code reviews and adherence to coding standards.
Developed a mobile application front-end using Flutter and Dart.
Managed a relational PostgreSQL database schema and performed optimizations.

Work History

Innovatech Software Solutions, Vancouver, BC	June 2023 - Present
Software Engineer
Developed and maintained core features for a high-traffic enterprise SaaS platform.
Optimized database queries and indexing, reducing average response time from 500ms to 150ms.
Participated in system design meetings and contributed to architectural decisions.
Resolved critical production bugs using root cause analysis.

TechServe Consulting, Surrey, BC	January 2021 - May 2023
Junior Developer
Assisted in the full-stack development of client web applications using React and Node.js.
Wrote documentation for new features and maintained existing technical guides.
Provided technical support to clients for deployed applications.
Configured cloud resources (AWS EC2, S3) for application deployment and hosting.

Digital Marketing Agency, Richmond, BC	September 2019 - December 2020
Web Development Intern
Built and maintained client marketing websites using WordPress and custom HTML/CSS/JS.
Ensured cross-browser compatibility and adherence to accessibility standards (WCAG).
Managed domain names, SSL certificates, and basic server configurations.

Volunteer

CodeMentor Community, Online	2020 - Present
Volunteer Coding Mentor
Provided one-on-one virtual mentorship to beginners learning Python and JavaScript.
Reviewed mentees' code and offered constructive suggestions for improvement.
Contributed to open-source educational resources and tutorials.

Greater Vancouver Food Bank, Vancouver, BC	2017 - 2019
Logistics Assistant
Coordinated the sorting and distribution of non-perishable goods.
Managed inventory tracking using a custom spreadsheet system.
Trained new volunteers on safety protocols and efficient workflow.

Education

Simon Fraser University, Burnaby, BC	September 2019 - May 2023
Bachelor of Science, Computer Science`;

export const RAW_MINIMAL_PROFILE = `John Smith
john@email.com

Developer at SomeCo (2020-present)
- Built stuff
- Fixed bugs

BS Computer Science, State University 2019`;

export const EXTRACTED_COMPLETE_PROFILE = `<PROFILE>
NAME: Alexander Sterling
ADDRESS: 1-98765 Main St., Burnaby, BC V5B2A9
EMAIL: alex.sterling@email.com

# PROFESSIONAL EXPERIENCE

## Software Engineer
AT: Innovatech Software Solutions
LOCATION: Vancouver, BC
START: June 2023
END: ONGOING
- Developed and maintained core features for a high-traffic enterprise SaaS platform.
- Optimized database queries and indexing, reducing average response time from 500ms to 150ms.
- Participated in system design meetings and contributed to architectural decisions.
- Resolved critical production bugs using root cause analysis.

## Junior Developer
AT: TechServe Consulting
LOCATION: Surrey, BC
START: January 2021
END: May 2023
- Assisted in the full-stack development of client web applications using React and Node.js.
- Wrote documentation for new features and maintained existing technical guides.
- Provided technical support to clients for deployed applications.
- Configured cloud resources (AWS EC2, S3) for application deployment and hosting.

## Web Development Intern
AT: Digital Marketing Agency
LOCATION: Richmond, BC
START: September 2019
END: December 2020
- Built and maintained client marketing websites using WordPress and custom HTML/CSS/JS.
- Ensured cross-browser compatibility and adherence to accessibility standards (WCAG).
- Managed domain names, SSL certificates, and basic server configurations.

# VOLUNTEER

## Volunteer Coding Mentor
AT: CodeMentor Community
LOCATION: Online
START: 2020
END: ONGOING
- Provided one-on-one virtual mentorship to beginners learning Python and JavaScript.
- Reviewed mentees' code and offered constructive suggestions for improvement.
- Contributed to open-source educational resources and tutorials.

## Logistics Assistant
AT: Greater Vancouver Food Bank
LOCATION: Vancouver, BC
START: 2017
END: 2019
- Coordinated the sorting and distribution of non-perishable goods.
- Managed inventory tracking using a custom spreadsheet system.
- Trained new volunteers on safety protocols and efficient workflow.

# EDUCATION

## Bachelor of Science, Computer Science
SCHOOL: Simon Fraser University
LOCATION: Burnaby, BC
START: September 2019
END: May 2023

# TECHNICAL PROJECT EXPERIENCE

## StellarFlow
- Designed a load-balancing algorithm that dynamically assigns tasks to servers based on real-time utilization metrics to optimize throughput.
- Implemented asynchronous programming patterns to improve application responsiveness and efficiency.
- Refactored legacy codebase, resulting in a 40% reduction in technical debt and improved maintainability.
- Employed test-driven development (TDD) principles throughout the software lifecycle.
- Integrated proprietary internal API's for seamless data exchange across microservices.
- Deployed cloud-native application using Docker containers orchestrated via Kubernetes.
- Established CI/CD pipelines using Jenkins for automated testing and deployment.
- Developed a caching mechanism using Redis to reduce database read latency by 65%.

## TerraMapper
- Created responsive user interfaces using Material Design guidelines.
- Conducted A/B testing on different UI/UX layouts to determine optimal user engagement.
- Authored comprehensive unit, integration, and end-to-end tests using Jest and Cypress.
- Maintained code quality through regular peer code reviews and adherence to coding standards.
- Developed a mobile application front-end using Flutter and Dart.
- Managed a relational PostgreSQL database schema and performed optimizations.

# SKILLS
- React
- Node.js
- AWS (EC2, S3)
- PostgreSQL
- Docker
- Kubernetes
- Jenkins
- Redis
- Flutter
- JavaScript
- Python
- CSS
- HTML
- WordPress
- Agile/Scrum
- Test-Driven Development (TDD)
- A/B Testing
- System Design
- Database Optimization
- CI/CD
- Cloud Native
</PROFILE>`;
