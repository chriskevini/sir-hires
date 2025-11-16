// View for "Researching" state - displays full job details with notes and narrative strategy
import { BaseView } from '../base-view.js';
import { EditableSection } from '../components/editable-section.js';

export class ResearchingView extends BaseView {
  constructor() {
    super();
    this.editableSections = [];
  }

  /**
   * Render the Researching state view
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job in allJobs array
   * @returns {string} HTML string
   */
  render(job, index) {
    // Clear previous editable sections
    this.editableSections = [];

    return `
      <div class="job-card">
        <div class="detail-panel-content">
          ${this.renderJobHeader(job)}
          ${this.renderJobMeta(job)}
          ${this.renderJobSections(job, index)}
          ${this.renderNotesSection(job, index)}
          ${this.renderNarrativeSection(job, index)}
          ${this.renderJobActions(job, index)}
        </div>
      </div>
    `;
  }

  /**
   * Render job detail sections (About, Company, Responsibilities, Requirements)
   * Now with inline editing support!
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderJobSections(job, index) {
    const sections = [];
    const sectionsData = [
      { field: 'aboutJob', title: 'About the Job', value: job.aboutJob },
      { field: 'aboutCompany', title: 'About the Company', value: job.aboutCompany },
      { field: 'responsibilities', title: 'Responsibilities', value: job.responsibilities },
      { field: 'requirements', title: 'Requirements', value: job.requirements }
    ];

    sectionsData.forEach(({ field, title, value }) => {
      if (value) {
        const editableSection = new EditableSection({
          fieldName: field,
          value: value,
          title: title,
          onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue),
          readonly: false
        });
        
        this.editableSections.push({ component: editableSection, field });
        sections.push(editableSection.render());
      }
    });

    return sections.join('');
  }

  /**
   * Render notes section with inline editing
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderNotesSection(job, index) {
    const editableSection = new EditableSection({
      fieldName: 'notes',
      value: job.notes || '',
      title: 'Notes',
      placeholder: 'Click to add your notes about this job...',
      onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue),
      readonly: false
    });
    
    this.editableSections.push({ component: editableSection, field: 'notes' });
    return editableSection.render();
  }

  /**
   * Render narrative strategy section with inline editing
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderNarrativeSection(job, index) {
    const editableSection = new EditableSection({
      fieldName: 'narrativeStrategy',
      value: job.narrativeStrategy || '',
      title: 'Narrative Strategy',
      placeholder: 'Click to add how to tailor your resume/cover letter for this job...',
      onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue),
      readonly: false
    });
    
    this.editableSections.push({ component: editableSection, field: 'narrativeStrategy' });
    return editableSection.render();
  }

  /**
   * Attach event listeners for editable sections and buttons
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  attachListeners(container, job, index) {
    // Attach listeners for all editable sections
    this.editableSections.forEach(({ component, field }) => {
      const sectionElement = container.querySelector(`.editable-section[data-field="${field}"]`);
      if (sectionElement) {
        component.attachListeners(sectionElement);
      }
    });

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
   * Handle save field - dispatches custom event for app to handle
   * @param {number} index - The global index of the job
   * @param {string} fieldName - The field name being saved
   * @param {string} newValue - The new value
   * @returns {Promise} Promise that resolves when save is complete
   */
  async handleSaveField(index, fieldName, newValue) {
    // Dispatch custom event for parent to handle
    const event = new CustomEvent('view:saveField', {
      detail: { index, fieldName, value: newValue }
    });
    document.dispatchEvent(event);
    
    // Return a promise that resolves after a short delay
    // This gives the storage time to update
    return new Promise((resolve) => setTimeout(resolve, 100));
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

  /**
   * Cleanup - remove event listeners and clean up editable sections
   */
  cleanup() {
    super.cleanup();
    
    // Cleanup all editable sections
    this.editableSections.forEach(({ component }) => {
      component.cleanup();
    });
    this.editableSections = [];
  }
}
