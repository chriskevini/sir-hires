// Configuration and constants for job details viewer
// Schema version: 0.2.0

// Re-export parser and validator utilities for use across the application
export {
  parseJobTemplate,
  mapMarkdownFieldsToJob,
} from '../../utils/job-parser';
export {
  validateJobTemplate,
  getValidationSummary,
} from '../../utils/job-validator';

// Status progression order for state-based navigation (v0.2.0)
export const statusOrder = [
  'Researching',
  'Drafting',
  'Awaiting Review',
  'Interviewing',
  'Deciding',
  'Accepted',
  'Rejected',
  'Withdrawn',
];

// Status badge color configuration (v0.2.0)
// Used for both badge styling and progress bar colors
export const statusColors = {
  Researching: { bg: '#f5f5f5', text: '#666' }, // Gray to match progress bar
  Drafting: { bg: '#d4edda', text: '#155724' },
  'Awaiting Review': { bg: '#e8f0fe', text: '#1967d2' }, // Blue to match progress bar
  Interviewing: { bg: '#fff3cd', text: '#856404' },
  Deciding: { bg: '#f3e8fd', text: '#7627bb' },
  Accepted: { bg: '#ceead6', text: '#0d652d' },
  Rejected: { bg: '#f8d7da', text: '#721c24' },
  Withdrawn: { bg: '#e2e3e5', text: '#383d41' },
};

// Progress bar visual configuration for each status (v0.2.0)
export const progressConfig = {
  Researching: { fill: 0, color: '#757575', textColor: '#666' },
  Drafting: { fill: 15, color: '#4caf50', textColor: '#fff' },
  'Awaiting Review': { fill: 35, color: '#2196f3', textColor: '#fff' },
  Interviewing: { fill: 60, color: '#ff9800', textColor: '#fff' },
  Deciding: { fill: 85, color: '#9c27b0', textColor: '#fff' },
  Accepted: { fill: 100, color: '#4caf50', textColor: '#fff' },
  Rejected: { fill: 100, color: '#f44336', textColor: '#fff' },
  Withdrawn: { fill: 100, color: '#757575', textColor: '#fff' },
};

// Navigation button configuration for each status (v0.2.0)
export function getNavigationButtons(status) {
  const buttons = { left: null, right: [] };

  switch (status) {
    case 'Researching':
      buttons.right = [{ label: 'Draft Documents', target: 'Drafting' }];
      break;

    case 'Drafting':
      buttons.left = { label: 'Researching', target: 'Researching' };
      buttons.right = [{ label: 'Apply', target: 'Awaiting Review' }];
      break;

    case 'Awaiting Review':
      buttons.left = { label: 'Drafting', target: 'Drafting' };
      buttons.right = [{ label: 'Begin Interviewing', target: 'Interviewing' }];
      break;

    case 'Interviewing':
      buttons.left = { label: 'Awaiting Review', target: 'Awaiting Review' };
      buttons.right = [{ label: 'Received Offer', target: 'Deciding' }];
      break;

    case 'Deciding':
      buttons.left = { label: 'Interviewing', target: 'Interviewing' };
      buttons.right = [
        { label: 'Accepted', target: 'Accepted' },
        { label: 'Rejected', target: 'Rejected' },
      ];
      break;

    case 'Accepted':
      buttons.left = { label: 'Deciding', target: 'Deciding' };
      break;

    case 'Rejected':
      buttons.left = { label: 'Deciding', target: 'Deciding' };
      break;

    case 'Withdrawn':
      // For withdrawn, we need to figure out the previous state from history
      buttons.left = { label: 'Previous', target: 'Researching' }; // Default fallback
      break;

    default:
      // Default case: treat as 'Researching'
      buttons.right = [{ label: 'Draft Documents', target: 'Drafting' }];
  }

  return buttons;
}

// Terminal states that cannot progress further
export const terminalStates = ['Accepted', 'Rejected', 'Withdrawn'];

// DOM element IDs
export const domIds = {
  jobsList: 'jobsList',
  detailPanel: 'detailPanel',
  mainView: 'mainView',
  searchInput: 'searchInput',
  sourceFilter: 'sourceFilter',
  statusFilter: 'statusFilter',
  sortFilter: 'sortFilter',
  progressBar: 'progressBar',
  navigationButtons: 'navigationButtons',
  masterResumeBtn: 'masterResumeBtn',
  resumeHint: 'resumeHint',
  createBackupBtn: 'createBackupBtn',
  restoreBackupBtn: 'restoreBackupBtn',
  clearAllBtn: 'clearAllBtn',
};

// CSS class names
export const cssClasses = {
  jobCard: 'job-card',
  jobCardSelected: 'selected',
  statusBadge: 'status-badge',
  noJobs: 'no-jobs',
  errorState: 'error-state',
  hidden: 'hidden',
  hasResume: 'has-resume',
};

// Animation configuration
export const animationConfig = {
  duration: 400, // milliseconds
  easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
};

