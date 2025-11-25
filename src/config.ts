// Configuration and constants for job details viewer
// Schema version: 0.3.0

import { JOB_EXTRACTION_PROMPT } from './utils/job-templates';
import { PROFILE_EXTRACTION_PROMPT } from './utils/profile-templates';

// Status progression order for state-based navigation (v0.3.0)
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

// Status badge color configuration (v0.3.0)
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

// Progress bar visual configuration for each status (v0.3.0)
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

// Navigation button configuration for each status (v0.3.0)
export function getNavigationButtons(status: string) {
  const buttons: {
    left: { label: string; target: string } | null;
    right: { label: string; target: string }[];
  } = { left: null, right: [] };

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

// Default values (v0.3.0)
export const defaults = {
  status: 'Researching',
  filters: {
    search: '',
    source: 'all',
    status: 'all',
    sort: 'newest',
  },
};

// Performance & Timeout Configuration
// Adjust these based on your system performance and LLM speed

export const SERVICE_WORKER_KEEPALIVE_INTERVAL_MS = 20000; // Keepalive during LLM extraction (Chrome MV3 terminates after ~30s)
export const UI_UPDATE_INTERVAL_MS = 60000; // UI refresh interval (1 minute)
export const MESSAGE_RETRY_MAX_ATTEMPTS = 5; // Max retries for sidepanel messages
export const MESSAGE_RETRY_DELAY_MS = 200; // Delay between retry attempts

// LLM Configuration Interfaces
export interface TaskConfig {
  model?: string; // Override global model
  temperature: number;
  maxTokens: number;
  prompt: string; // System prompt for the task
}

export interface LLMConfig {
  // Global Client Settings (shared across all tasks)
  endpoint: string; // http://localhost:1234/v1/chat/completions
  modelsEndpoint: string; // http://localhost:1234/v1/models
  model: string; // Default model for all tasks
  timeoutMs: number; // 60000
  timeoutSeconds: number; // Calculated from timeoutMs

  // Task-Specific Parameters (override global model if needed)
  jobExtraction: TaskConfig;
  profileExtraction: TaskConfig;
  synthesis: TaskConfig;
}

// LLM configuration for different tasks
export const llmConfig: LLMConfig = {
  // Global Client Settings
  endpoint: 'http://localhost:1234/v1/chat/completions',
  modelsEndpoint: 'http://localhost:1234/v1/models',
  model: 'qwen/qwen3-4b-2507', // Default model
  timeoutMs: 60000,
  get timeoutSeconds() {
    return this.timeoutMs / 1000;
  },

  // Job data extraction LLM (for extracting structured data from job postings)
  jobExtraction: {
    temperature: 0.3,
    maxTokens: 2000,
    prompt: JOB_EXTRACTION_PROMPT,
  },

  // Profile extraction LLM (for extracting structured data from resumes/CVs)
  profileExtraction: {
    temperature: 0.3,
    maxTokens: 4000, // Higher default for longer resumes
    prompt: PROFILE_EXTRACTION_PROMPT,
  },

  // Document synthesis LLM (for resume/cover letter generation)
  synthesis: {
    temperature: 0.7,
    maxTokens: 2000,
    // Universal prompt for document generation
    // LLM determines document type from user instructions in {currentDraft}
    prompt: `
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
