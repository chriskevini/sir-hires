// Sidebar component for rendering job list
// Self-contained: handles both rendering and event listeners

import { BaseView } from './base-view.js';

export class Sidebar extends BaseView {
  constructor() {
    super();
    this.onJobSelect = null; // Callback when job is selected
  }

  /**
   * Render the sidebar job list
   * @param {Array} jobs - Array of job objects (filtered)
   * @param {number} selectedIndex - Index of selected job in filtered array
   * @param {string} jobInFocusId - ID of job currently in focus
   * @returns {string} HTML string
   */
  render(jobs, selectedIndex = -1, jobInFocusId = null) {
    if (jobs.length === 0) {
      return '<div style="text-align: center; padding: 20px; color: #666; font-size: 13px;">No jobs found</div>';
    }

    return jobs.map((job, index) => 
      this.renderJobCard(job, index, selectedIndex, jobInFocusId)
    ).join('');
  }

  /**
   * Render a compact job card
   * @param {Object} job - The job object
   * @param {number} index - Index in filtered jobs array
   * @param {number} selectedIndex - Index of selected job
   * @param {string} jobInFocusId - ID of job in focus
   * @returns {string} HTML string
   */
  renderJobCard(job, index, selectedIndex, jobInFocusId) {
    const status = job.applicationStatus || 'Researching';
    const isActive = index === selectedIndex;
    const isFocused = job.id === jobInFocusId;

    return `
      <div class="job-card-compact ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}" data-index="${index}">
        <div class="job-card-header-compact">
          <div class="job-title-compact">${this.escapeHtml(job.jobTitle)}</div>
          ${isFocused ? '<span class="focus-indicator" title="Currently in focus">📌</span>' : ''}
        </div>
        <div class="company-compact">${this.escapeHtml(job.company)}</div>
        <div class="meta-compact">
          ${status !== 'Researching' ? `<span class="status-badge-compact status-${status.replace(/\s+/g, '-')}">${status}</span>` : ''}
          ${job.deadline ? `<span>⏰ ${this.escapeHtml(this.formatRelativeDate(job.deadline))}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Update the sidebar in the DOM
   * @param {HTMLElement} container - The sidebar container element
   * @param {Array} jobs - Array of job objects (filtered)
   * @param {number} selectedIndex - Index of selected job in filtered array
   * @param {string} jobInFocusId - ID of job currently in focus
   */
  update(container, jobs, selectedIndex = -1, jobInFocusId = null) {
    if (!container) {
      console.error('Sidebar container not found');
      return;
    }

    // Remove old listeners
    this.cleanup();

    // Render new HTML
    container.innerHTML = this.render(jobs, selectedIndex, jobInFocusId);

    // Attach new listeners
    this.attachListeners(container, jobs);
  }

  /**
   * Attach click event listeners to job cards
   * @param {HTMLElement} container - The sidebar container element
   * @param {Array} jobs - Array of job objects (filtered)
   */
  attachListeners(container, jobs) {
    const cards = container.querySelectorAll('.job-card-compact');
    
    cards.forEach((card, index) => {
      const clickHandler = () => {
        if (this.onJobSelect) {
          this.onJobSelect(index);
        }
      };
      this.trackListener(card, 'click', clickHandler);
    });
  }

  /**
   * Set callback for when a job is selected
   * @param {Function} callback - Function to call with (index) when job is selected
   */
  setOnJobSelect(callback) {
    this.onJobSelect = callback;
  }

  /**
   * Update active state without full re-render
   * @param {HTMLElement} container - The sidebar container element
   * @param {number} selectedIndex - Index of selected job
   */
  updateActiveState(container, selectedIndex) {
    const cards = container.querySelectorAll('.job-card-compact');
    cards.forEach((card, index) => {
      if (index === selectedIndex) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }
}
