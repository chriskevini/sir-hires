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

    // Base prompts for document generation (from DRAFTING_VIEW_PLAN.md)
    // Note: Single prompt per document type - LLM adapts based on whether {currentDraft} is empty or not
    prompts: {
      resume: `
**Role:** You are an expert career counselor specializing in creating highly targeted, **shortened**, and impactful resumes specifically optimized for a single job description.

**Task:** Synthesize a **NEW, SHORTENED** resume artifact using only relevant content from the Master Resume, strictly adhering to all constraints.

**Process:**
1.  **Analyze & Filter:** Critically analyze the **Job Listing** inputs ([Job Title], [Responsibilities], [Requirements], [About the job], [About the company]) to identify key requirements and desired skills.
2.  **Strategic Selection:** Scan the **[Master Resume]** and **SELECT NO MORE THAN 60%** of the original bullet points, focusing only on the most relevant achievements that directly match the job requirements.
3.  **Verbatim Copy:** **STRICTLY COPY** the selected bullet points *verbatim* from the [Master Resume]. Do not edit, summarize, or alter the wording of any achievement.
4.  **Implement Strategy & Structure:** **STRICTLY ADHERE** to the tone, focus, and structure defined in the **[Narrative Strategy]**. Recombine the selected bullet points into logical, meaningful, and job-specific sections. **ALL UNUSED CONTENT MUST BE DISCARDED AND NOT APPEAR IN THE FINAL OUTPUT.**
5.  **Refine (Optional):** Use the **[Current Draft]** only for reference or to ensure improvements are made, but produce a final, polished version.

**Constraints:**
* **CRITICAL FAILURE CONDITION:** If the output is the **full, unmodified [Master Resume]**, the task is considered a failure. You **MUST** omit large sections and specific bullet points that are not directly relevant to the [Job Title] and [Responsibilities].
* **Format Duplication:** The final output **MUST EXACTLY MATCH THE ORIGINAL FORMATTING, STYLE, AND SECTION HEADINGS** of the provided **[Master Resume]**. Pay close attention to spacing, bullet styles, and font treatments (bolding, italics).
* **New Content Prohibition:** You **MUST NOT** add any bullet points, sections, or text (such as "Narrative Focus," "Strategy Summary," or "Key Theme") that are derived from the **[Narrative Strategy]** input. The narrative strategy is for **guidance only** on *which* existing bullet points to select and *how* to order them, **not** for content creation.
* **Content Purity:** Only content that exists within the **[Master Resume]** may be used.
* **Output Purity:** The final output must be **only the resume**. **ABSOLUTELY NO** notes, comments, explanations, or introductory text should be included before or after the resume.

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

Synthesize the final, formatted, and targeted resume now.`,

      coverLetter: `
**Role:** You are an expert career counselor specializing in crafting high-impact, persuasive, and perfectly tailored cover letters.

**Task:** Synthesize a complete, professional, and ready-to-send cover letter.

**Process:**
1.  **Analyze & Extract:** Critically analyze the **Job Listing** inputs ([Job Title], [Responsibilities], [Requirements], [About the job], [About the company]).
2.  **Select & Match:** Scan the **[Master Resume]** and select only the **most relevant and quantifiable achievements** that directly align with the job's needs.
3.  **Implement Strategy:** **STRICTLY ADHERE** to the tone, focus, and structure defined in the **[Narrative Strategy]**.
4.  **Refine (Optional):** Use the **[Current Draft]** only for reference or to ensure improvements are made, but produce a final, polished version.

**Constraints:**
* **Format:** The final output must be **only the cover letter**, professionally formatted (business letter style).
* **Target:** Address the letter to a **Hiring Team** or **Hiring Manager** (e.g., "Dear [Company] Hiring Team,").
* **No Placeholders:** **ABSOLUTELY NO** placeholder text (e.g., [Hiring Manager Name], [Your Name], [Date]). Use the actual inputs provided.

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

Synthesize the final, polished cover letter now.`
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