// Default values (v0.2.0)
export const defaults = {
  status: 'Researching',
  filters: {
    search: '',
    source: 'all',
    status: 'all',
    sort: 'newest',
  },
};

// LLM configuration for different tasks
export const llmConfig = {
  // Data extraction LLM (for job data extraction from web pages)
  extraction: {
    defaultModel: 'NuExtract-2.0-2B',
    alternativeModels: ['NuExtract-2.0-8B'],
    endpoint: 'http://localhost:1234/v1/chat/completions',
    description: 'Optimized for structured data extraction from job postings',
  },

  // Document synthesis LLM (for resume/cover letter generation)
  synthesis: {
    defaultModel: 'Llama-3.1-8B-Instruct',
    alternativeModels: ['Mistral-7B-Instruct', 'Qwen-2.5-7B-Instruct'],
    endpoint: 'http://localhost:1234/v1/chat/completions',
    modelsEndpoint: 'http://localhost:1234/v1/models',
    description: 'Optimized for creative writing and document generation',
    maxTokens: 2000,
    temperature: 0.7,

    // Universal prompt for document generation
    // LLM determines document type from user instructions in {currentDraft}
    prompts: {
      universal: `
You are an expert career counselor specialized in generating highly targeted, impactful job application documents (resumes, cover letters, and professional emails).

Your sole goal is to synthesize one single, polished document by strictly following the instructions, format, and structure found within the [CURRENT DRAFT] input, including the **Document-Specific Generation Rules** explicitly defined within that block.

### STREAMING PROTOCOL (STRICTLY ADHERE)

1. **Thinking Models:** You MUST execute the full Step-by-Step Generation Process (Steps 1-4) and the reasoning MUST be contained ONLY within the tags <thinking> and </thinking>.
2. **Non-Thinking Models:** If you are unable to perform the multi-step reasoning process, DO NOT output the <thinking> tags or any text other than the final document.
3. **Final Output:** Output **ONLY** the requested document *after* the </thinking> tag. **DO NOT** include any introductory text, notes, explanatory commentary, or greetings outside of the final generated document.

### STEP-BY-STEP GENERATION PROCESS (MANDATORY FOR THINKING MODELS)

1. Understand & Validate: Determine the document type and **Document-Specific Generation Rules** from the [CURRENT DRAFT] block.
2. Analyze Context: Critically analyze all job inputs to identify the core requirements and the specific goal (e.g., job requirements for a resume, call-to-action for an email).
3. Select and Prepare Content: Scan the [MASTER RESUME] to select content that aligns with the job/goal. **Confirm how the selected content will be treated** (verbatim, synthesized, or high-level reference) based on the document's specific rules.
4. Synthesize Document: Generate the final document. **STRICTLY apply the simple rules and the required structure** defined in the [CURRENT DRAFT] block.
`,
      jobExtractor: `
### ROLE
You are an expert Data Extraction Engine. Your sole purpose is to parse unstructured job descriptions into a strict, structured data format.

### OBJECTIVE
Extract relevant data points from the user-provided text and map them to the specific schema defined below. Do not include conversational text, markdown formatting, or explanations. Output ONLY the raw data block.

### DATA RULES & TRANSFORMATIONS
1.  **Missing Data:**
    * If a *Required* field is missing, output "UNKNOWN".
    * If an *Optional* field is missing, output "N/A".
2.  **Dates:** Convert all dates to YYYY-MM-DD format. If the year is implied, use the current year (2025).
3.  **Salary:** Extract raw numbers. Format with commas (e.g., 100,000). Do not include currency symbols ($).
4.  **Lists:** Format lists (Description, Skills) with hyphens "- ". Capture a maximum of 5 key points per section.
5.  **White Space:** There must be an empty line above the names of lists.

### ENUMERATION MAPPING (STRICT)
You must map values to these exact categories. Do not invent new categories.

* **REMOTE_TYPE:**
    * "Onsite", "In-office" -> ONSITE
    * "Remote", "WFH", "Work from home", "Anywhere" -> REMOTE
    * "Hybrid", "Flexible location" -> HYBRID
    * If unstated -> ONSITE
* **EMPLOYMENT_TYPE:**
    * [FULL-TIME | PART-TIME | CONTRACT | INTERNSHIP | COOP]
    * Default to FULL-TIME if not specified but implied.
* **EXPERIENCE_LEVEL:**
    * Infer based on title or years of experience.
    * 0-2 years -> ENTRY
    * 3-5 years -> MID
    * 5-8 years -> SENIOR
    * 8+ years, "Principal", "Staff" -> LEAD

### FEW-SHOT EXAMPLES

**Input:**
"Hiring a Junior Web Dev at TechStart! $60k-$80k. You must know React and HTML. Work from home available. Apply by Dec 1st."

**Output:**
<JOB>
TITLE: Junior Web Developer
COMPANY: TechStart
ADDRESS: N/A
REMOTE_TYPE: REMOTE
SALARY_RANGE_MIN: 60,000
SALARY_RANGE_MAX: 80,000
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

**Input:**
"Principal Architect needed. 10+ years exp required. Contract role for 6 months. New York City. Pay is 150/hr."

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

# DESCRIPTION:
- Lead architectural design for complex systems.

# REQUIRED_SKILLS:
- 10+ years experience
- System Architecture

# PREFERRED_SKILLS:

# ABOUT_COMPANY:

**Input:**
"Acme Corp is looking for a Marketing Manager. Hybrid (2 days in SF office). Salary: 120,000. Great benefits."

**Output:**
<JOB>
TITLE: Marketing Manager
COMPANY: Acme Corp
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID
SALARY_RANGE_MIN: 120,000
SALARY_RANGE_MAX: 120,000
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

### CURRENT TASK
Analyze the job listing provided below and output the <JOB> data sheet:

`,
    },
  },
};

