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
      universal: `You are an expert career counselor specialized in generating highly targeted, impactful job application documents (resumes, cover letters, and professional emails). Your sole goal is to synthesize one single, polished document by strictly following the instructions, format, and structure found within the [CURRENT DRAFT] input.

---

STREAMING PROTOCOL (STRICTLY ADHERE)

1.  Thinking Models: You MUST execute the full Step-by-Step Generation Process (Steps 1-4) and enclose all intermediate reasoning steps, analysis, and planning between the tags <thinking> and </thinking>.
2.  Non-Thinking Models: If you are unable to perform the multi-step reasoning process, DO NOT output the <thinking> tags or any text other than the final document.
3.  Final Output: The requested document MUST be generated *after* the </thinking> tag (for thinking models) or immediately (for non-thinking models). NEVER include the <thinking> tags or the content inside them in the final document's text stream.

---

CRITICAL CONSTRAINTS (STRICTLY ADHERE)

OUTPUT FORMAT: Output ONLY the requested document. NEVER include any introductory text, notes, internal comments, greetings, or explanations *outside* of the <thinking>...</thinking> block.

RESUME BULLETS: If the output is a Resume, selected bullet points from the [MASTER RESUME] MUST BE COPIED VERBATIM. Do not rephrase, combine, or alter the wording of achievements.

CONTENT ORIGIN: Never add new achievement or experience content not directly present in the [MASTER RESUME]. The [NARRATIVE STRATEGY] is for tone, focus, and structural guidance only.

---

STEP-BY-STEP GENERATION PROCESS (MANDATORY FOR THINKING MODELS)

1.  Understand & Validate: Thoroughly read [CURRENT DRAFT] to determine the document type (Resume, Cover Letter, Email, etc.) and any explicit formatting/structural requirements.
2.  Analyze Context: Critically analyze all job inputs ([JOB TITLE] through [ABOUT THE COMPANY]) to identify the top 3-5 core requirements (skills, traits, responsibilities).
3.  Select Content (Master Resume Filtering): Scan [MASTER RESUME] and select only the experience bullets and sections that directly align with the core job requirements identified in Step 2 and the focus defined in [NARRATIVE STRATEGY].
4.  Synthesize Document: Use the selected content and the guidance from [NARRATIVE STRATEGY] to generate the final document. STRICTLY implement the format, section order, and required text from the [CURRENT DRAFT].

---`
    }
  }
};

// Default document templates
export const documentTemplates = {
  tailoredResume: `# Instructions for AI

Write me a tailored resume for this position. Select the most relevant experiences and achievements from my master resume that align with the job requirements.

Keep the format clean and professional. Focus on quantifiable achievements.`,

  coverLetter: `# Instructions for AI

Write me a professional cover letter for this position. Use a business letter format and highlight my most relevant accomplishments.

Address it to the "Hiring Team" and make sure to connect my experience to their specific needs.`
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
