// View for "Researching" state - displays full job details with notes and narrative strategy
import { BaseView } from '../base-view.js';
import { EditableSection } from '../components/editable-section.js';
import { EditableMeta } from '../components/editable-meta.js';
import { EditableField } from '../components/editable-field.js';

export class ResearchingView extends BaseView {
  constructor() {
    super();
    this.editableSections = [];
    this.editableMetaItems = [];
    this.editableFields = [];
  }

  /**
   * Render the Researching state view
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job in allJobs array
   * @returns {string} HTML string
   */
  render(job, index) {
    // Clear previous editable components
    this.editableSections = [];
    this.editableMetaItems = [];
    this.editableFields = [];

    return `
      <div class="job-card">
        <div class="detail-panel-content">
          ${this.renderJobHeaderEditable(job, index)}
          ${this.renderJobMetaEditable(job, index)}
          ${this.renderJobSections(job, index)}
          ${this.renderNotesSection(job, index)}
          ${this.renderNarrativeSection(job, index)}
          ${this.renderJobActions(job, index)}
        </div>
      </div>
    `;
  }

  /**
   * Render job header with editable title and company
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderJobHeaderEditable(job, index) {
    // Create editable field for job title
    const jobTitleField = new EditableField({
      fieldName: 'jobTitle',
      value: job.jobTitle || 'Untitled Position',
      onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue),
      singleLine: true
    });
    this.editableFields.push({ component: jobTitleField, field: 'jobTitle' });
    
    // Create editable field for company
    const companyField = new EditableField({
      fieldName: 'company',
      value: job.company || 'Unknown Company',
      onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue),
      singleLine: true
    });
    this.editableFields.push({ component: companyField, field: 'company' });
    
    return `
      <div class="job-header">
        <div>
          <div class="job-title" data-field="jobTitle">${jobTitleField.render()}</div>
          <div class="company" data-field="company">${companyField.render()}</div>
        </div>
        <div>
          ${job.source ? `<span class="badge">${this.escapeHtml(job.source)}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render job metadata with editable fields
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderJobMetaEditable(job, index) {
    const metaItems = [];
    
    // Location
    const locationMeta = new EditableMeta({
      icon: '📍',
      label: 'Location',
      fieldName: 'location',
      value: job.location || '',
      type: 'text',
      onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue)
    });
    this.editableMetaItems.push({ component: locationMeta, field: 'location' });
    metaItems.push(locationMeta.render());
    
    // Salary
    const salaryMeta = new EditableMeta({
      icon: '💰',
      label: 'Salary',
      fieldName: 'salary',
      value: job.salary || '',
      type: 'text',
      onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue)
    });
    this.editableMetaItems.push({ component: salaryMeta, field: 'salary' });
    metaItems.push(salaryMeta.render());
    
    // Job Type
    if (job.jobType) {
      const jobTypeMeta = new EditableMeta({
        icon: '💼',
        label: 'Job Type',
        fieldName: 'jobType',
        value: job.jobType,
        type: 'text',
        onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue)
      });
      this.editableMetaItems.push({ component: jobTypeMeta, field: 'jobType' });
      metaItems.push(jobTypeMeta.render());
    }
    
    // Remote Type
    if (job.remoteType && job.remoteType !== 'Not specified') {
      const remoteTypeMeta = new EditableMeta({
        icon: this.getRemoteIcon(job.remoteType),
        label: 'Remote Type',
        fieldName: 'remoteType',
        value: job.remoteType,
        type: 'select',
        options: ['On-site', 'Remote', 'Hybrid'],
        onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue)
      });
      this.editableMetaItems.push({ component: remoteTypeMeta, field: 'remoteType' });
      metaItems.push(remoteTypeMeta.render());
    }
    
    // Posted Date
    if (job.postedDate) {
      const absolute = this.formatAbsoluteDate(job.postedDate);
      const relative = this.formatRelativeDate(job.postedDate);
      const postedDateMeta = new EditableMeta({
        icon: '📅',
        label: 'Posted',
        fieldName: 'postedDate',
        value: job.postedDate,
        type: 'date',
        onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue)
      });
      this.editableMetaItems.push({ component: postedDateMeta, field: 'postedDate' });
      metaItems.push(postedDateMeta.render());
    }
    
    // Deadline
    if (job.deadline) {
      const absolute = this.formatAbsoluteDate(job.deadline);
      const relative = this.formatRelativeDate(job.deadline);
      const deadlineMeta = new EditableMeta({
        icon: '⏰',
        label: 'Deadline',
        fieldName: 'deadline',
        value: job.deadline,
        type: 'date',
        onSave: (fieldName, newValue) => this.handleSaveField(index, fieldName, newValue)
      });
      this.editableMetaItems.push({ component: deadlineMeta, field: 'deadline' });
      metaItems.push(deadlineMeta.render());
    }
    
    if (metaItems.length === 0) return '';
    
    return `<div class="job-meta">${metaItems.join('')}</div>`;
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
    // Attach listeners for editable header fields (title and company)
    this.editableFields.forEach(({ component, field }) => {
      const wrapper = container.querySelector(`[data-field="${field}"]`);
      if (wrapper) {
        const editableSpan = wrapper.querySelector('.editable-field');
        const indicatorSpan = wrapper.querySelector('.save-indicator');
        component.attachListeners(editableSpan, indicatorSpan);
      }
    });

    // Attach listeners for all editable meta items
    this.editableMetaItems.forEach(({ component, field }) => {
      const metaElement = container.querySelector(`.editable-meta[data-field="${field}"]`);
      if (metaElement) {
        component.attachListeners(metaElement);
      }
    });

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
   * Cleanup - remove event listeners and clean up editable components
   */
  cleanup() {
    super.cleanup();
    
    // Cleanup all editable fields (title, company)
    this.editableFields.forEach(({ component }) => {
      component.cleanup();
    });
    this.editableFields = [];
    
    // Cleanup all editable meta items
    this.editableMetaItems.forEach(({ component }) => {
      component.cleanup();
    });
    this.editableMetaItems = [];
    
    // Cleanup all editable sections
    this.editableSections.forEach(({ component }) => {
      component.cleanup();
    });
    this.editableSections = [];
  }
}