// Default document templates
export const documentTemplates = {
  tailoredResume: `
# Tailored Resume
# Do not paraphrase achievements.
# Bullet points MUST be copied from the Master Resume verbatim.
# Only include content relevant to the target job description.
# Limit the final document to a single page.

[YOUR FULL NAME]
[YOUR PHONE NUMBER] | [YOUR EMAIL] | [YOUR LINKEDIN PROFILE URL]

---

## Summary (Optional)
[1-4 sentences summarizing your career and aligning it with the role.]

---

## Experience

### [COMPANY NAME] | [CITY, STATE]
**[Job Title]** | [Month Year] – [Month Year]
* [Master Resume Bullet 1 - Copied Verbatim]
* [Master Resume Bullet 2 - Copied Verbatim]

---

## Skills
[List technical skills, tools, and languages relevant to the job posting.]

---

## Education
**[Degree Name]** | [University Name] | [City, State] | [Month Year]
`,

  coverLetter: `
# Cover Letter
# Paraphrase and synthesize achievements. Maintain a confident tone.
# All hard skills and project details MUST be supported by facts traceable to the Master Resume.
# Address the top job requirements. Soft skills and contextual anecdotes are exempt from factual checks.

[YOUR FULL NAME]
[YOUR STREET ADDRESS] | [YOUR CITY, POSTAL CODE]
[YOUR PHONE NUMBER]
[YOUR EMAIL ADDRESS] | [YOUR LINKEDIN PROFILE URL]

[DATE]

[RECIPIENT NAME]
[RECIPIENT TITLE]
[COMPANY NAME]
[COMPANY STREET ADDRESS] | [COMPANY CITY, POSTAL CODE]

Dear [RECIPIENT NAME or RECIPIENT TITLE],

[HOOK: State your most relevant career achievement, a powerful statistic, or a strong declaration of your passion and alignment with the company's mission/role.]

[RELEVANCE: Connect your top 2-3 skills to the job requirements. Use a quantifiable achievement from a previous role.]

[CULTURE/COMPANY FIT: Explain why you are applying to this specific company, citing its mission, values, or recent work.]

[CALL TO ACTION: Reiterate your enthusiasm. Clearly state how to reach you, and guide the recipient to your comprehensive portfolio/work samples, whether they are attached to this email/application or hosted on your website.]

Sincerely,
[YOUR SIGNATURE]
[YOUR FULL NAME]
`,
};

// Checklist templates for each status
export const checklistTemplates = {
  Researching: [
    { text: 'Review job description thoroughly', order: 0 },
    { text: 'Research company culture and values', order: 1 },
    { text: 'Create narrative strategy', order: 2 },
  ],
  Drafting: [
    { text: 'Create tailored resume/CV', order: 0 },
    { text: 'Write cover letter', order: 1 },
    { text: 'Prepare all required documents', order: 2 },
    { text: 'Review application for errors', order: 3 },
  ],
  'Awaiting Review': [
    { text: 'Confirm application submitted', order: 0 },
    { text: 'Connect with a team member', order: 1 },
    { text: 'Follow up if needed', order: 2 },
  ],
  Interviewing: [
    { text: 'Research interviewer backgrounds', order: 0 },
    { text: 'Prepare STAR responses', order: 1 },
    { text: 'Prepare questions to ask', order: 2 },
    { text: 'Send thank you notes', order: 3 },
  ],
  Deciding: [
    { text: 'Review offer details', order: 0 },
    { text: 'Analyze total compensation', order: 1 },
    { text: 'Negotiate if appropriate', order: 2 },
    { text: 'Compare with other offers', order: 3 },
  ],
  Accepted: [
    { text: 'Sign offer letter', order: 0 },
    { text: 'Complete onboarding paperwork', order: 1 },
    { text: 'Withdraw from other applications', order: 2 },
  ],
  Rejected: [
    { text: 'Request feedback if appropriate', order: 0 },
    { text: 'Update notes with learnings', order: 1 },
  ],
  Withdrawn: [],
};
