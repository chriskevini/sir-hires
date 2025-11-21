// Shared utility functions for sir-hires Chrome extension

// ===========================
// HTML & Display Utilities
// ===========================

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - The text to escape
 * @returns {string} - HTML-safe text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===========================
// Date Formatting Utilities
// ===========================

/**
 * Format YYYY-MM-DD dates as absolute date strings (e.g., "Jan 15, 2025")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
function formatAbsoluteDate(dateString) {
  if (!dateString) return '';

  // If it's YYYY-MM-DD format, parse manually without timezone conversion
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  }

  // Fallback: return original string if format is unexpected
  return dateString;
}

/**
 * Format YYYY-MM-DD dates as relative time (e.g., "3 days ago", "In 5 days")
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Relative date string
 */
function formatRelativeDate(dateString) {
  if (!dateString) return '';

  // Parse YYYY-MM-DD manually to avoid timezone issues
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateString; // Fallback to original if format unexpected

  const [, year, month, day] = match;
  const jobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
  jobDate.setHours(0, 0, 0, 0);

  // Calculate difference in days
  const diffTime = jobDate - today;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Format based on difference
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  // Future dates (deadlines)
  if (diffDays > 0) {
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 14) return 'In 1 week';
    if (diffDays < 30) return `In ${Math.round(diffDays / 7)} weeks`;
    if (diffDays < 60) return 'In 1 month';
    if (diffDays < 365) return `In ${Math.round(diffDays / 30)} months`;
    return `In ${Math.round(diffDays / 365)} years`;
  }

  // Past dates (posted dates)
  const absDays = Math.abs(diffDays);
  if (absDays < 7) return `${absDays} days ago`;
  if (absDays < 14) return '1 week ago';
  if (absDays < 30) return `${Math.round(absDays / 7)} weeks ago`;
  if (absDays < 60) return '1 month ago';
  if (absDays < 365) return `${Math.round(absDays / 30)} months ago`;
  return `${Math.round(absDays / 365)} years ago`;
}

/**
 * Format date for display (uses browser's locale)
 * @param {string} dateString - Date string (YYYY-MM-DD or ISO timestamp)
 * @returns {string} - Localized date string
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    // If it's YYYY-MM-DD format, parse as local date to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString();
    }
    // Otherwise parse normally (for ISO timestamps with time)
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
}

/**
 * Convert ISO timestamp to YYYY-MM-DD for date input
 * @param {string} dateString - ISO timestamp or YYYY-MM-DD
 * @returns {string} - YYYY-MM-DD format
 */
function isoToDateInput(dateString) {
  if (!dateString) return '';

  // If it's already YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  // If it's an ISO timestamp, extract the date part without timezone conversion
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
    return dateString.split('T')[0];
  }

  return '';
}

/**
 * Keep date input (YYYY-MM-DD) as-is
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - YYYY-MM-DD format (validated)
 */
function dateInputToISO(dateString) {
  if (!dateString) return '';

  // Validate YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }

  return '';
}

// ===========================
// Job-Specific Utilities
// ===========================

/**
 * Get icon for remote work type
 * @param {string} remoteType - Remote type (Remote, Hybrid, On-site)
 * @returns {string} - Emoji icon
 */
function getRemoteIcon(remoteType) {
  const icons = {
    Remote: '🏠',
    Hybrid: '🔄',
    'On-site': '🏢',
  };
  return icons[remoteType] || '📍';
}

/**
 * Generate unique job ID
 * @returns {string} - Unique job ID
 */
function generateJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Normalize URL for comparison (removes query params and trailing slash)
 * @param {string} url - URL to normalize
 * @returns {string} - Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    // Keep protocol, host, and pathname, ignore search params and hash
    return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
  } catch {
    return url.trim().toLowerCase();
  }
}

// ===========================
// Toast Notification System
// ===========================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, warning, info)
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('Toast element not found in DOM');
    return;
  }

  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  // Auto-hide after 4 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

/**
 * Show success toast
 * @param {string} message - Success message
 */
function showSuccess(message) {
  showToast(message, 'success');
}

/**
 * Show error toast
 * @param {string} message - Error message
 */
function showError(message) {
  showToast(message, 'error');
}

/**
 * Show warning toast
 * @param {string} message - Warning message
 */
function showWarning(message) {
  showToast(message, 'warning');
}

/**
 * Show info toast
 * @param {string} message - Info message
 */
function showInfo(message) {
  showToast(message, 'info');
}

// ===========================
// Status Display System
// ===========================

/**
 * Show status message (alternative to toast, uses #status element)
 * @param {string} message - Message to display
 * @param {string} type - Type of status (success, error, warning, info)
 */
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) {
    console.warn('Status element not found in DOM');
    return;
  }

  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => hideStatus(), 5000);
  }
}

/**
 * Hide status message
 */
function hideStatus() {
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.classList.add('hidden');
  }
}
