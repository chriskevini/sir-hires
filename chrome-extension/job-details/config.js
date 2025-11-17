// Configuration and constants for job details viewer
// Schema version: 0.2.0

// Status progression order for state-based navigation (v0.2.0)
export const statusOrder = [
  'Researching',
  'Drafting',
  'Awaiting Review',
  'Interviewing',
  'Deciding',
  'Accepted',
  'Rejected',
  'Withdrawn'
];

// Status badge color configuration (v0.2.0)
// Used for both badge styling and progress bar colors
export const statusColors = {
  'Researching': { bg: '#f5f5f5', text: '#666' }, // Gray to match progress bar
  'Drafting': { bg: '#d4edda', text: '#155724' },
  'Awaiting Review': { bg: '#e8f0fe', text: '#1967d2' }, // Blue to match progress bar
  'Interviewing': { bg: '#fff3cd', text: '#856404' },
  'Deciding': { bg: '#f3e8fd', text: '#7627bb' },
  'Accepted': { bg: '#ceead6', text: '#0d652d' },
  'Rejected': { bg: '#f8d7da', text: '#721c24' },
  'Withdrawn': { bg: '#e2e3e5', text: '#383d41' }
};

// Progress bar visual configuration for each status (v0.2.0)
export const progressConfig = {
  'Researching': { fill: 0, color: '#757575', textColor: '#666' },
  'Drafting': { fill: 15, color: '#4caf50', textColor: '#fff' },
  'Awaiting Review': { fill: 35, color: '#2196f3', textColor: '#fff' },
  'Interviewing': { fill: 60, color: '#ff9800', textColor: '#fff' },
  'Deciding': { fill: 85, color: '#9c27b0', textColor: '#fff' },
  'Accepted': { fill: 100, color: '#4caf50', textColor: '#fff' },
  'Rejected': { fill: 100, color: '#f44336', textColor: '#fff' },
  'Withdrawn': { fill: 100, color: '#757575', textColor: '#fff' }
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
        { label: 'Rejected', target: 'Rejected' }
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
  clearAllBtn: 'clearAllBtn'
};

// CSS class names
export const cssClasses = {
  jobCard: 'job-card',
  jobCardSelected: 'selected',
  statusBadge: 'status-badge',
  noJobs: 'no-jobs',
  errorState: 'error-state',
  hidden: 'hidden',
  hasResume: 'has-resume'
};

// Animation configuration
export const animationConfig = {
  duration: 400, // milliseconds
  easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
};

// Default values (v0.2.0)
export const defaults = {
  status: 'Researching',
  filters: {
    search: '',
    source: 'all',
    status: 'all',
    sort: 'newest'
  }
};

// LLM configuration for different tasks
export const llmConfig = {
  // Data extraction LLM (for job data extraction from web pages)
  extraction: {
    defaultModel: 'NuExtract-2.0-2B',
    alternativeModels: ['NuExtract-2.0-8B'],
    endpoint: 'http://localhost:1234/v1/chat/completions',
    description: 'Optimized for structured data extraction from job postings'
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
      universal: `**Role:** You are an expert career counselor specializing in creating highly targeted, impactful job application documents (resumes, cover letters, and other materials).

**Task:** Synthesize a document based on the user's instructions in the [Current Draft] field. The user will specify what type of document they want (e.g., "Write me a cover letter", "Create a tailored resume", "Draft a follow-up email").

**Process:**
1.  **Understand Instructions:** Read the [Current Draft] carefully to determine:
    - What type of document to create (resume, cover letter, email, etc.)
    - Any specific requirements or constraints mentioned by the user
    - Whether this is a new draft or refinement of existing content

2.  **Analyze Job Context:** Critically analyze the Job Listing inputs ([Job Title], [Responsibilities], [Requirements], [About the job], [About the company]) to identify key requirements.

3.  **Select Relevant Content:** Scan the [Master Resume] and select only the most relevant achievements that align with:
    - The job requirements
    - The document type requested
    - The user's specified focus or strategy

4.  **Implement Strategy:** STRICTLY ADHERE to the tone, focus, and structure defined in the [Narrative Strategy].

5.  **Generate Output:** Create the requested document following these guidelines:

    **For Resumes:**
    - SELECT NO MORE THAN 60% of bullet points from [Master Resume]
    - STRICTLY COPY selected bullets verbatim (do not edit wording)
    - MATCH THE EXACT FORMATTING of the [Master Resume]
    - Discard all unused content
    - CRITICAL: If output is full unmodified [Master Resume], task fails

    **For Cover Letters:**
    - Professional business letter format
    - Address to "Hiring Team" or "Hiring Manager"
    - Select most relevant quantifiable achievements
    - No placeholder text (use actual inputs)

    **For All Documents:**
    - Output ONLY the document (no notes, comments, or explanations)
    - Use only content from [Master Resume] or derived from provided inputs
    - Never add content derived from [Narrative Strategy] - use it only for guidance

**Constraints:**
* **Output Purity:** Final output must be ONLY the requested document. NO notes, explanations, or introductory text.
* **No Placeholder Text:** Use actual values from inputs, never placeholders like [Your Name] or [Date].
* **Content Source:** Only use content from [Master Resume] or information from the job listing inputs.

**Inputs:**
[Master Resume]{masterResume}
[Job Title]{jobTitle}
[Company]{company}
[Responsibilities]{responsibilities}
[Requirements]{requirements}
[About the job]{aboutJob}
[About the company]{aboutCompany}
[Narrative Strategy]{narrativeStrategy}
[Current Draft]{currentDraft}

Synthesize the requested document now.`
    }
  }
};

// Checklist templates for each status
export const checklistTemplates = {
  'Researching': [
    { text: 'Review job description thoroughly', order: 0 },
    { text: 'Research company culture and values', order: 1 },
    { text: 'Create narrative strategy', order: 2 },
  ],
  'Drafting': [
    { text: 'Create tailored resume/CV', order: 0 },
    { text: 'Write cover letter', order: 1 },
    { text: 'Prepare all required documents', order: 2 },
    { text: 'Review application for errors', order: 3 }
  ],
  'Awaiting Review': [
    { text: 'Confirm application submitted', order: 0 },
    { text: 'Connect with a team member', order: 1 },
    { text: 'Follow up if needed', order: 2 }
  ],
  'Interviewing': [
    { text: 'Research interviewer backgrounds', order: 0 },
    { text: 'Prepare STAR responses', order: 1 },
    { text: 'Prepare questions to ask', order: 2 },
    { text: 'Send thank you notes', order: 3 }
  ],
  'Deciding': [
    { text: 'Review offer details', order: 0 },
    { text: 'Analyze total compensation', order: 1 },
    { text: 'Negotiate if appropriate', order: 2 },
    { text: 'Compare with other offers', order: 3 },
  ],
  'Accepted': [
    { text: 'Sign offer letter', order: 0 },
    { text: 'Complete onboarding paperwork', order: 1 },
    { text: 'Withdraw from other applications', order: 2 }
  ],
  'Rejected': [
    { text: 'Request feedback if appropriate', order: 0 },
    { text: 'Update notes with learnings', order: 1 }
  ],
  'Withdrawn': [
  ]
};
