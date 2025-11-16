// Main view coordinator - manages which view is displayed based on status
// Coordinates between state-specific views, sidebar, and navigation

import { ResearchingView } from './views/researching-view.js';
import { defaults } from './config.js';

export class MainView {
  constructor() {
    // View instances
    this.views = {
      'Researching': new ResearchingView(),
      // Other views would be added here as they're implemented:
      // 'Drafting': new DraftingView(),
      // 'Awaiting Review': new AwaitingReviewView(),
      // 'Interviewing': new InterviewingView(),
      // 'Deciding': new DecidingView(),
      // etc.
    };

    this.currentView = null;
    this.currentJob = null;
    this.currentIndex = -1;
  }

  /**
   * Render a job in the detail panel based on its status
   * @param {HTMLElement} container - The detail panel container
   * @param {Object} job - The job object to render
   * @param {number} index - Global index of the job in allJobs array
   */
  render(container, job, index) {
    if (!container) {
      console.error('MainView: Container element not found');
      return;
    }

    if (!job) {
      container.innerHTML = '<div class="detail-panel-empty">No job selected</div>';
      return;
    }

    const status = job.applicationStatus || defaults.status;

    // Get the appropriate view for this status
    const view = this.getViewForStatus(status);

    // Cleanup previous view if it exists
    if (this.currentView) {
      this.currentView.cleanup();
    }

    // Render the view
    const html = view.render(job, index);
    container.innerHTML = html;

    // Attach event listeners for the view
    view.attachListeners(container, job, index);

    // Store current state
    this.currentView = view;
    this.currentJob = job;
    this.currentIndex = index;
  }

  /**
   * Get the appropriate view instance for a given status
   * @param {string} status - The application status
   * @returns {BaseView} The view instance
   */
  getViewForStatus(status) {
    // Return specific view if available
    if (this.views[status]) {
      return this.views[status];
    }

    // Fallback to WIP view for unimplemented states
    if (!this.views._wip) {
      this.views._wip = this.createWIPView();
    }
    return this.views._wip;
  }

  /**
   * Create a work-in-progress view for unimplemented states
   * @returns {Object} A view-like object
   */
  createWIPView() {
    return {
      render: (job, index) => {
        const status = job.applicationStatus || 'Unknown';
        return `
          <div class="job-card">
            <div class="detail-panel-content">
              <div class="job-header">
                <div>
                  <div class="job-title">${this.escapeHtml(job.jobTitle)}</div>
                  <div class="company">${this.escapeHtml(job.company)}</div>
                </div>
                <div>
                  ${job.source ? `<span class="badge">${this.escapeHtml(job.source)}</span>` : ''}
                </div>
              </div>
              
              <div style="text-align: center; padding: 60px 20px; color: #666;">
                <div style="font-size: 48px; margin-bottom: 20px;">🚧</div>
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 10px;">
                  ${status} Panel - Work in Progress
                </div>
                <div style="font-size: 14px;">
                  This panel is coming soon!
                </div>
              </div>
              
              <div class="job-actions">
                ${job.url ? `<button class="btn btn-link" data-url="${this.escapeHtml(job.url)}">View Job Posting</button>` : ''}
                <button class="btn btn-delete" data-index="${index}">Delete</button>
              </div>
            </div>
          </div>
        `;
      },
      attachListeners: (container, job, index) => {
        // Handle view posting
        const viewBtn = container.querySelector('.btn-link');
        if (viewBtn) {
          viewBtn.addEventListener('click', () => {
            const event = new CustomEvent('view:openUrl', {
              detail: { url: job.url }
            });
            document.dispatchEvent(event);
          });
        }

        // Handle delete
        const deleteBtn = container.querySelector('.btn-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => {
            const event = new CustomEvent('view:deleteJob', {
              detail: { index }
            });
            document.dispatchEvent(event);
          });
        }
      },
      cleanup: () => {
        // No cleanup needed for WIP view (uses delegated listeners)
      }
    };
  }

  /**
   * Helper method to escape HTML
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
   * Get HTML for current job (used for animations)
   * @returns {string} HTML string
   */
  getCurrentHTML() {
    if (!this.currentJob || this.currentIndex === -1) {
      return '<div class="detail-panel-empty">No job selected</div>';
    }

    const status = this.currentJob.applicationStatus || defaults.status;
    const view = this.getViewForStatus(status);
    return view.render(this.currentJob, this.currentIndex);
  }

  /**
   * Reattach listeners after animation (when DOM is replaced)
   * @param {HTMLElement} container - The detail panel container
   */
  reattachListeners(container) {
    if (!this.currentView || !this.currentJob || this.currentIndex === -1) {
      return;
    }

    this.currentView.attachListeners(container, this.currentJob, this.currentIndex);
  }

  /**
   * Cleanup all views and listeners
   */
  cleanup() {
    if (this.currentView) {
      this.currentView.cleanup();
    }

    // Cleanup all view instances
    Object.values(this.views).forEach(view => {
      if (view && view.cleanup) {
        view.cleanup();
      }
    });

    this.currentView = null;
    this.currentJob = null;
    this.currentIndex = -1;
  }
}
