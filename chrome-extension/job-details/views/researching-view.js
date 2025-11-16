// View for "Saved" state - displays full job details with notes and narrative strategy
import { BaseView } from '../base-view.js';

export class ResearchingView extends BaseView {
  /**
   * Render the Saved state view
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job in allJobs array
   * @returns {string} HTML string
   */
  render(job, index) {
    return `
      <div class="job-card">
        <div class="detail-panel-content">
          ${this.renderJobHeader(job)}
          ${this.renderJobMeta(job)}
          ${this.renderJobSections(job)}
          ${this.renderNotesSection(job, index)}
          ${this.renderNarrativeSection(job, index)}
          ${this.renderJobActions(job, index)}
        </div>
      </div>
    `;
  }

  /**
   * Render job detail sections (About, Company, Responsibilities, Requirements)
   * @param {Object} job - The job object
   * @returns {string} HTML string
   */
  renderJobSections(job) {
    const sections = [];

    if (job.aboutJob) {
      sections.push(`
        <div class="section">
          <div class="section-title">About the Job</div>
          <div class="section-content">
            ${this.escapeHtml(job.aboutJob)}
          </div>
        </div>
      `);
    }

    if (job.aboutCompany) {
      sections.push(`
        <div class="section">
          <div class="section-title">About the Company</div>
          <div class="section-content">
            ${this.escapeHtml(job.aboutCompany)}
          </div>
        </div>
      `);
    }

    if (job.responsibilities) {
      sections.push(`
        <div class="section">
          <div class="section-title">Responsibilities</div>
          <div class="section-content">
            ${this.escapeHtml(job.responsibilities)}
          </div>
        </div>
      `);
    }

    if (job.requirements) {
      sections.push(`
        <div class="section">
          <div class="section-title">Requirements</div>
          <div class="section-content">
            ${this.escapeHtml(job.requirements)}
          </div>
        </div>
      `);
    }

    return sections.join('');
  }

  /**
   * Render notes section with textarea
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderNotesSection(job, index) {
    return `
      <div class="section">
        <div class="section-title">Notes</div>
        <textarea class="notes-textarea" id="notes-textarea-${index}" rows="3" placeholder="Add your notes about this job...">${this.escapeHtml(job.notes || '')}</textarea>
        <button class="btn-save-notes" data-index="${index}">Save Notes</button>
      </div>
    `;
  }

  /**
   * Render narrative strategy section with textarea
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderNarrativeSection(job, index) {
    return `
      <div class="section">
        <div class="section-title">Narrative Strategy</div>
        <textarea class="notes-textarea" id="narrative-textarea-${index}" rows="3" placeholder="How to tailor your resume/cover letter for this job...">${this.escapeHtml(job.narrativeStrategy || '')}</textarea>
        <button class="btn-save-narrative" data-index="${index}">Save Strategy</button>
      </div>
    `;
  }

  /**
   * Attach event listeners for notes and narrative buttons
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  attachListeners(container, job, index) {
    // Save notes button
    const saveNotesBtn = container.querySelector('.btn-save-notes');
    if (saveNotesBtn) {
      const saveNotesHandler = () => this.handleSaveNotes(index);
      this.trackListener(saveNotesBtn, 'click', saveNotesHandler);
    }

    // Save narrative button
    const saveNarrativeBtn = container.querySelector('.btn-save-narrative');
    if (saveNarrativeBtn) {
      const saveNarrativeHandler = () => this.handleSaveNarrative(index);
      this.trackListener(saveNarrativeBtn, 'click', saveNarrativeHandler);
    }

    // View job posting button (handled by parent)
    const viewPostingBtn = container.querySelector('.btn-link');
    if (viewPostingBtn) {
      const viewPostingHandler = () => this.handleViewPosting(job.url);
      this.trackListener(viewPostingBtn, 'click', viewPostingHandler);
    }

    // Delete button (handled by parent)
    const deleteBtn = container.querySelector('.btn-delete');
    if (deleteBtn) {
      const deleteHandler = () => this.handleDelete(index);
      this.trackListener(deleteBtn, 'click', deleteHandler);
    }
  }

  /**
   * Handle save notes button click
   * @param {number} index - The global index of the job
   */
  async handleSaveNotes(index) {
    const textarea = document.getElementById(`notes-textarea-${index}`);
    if (!textarea) return;

    const notes = textarea.value.trim();

    // Dispatch custom event for parent to handle
    const event = new CustomEvent('view:saveNotes', {
      detail: { index, notes }
    });
    document.dispatchEvent(event);
  }

  /**
   * Handle save narrative button click
   * @param {number} index - The global index of the job
   */
  async handleSaveNarrative(index) {
    const textarea = document.getElementById(`narrative-textarea-${index}`);
    if (!textarea) return;

    const narrativeStrategy = textarea.value.trim();

    // Dispatch custom event for parent to handle
    const event = new CustomEvent('view:saveNarrative', {
      detail: { index, narrativeStrategy }
    });
    document.dispatchEvent(event);
  }

  /**
   * Handle view posting button click
   * @param {string} url - The job posting URL
   */
  handleViewPosting(url) {
    if (url) {
      const event = new CustomEvent('view:openUrl', {
        detail: { url }
      });
      document.dispatchEvent(event);
    }
  }

  /**
   * Handle delete button click
   * @param {number} index - The global index of the job
   */
  handleDelete(index) {
    const event = new CustomEvent('view:deleteJob', {
      detail: { index }
    });
    document.dispatchEvent(event);
  }
}
