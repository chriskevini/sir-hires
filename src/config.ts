// Configuration and constants for job details viewer
// Schema version: 0.3.0

import { jobExtraction, profileExtraction, synthesis } from './tasks';

// Re-export types from tasks for backward compatibility
export type {
  StorageContextType,
  RuntimeContextType,
  ContextType,
  TaskConfig,
} from './tasks';

// =============================================================================
// Status Configuration (Single Source of Truth)
// =============================================================================
// All status-related data in one place. To add a new status:
// 1. Add entry to `statuses` array below
// 2. Add CSS variable in globals.css (--status-{kebab-name})
// 3. Add navigation buttons in getNavigationButtons() if needed
// 4. Add checklist items in checklistTemplates if needed

export interface StatusConfig {
  name: string;
  fill: number; // Progress bar percentage (0-100)
  terminal: boolean; // Whether this is an end state
}

export const statuses: readonly StatusConfig[] = [
  { name: 'Researching', fill: 0, terminal: false },
  { name: 'Drafting', fill: 15, terminal: false },
  { name: 'Awaiting Review', fill: 35, terminal: false },
  { name: 'Interviewing', fill: 60, terminal: false },
  { name: 'Deciding', fill: 85, terminal: false },
  { name: 'Accepted', fill: 100, terminal: true },
  { name: 'Rejected', fill: 100, terminal: true },
  { name: 'Withdrawn', fill: 100, terminal: true },
] as const;

// Utility: convert status name to kebab-case for CSS variable lookup
const toKebabCase = (s: string): string => s.toLowerCase().replace(/\s+/g, '-');

// Utility: normalize status name (capitalize each word)
const normalizeStatus = (status: string): string =>
  status
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

// Derived arrays (backward compatible exports)
export const statusOrder = statuses.map((s) => s.name);
export const terminalStates = statuses
  .filter((s) => s.terminal)
  .map((s) => s.name);

// Default status config (fallback)
const defaultStatus = statuses[0];

/**
 * Get full status configuration by name
 */
export const getStatusConfig = (status: string): StatusConfig => {
  const normalized = normalizeStatus(status);
  return statuses.find((s) => s.name === normalized) ?? defaultStatus;
};

/**
 * Get status color as CSS variable reference
 * Returns: 'var(--status-researching)', 'var(--status-awaiting-review)', etc.
 */
export const getStatusColor = (status: string): string => {
  const config = getStatusConfig(status);
  return `var(--status-${toKebabCase(config.name)})`;
};

/**
 * Get status progress bar fill percentage (0-100)
 */
export const getStatusFill = (status: string): number => {
  return getStatusConfig(status).fill;
};

/**
 * Get status background color with 20% opacity (for cards, highlights)
 */
export const getStatusBackground = (status: string): string => {
  return `color-mix(in srgb, ${getStatusColor(status)} 20%, transparent)`;
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

// Terminal states - now derived from statuses array above

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

// LLM Configuration Interface
export interface LLMConfig {
  // Global Client Settings (shared across all tasks)
  endpoint: string; // http://localhost:1234/v1/chat/completions
  modelsEndpoint: string; // http://localhost:1234/v1/models
  model: string; // Default model for all tasks
  timeoutMs: number; // 60000
  timeoutSeconds: number; // Calculated from timeoutMs

  // Task-Specific Parameters (imported from tasks/)
  jobExtraction: typeof jobExtraction;
  profileExtraction: typeof profileExtraction;
  synthesis: typeof synthesis;
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

  // Task configurations imported from src/tasks/
  jobExtraction: jobExtraction,
  profileExtraction: profileExtraction,
  synthesis: synthesis,
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
