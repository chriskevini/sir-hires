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
  'Researching': { fill: 0, color: '#e0e0e0', textColor: '#666' },
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
  
  switch(status) {
    case 'Researching':
      buttons.right = [{ label: 'Draft', target: 'Drafting' }];
      break;
    
    case 'Drafting':
      buttons.left = { label: 'Researching', target: 'Researching' };
      buttons.right = [{ label: 'Awaiting Review', target: 'Awaiting Review' }];
      break;
    
    case 'Awaiting Review':
      buttons.left = { label: 'Drafting', target: 'Drafting' };
      buttons.right = [{ label: 'Interviewing', target: 'Interviewing' }];
      break;
    
    case 'Interviewing':
      buttons.left = { label: 'Awaiting Review', target: 'Awaiting Review' };
      buttons.right = [{ label: 'Deciding', target: 'Deciding' }];
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
      buttons.right = [{ label: 'Draft', target: 'Drafting' }];
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
