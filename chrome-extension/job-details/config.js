// Configuration and constants for job details viewer

// Status progression order for state-based navigation
export const statusOrder = [
  'Saved',
  'Drafting',
  'Applied',
  'Screening',
  'Interviewing',
  'Offer',
  'Accepted',
  'Rejected',
  'Withdrawn'
];

// Progress bar visual configuration for each status
export const progressConfig = {
  'Saved': { fill: 0, color: '#e0e0e0', textColor: '#666' },
  'Drafting': { fill: 20, color: '#4caf50', textColor: '#fff' },
  'Applied': { fill: 40, color: '#2196f3', textColor: '#fff' },
  'Screening': { fill: 60, color: '#9c27b0', textColor: '#fff' },
  'Interviewing': { fill: 80, color: '#ff9800', textColor: '#fff' },
  'Offer': { fill: 100, color: '#f44336', textColor: '#fff' },
  'Accepted': { fill: 100, color: '#4caf50', textColor: '#fff' },
  'Rejected': { fill: 100, color: '#f44336', textColor: '#fff' },
  'Withdrawn': { fill: 100, color: '#757575', textColor: '#fff' }
};

// Navigation button configuration for each status
export function getNavigationButtons(status) {
  const buttons = { left: null, right: [] };
  
  switch(status) {
    case 'Saved':
      buttons.right = [{ label: 'Draft', target: 'Drafting' }];
      break;
    
    case 'Drafting':
      buttons.left = { label: 'Saved', target: 'Saved' };
      buttons.right = [{ label: 'Applied', target: 'Applied' }];
      break;
    
    case 'Applied':
      buttons.left = { label: 'Drafting', target: 'Drafting' };
      buttons.right = [{ label: 'Screening', target: 'Screening' }];
      break;
    
    case 'Screening':
      buttons.left = { label: 'Applied', target: 'Applied' };
      buttons.right = [{ label: 'Interviewing', target: 'Interviewing' }];
      break;
    
    case 'Interviewing':
      buttons.left = { label: 'Screening', target: 'Screening' };
      buttons.right = [{ label: 'Offer', target: 'Offer' }];
      break;
    
    case 'Offer':
      buttons.left = { label: 'Interviewing', target: 'Interviewing' };
      buttons.right = [
        { label: 'Accepted', target: 'Accepted' },
        { label: 'Rejected', target: 'Rejected' }
      ];
      break;
    
    case 'Accepted':
      buttons.left = { label: 'Offer', target: 'Offer' };
      break;
    
    case 'Rejected':
      buttons.left = { label: 'Offer', target: 'Offer' };
      break;
    
    case 'Withdrawn':
      // For withdrawn, we need to figure out the previous state from history
      buttons.left = { label: 'Previous', target: 'Saved' }; // Default fallback
      break;
    
    default:
      // Default case: treat as 'Saved'
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

// Default values
export const defaults = {
  status: 'Saved',
  filters: {
    search: '',
    source: 'all',
    status: 'all',
    sort: 'newest'
  }
};
