// Base class for all state-specific views
// Provides common utilities and lifecycle methods

export class BaseView {
  constructor() {
    this.listeners = []; // Track event listeners for cleanup
  }

  /**
   * Render the view - must be implemented by subclasses
   * @param {Object} job - The job object to render
   * @param {number} index - The global index of the job in allJobs array
   * @returns {string} HTML string
   */
  render(job, index) {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Attach event listeners after render - must be implemented by subclasses
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  attachListeners(container, job, index) {
    // Default: no listeners (subclass can override)
  }

  /**
   * Cleanup - remove event listeners and do any teardown
   */
  cleanup() {
    // Remove all tracked event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }

  /**
   * Track an event listener for cleanup
   * @param {HTMLElement} element - The element to attach to
   * @param {string} event - The event name
   * @param {Function} handler - The event handler
   */
  trackListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push({ element, event, handler });
  }

  // --- Common utility methods used by all views ---

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format date in absolute format (e.g., "Jan 15, 2025")
   * @param {string} dateString - ISO date string (YYYY-MM-DD)
   * @returns {string} Formatted date
   */
  formatAbsoluteDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString + 'T00:00:00'); // Parse as local date
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Format date relative to today (e.g., "3 days ago", "in 5 days")
   * @param {string} dateString - ISO date string (YYYY-MM-DD)
   * @returns {string} Relative date string
   */
  formatRelativeDate(dateString) {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const diffTime = date - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays > 1) return `in ${diffDays} days`;
      if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
      
      return this.formatAbsoluteDate(dateString);
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Get icon for remote type
   * @param {string} remoteType - The remote type
   * @returns {string} Emoji icon
   */
  getRemoteIcon(remoteType) {
    const icons = {
      'Remote': '🏠',
      'Hybrid': '🏢🏠',
      'On-site': '🏢',
      'Not specified': ''
    };
    return icons[remoteType] || '💻';
  }

  /**
   * Convert markdown to HTML (simple implementation)
   * @param {string} text - Markdown text
   * @returns {string} HTML
   */
  markdownToHtml(text) {
    if (!text) return '';
    
    let html = this.escapeHtml(text);
    
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    
    // Wrap in paragraphs if not empty
    if (html.trim()) {
      html = `<p>${html}</p>`;
    }
    
    return html;
  }

  /**
   * Render common job header
   * @param {Object} job - The job object
   * @returns {string} HTML string for job header
   */
  renderJobHeader(job) {
    return `
      <div class="job-header">
        <div>
          <div class="job-title">${this.escapeHtml(job.jobTitle)}</div>
          <div class="company">${this.escapeHtml(job.company)}</div>
        </div>
        <div>
          ${job.source ? `<span class="badge">${this.escapeHtml(job.source)}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render common job metadata row
   * @param {Object} job - The job object
   * @returns {string} HTML string for job metadata
   */
  renderJobMeta(job) {
    const items = [];
    
    if (job.location) {
      items.push(`<div class="job-meta-item">📍 ${this.escapeHtml(job.location)}</div>`);
    }
    
    if (job.salary) {
      items.push(`<div class="job-meta-item">💰 ${this.escapeHtml(job.salary)}</div>`);
    }
    
    if (job.jobType) {
      items.push(`<div class="job-meta-item">💼 ${this.escapeHtml(job.jobType)}</div>`);
    }
    
    if (job.remoteType && job.remoteType !== 'Not specified') {
      items.push(`<div class="job-meta-item">${this.getRemoteIcon(job.remoteType)} ${this.escapeHtml(job.remoteType)}</div>`);
    }
    
    if (job.postedDate) {
      const absolute = this.formatAbsoluteDate(job.postedDate);
      const relative = this.formatRelativeDate(job.postedDate);
      items.push(`<div class="job-meta-item">📅 Posted: <span title="${this.escapeHtml(absolute)}">${this.escapeHtml(relative)}</span></div>`);
    }
    
    if (job.deadline) {
      const absolute = this.formatAbsoluteDate(job.deadline);
      const relative = this.formatRelativeDate(job.deadline);
      items.push(`<div class="job-meta-item">⏰ Deadline: <span title="${this.escapeHtml(absolute)}">${this.escapeHtml(relative)}</span></div>`);
    }
    
    if (items.length === 0) return '';
    
    return `<div class="job-meta">${items.join('')}</div>`;
  }

  /**
   * Render common job actions (view posting, delete)
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string for job actions
   */
  renderJobActions(job, index) {
    return `
      <div class="job-actions">
        ${job.url ? `<button class="btn btn-link" data-url="${this.escapeHtml(job.url)}">View Job Posting</button>` : ''}
        <button class="btn btn-delete" data-index="${index}">Delete</button>
      </div>
    `;
  }
}
