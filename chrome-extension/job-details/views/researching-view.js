// View for "Researching" state - Job markdown editor with template and validation
import { BaseView } from '../base-view.js';
import { ChecklistComponent } from '../components/checklist.js';

export class ResearchingView extends BaseView {
  constructor() {
    super();
    this.checklistComponent = new ChecklistComponent();
    this.validationDebounceTimer = null;
    this.isValidationPanelCollapsed = true;
    this.currentValidation = null;
    this.isTemplateVisible = false;
  }

  /**
   * Render the Researching state view with markdown editor
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job in allJobs array
   * @returns {string} HTML string
   */
  render(job, index) {
    // Check if job is currently being extracted (streaming in progress)
    const isExtracting = !!job.isExtracting;
    
    if (isExtracting) {
      return this.renderExtractionState(job, index);
    }
    
    // Check if job has extraction error
    if (job.extractionError) {
      return this.renderExtractionError(job, index);
    }
    
    // Check if job has content field (new format)
    const hasContent = job.content && job.content.trim().length > 0;
    
    if (!hasContent) {
      return this.renderMigrationPrompt(job, index);
    }

    return `
      <div class="job-card researching-editor">
        <div class="editor-layout">
          <!-- Template Panel (Left, collapsible) -->
          <div id="templatePanel" class="template-panel ${this.isTemplateVisible ? '' : 'hidden'}">
            <div class="template-panel-header">
              <h3>📖 Job Template</h3>
              <button class="template-panel-close" data-action="closeTemplate">✕</button>
            </div>
            <div class="template-content">${this.escapeHtml(this.getJobTemplate())}</div>
          </div>

          <!-- Editor Panel (Middle) -->
          <div class="editor-panel">
            <div class="editor-header">
              <div class="editor-title">
                <strong>${this.escapeHtml(job.jobTitle || 'Untitled Position')}</strong> at ${this.escapeHtml(job.company || 'Unknown Company')}
              </div>
              <div class="editor-actions">
                <button class="btn-template-toggle" data-action="toggleTemplate">
                  ${this.isTemplateVisible ? 'Hide' : 'Show'} Template
                </button>
                ${job.url ? `<a href="${this.escapeHtml(job.url)}" class="btn-link" target="_blank" rel="noopener noreferrer">View Original ↗</a>` : ''}
              </div>
            </div>
            <textarea id="jobEditor" class="job-markdown-editor" data-index="${index}">${this.escapeHtml(job.content)}</textarea>
          </div>
        </div>

        <!-- Validation Panel (Bottom, collapsible) -->
        <div id="validationPanel" class="validation-panel ${this.isValidationPanelCollapsed ? 'collapsed' : ''}">
          <div class="validation-header" data-action="toggleValidation">
            <div class="validation-header-left">
              <div class="validation-status">
                <span id="statusIcon" class="status-icon">⏳</span>
                <span id="statusText">Validating...</span>
              </div>
              <div id="validationCounts" class="validation-counts"></div>
            </div>
            <span class="validation-toggle">${this.isValidationPanelCollapsed ? '▼' : '▲'}</span>
          </div>
          <div id="validationContent" class="validation-content">
            <div class="validation-empty">Validation results will appear here...</div>
          </div>
        </div>

        <!-- Actions -->
        <div class="job-actions">
          <button class="btn btn-delete" data-index="${index}">Delete Job</button>
        </div>
      </div>
    `;
  }

  /**
   * Render extraction state UI (streaming in progress)
   */
  renderExtractionState(job, index) {
    // Show partial content if any chunks have arrived
    const partialContent = job.content || '';
    const hasPartialContent = partialContent.trim().length > 0;

    return `
      <div class="job-card researching-editor">
        <div class="extraction-state">
          <div class="extraction-header">
            <div class="extraction-spinner">⏳</div>
            <h3>Extracting Job Information...</h3>
            <p>The LLM is analyzing the job posting and generating structured data.</p>
          </div>
          
          ${hasPartialContent ? `
            <div class="extraction-preview">
              <div class="extraction-preview-header">
                <strong>📄 Preview (Streaming)</strong>
              </div>
              <div class="extraction-preview-content">${this.escapeHtml(partialContent)}</div>
            </div>
          ` : `
            <div class="extraction-waiting">
              <p>Waiting for first response from LLM...</p>
            </div>
          `}
          
          <div class="job-actions" style="margin-top: 24px;">
            <button class="btn btn-delete" data-index="${index}">Cancel & Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render extraction error state
   */
  renderExtractionError(job, index) {
    const partialContent = job.content || '';
    const hasPartialContent = partialContent.trim().length > 0;

    return `
      <div class="job-card researching-editor">
        <div class="extraction-error-state">
          <div class="extraction-error-header">
            <div class="extraction-error-icon">⚠️</div>
            <h3>Extraction Failed</h3>
            <p class="error-message">${this.escapeHtml(job.extractionError)}</p>
          </div>
          
          ${hasPartialContent ? `
            <div class="extraction-partial">
              <div class="extraction-partial-header">
                <strong>📄 Partial Content</strong>
                <span class="extraction-partial-hint">(You can edit this or re-extract)</span>
              </div>
              <textarea id="jobEditor" class="job-markdown-editor" data-index="${index}">${this.escapeHtml(partialContent)}</textarea>
            </div>
          ` : ''}
          
          <div class="job-actions" style="margin-top: 24px;">
            ${job.url ? `
              <a href="${this.escapeHtml(job.url)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
                Retry Extraction ↗
              </a>
            ` : ''}
            <button class="btn btn-delete" data-index="${index}">Delete Job</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render migration prompt for old jobs without content field
   */
  renderMigrationPrompt(job, index) {
    return `
      <div class="job-card">
        <div class="migration-prompt">
          <div class="migration-icon">⚠️</div>
          <h3>Job Needs Re-Extraction</h3>
          <p>This job was saved in an old format and needs to be re-extracted from the job posting.</p>
          ${job.url ? `
            <div class="migration-actions">
              <a href="${this.escapeHtml(job.url)}" class="btn btn-primary" target="_blank" rel="noopener noreferrer">
                Re-Extract from Original Posting ↗
              </a>
            </div>
          ` : `
            <p class="migration-note">Unfortunately, the original job posting URL is not available. You may need to delete this job and extract it again if you can find the posting.</p>
          `}
          <div class="job-actions" style="margin-top: 24px;">
            <button class="btn btn-delete" data-index="${index}">Delete This Job</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Get the job template string
   */
  getJobTemplate() {
    return `<JOB>
TITLE: Senior Cloud Infrastructure Engineer // required
COMPANY: Stellar Innovations Inc. // required
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID // [ONSITE|REMOTE|HYBRID]
SALARY_RANGE_MIN: 100,000
SALARY_RANGE_MAX: 150,000
EMPLOYMENT_TYPE: FULL-TIME // [FULL-TIME|PART-TIME|CONTRACT|INTERNSHIP|COOP]
EXPERIENCE_LEVEL: SENIOR // [ENTRY|MID|SENIOR|LEAD]
POSTED_DATE: 2025-11-15
CLOSING_DATE: 2025-12-31
# DESCRIPTION:
- Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.
- Develop and manage CI/CD pipelines using GitLab or Jenkins.
- Provide subject matter expertise on security, reliability, and cost optimization.
# REQUIRED_SKILLS: // required
- 7+ years of experience in DevOps or SRE roles.
- Expert-level proficiency with Terraform and Kubernetes.
- Strong knowledge of Python or Go for scripting.
# PREFERRED_SKILLS:
- Experience with FinOps principles and tooling.
- AWS Certified DevOps Engineer - Professional.
- Background in the FinTech industry.
# ABOUT_COMPANY:
- Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.
- **Culture:** We emphasize radical ownership, transparency, and continuous learning.
- **Team Structure:** Teams are cross-functional, highly autonomous, and empowered to make core product decisions.
- **Benefits:** We offer unlimited PTO, 1000% 401(k) matching and excellent health coverage.
- **Values:** We are committed to fostering diversity, equity, and inclusion in the workplace.`;
  }

  /**
   * Attach event listeners
   */
  attachListeners(container, job, index, isExpanded = false) {
    // Check if job is currently being extracted
    const isExtracting = !!job.isExtracting;
    
    // Always attach delete button listener (available in all states)
    const deleteBtn = container.querySelector('.btn-delete');
    if (deleteBtn) {
      const deleteHandler = () => this.handleDelete(index);
      this.trackListener(deleteBtn, 'click', deleteHandler);
    }
    
    // Extraction state has no other interactive elements (just shows spinner and delete button)
    if (isExtracting) {
      return;
    }
    
    // Check if job has extraction error
    const hasExtractionError = !!job.extractionError;
    
    if (hasExtractionError) {
      // Attach editor if partial content exists
      const editor = container.querySelector('#jobEditor');
      if (editor) {
        const inputHandler = () => {
          this.handleEditorChange(editor, index);
        };
        this.trackListener(editor, 'input', inputHandler);
      }
      return;
    }
    
    // Check if job has content
    const hasContent = job.content && job.content.trim().length > 0;
    
    if (!hasContent) {
      // Migration prompt - only delete button (already attached above)
      return;
    }

    // Template toggle button
    const templateToggleBtn = container.querySelector('[data-action="toggleTemplate"]');
    if (templateToggleBtn) {
      const toggleHandler = () => this.handleToggleTemplate(container);
      this.trackListener(templateToggleBtn, 'click', toggleHandler);
    }

    // Template close button
    const templateCloseBtn = container.querySelector('[data-action="closeTemplate"]');
    if (templateCloseBtn) {
      const closeHandler = () => this.handleCloseTemplate(container);
      this.trackListener(templateCloseBtn, 'click', closeHandler);
    }

    // Validation panel toggle
    const validationHeader = container.querySelector('[data-action="toggleValidation"]');
    if (validationHeader) {
      const validationToggleHandler = () => this.handleToggleValidation(container);
      this.trackListener(validationHeader, 'click', validationToggleHandler);
    }

    // Markdown editor - auto-save and validation
    const editor = container.querySelector('#jobEditor');
    if (editor) {
      // Input handler for auto-save and validation
      const inputHandler = () => {
        this.handleEditorChange(editor, index);
      };
      this.trackListener(editor, 'input', inputHandler);

      // Initial validation
      this.validateAndDisplay(editor.value, container);
    }

    // Render checklist
    this.renderChecklist(job, index, isExpanded);
  }

  /**
   * Handle template toggle
   */
  handleToggleTemplate(container) {
    const panel = container.querySelector('#templatePanel');
    const btn = container.querySelector('[data-action="toggleTemplate"]');
    
    this.isTemplateVisible = !this.isTemplateVisible;
    
    if (this.isTemplateVisible) {
      panel.classList.remove('hidden');
      btn.textContent = 'Hide Template';
    } else {
      panel.classList.add('hidden');
      btn.textContent = 'Show Template';
    }
  }

  /**
   * Handle template close
   */
  handleCloseTemplate(container) {
    const panel = container.querySelector('#templatePanel');
    const btn = container.querySelector('[data-action="toggleTemplate"]');
    
    this.isTemplateVisible = false;
    panel.classList.add('hidden');
    btn.textContent = 'Show Template';
  }

  /**
   * Handle validation panel toggle
   */
  handleToggleValidation(container) {
    const panel = container.querySelector('#validationPanel');
    const toggle = container.querySelector('.validation-toggle');
    
    this.isValidationPanelCollapsed = !this.isValidationPanelCollapsed;
    
    if (this.isValidationPanelCollapsed) {
      panel.classList.add('collapsed');
      toggle.textContent = '▼';
    } else {
      panel.classList.remove('collapsed');
      toggle.textContent = '▲';
    }
  }

  /**
   * Handle editor change - debounced auto-save and validation
   */
  handleEditorChange(editor, index) {
    const content = editor.value;
    const container = editor.closest('.job-card');

    // Debounced validation
    clearTimeout(this.validationDebounceTimer);
    this.validationDebounceTimer = setTimeout(() => {
      this.validateAndDisplay(content, container);
    }, 500);

    // Debounced auto-save
    clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = setTimeout(() => {
      this.handleSaveContent(index, content);
    }, 2000);
  }

  /**
   * Validate content and display results
   */
  validateAndDisplay(content, container) {
    // Parse the job template
    const parsed = parseJobTemplate(content);
    
    // Validate the parsed job
    const validation = validateJobTemplate(parsed);
    this.currentValidation = validation;

    // Update validation UI
    this.updateValidationUI(validation, container);
  }

  /**
   * Update validation UI with results
   */
  updateValidationUI(validation, container) {
    const statusIcon = container.querySelector('#statusIcon');
    const statusText = container.querySelector('#statusText');
    const countsDiv = container.querySelector('#validationCounts');
    const contentDiv = container.querySelector('#validationContent');
    const editor = container.querySelector('#jobEditor');

    // Update status icon and text
    if (validation.valid) {
      statusIcon.textContent = '✓';
      statusText.textContent = 'Valid Job';
      editor.className = 'job-markdown-editor is-valid';
    } else {
      statusIcon.textContent = '✗';
      statusText.textContent = 'Invalid Job';
      editor.className = 'job-markdown-editor has-errors';
    }

    // Update counts
    const errorCount = validation.errors.length;
    const warningCount = validation.warnings.length;
    const infoCount = validation.info.length;

    let countsHTML = '';
    if (errorCount > 0) {
      countsHTML += `<span class="count-errors">${errorCount} error${errorCount > 1 ? 's' : ''}</span>`;
    }
    if (warningCount > 0) {
      countsHTML += `<span class="count-warnings">${warningCount} warning${warningCount > 1 ? 's' : ''}</span>`;
    }
    if (infoCount > 0) {
      countsHTML += `<span class="count-info">${infoCount} custom</span>`;
    }
    countsDiv.innerHTML = countsHTML;

    // Update content
    const messages = [
      ...validation.errors.map(e => ({ type: 'error', message: e.message })),
      ...validation.warnings.map(w => ({ type: 'warning', message: w.message })),
      ...validation.info.map(i => ({ type: 'info', message: i.message }))
    ];

    if (messages.length === 0) {
      contentDiv.innerHTML = '<div class="validation-empty">No validation messages</div>';
    } else {
      contentDiv.innerHTML = messages.map(m => 
        `<div class="validation-message validation-${m.type}">${this.escapeHtml(m.message)}</div>`
      ).join('');
    }
  }

  /**
   * Handle save content - dispatches custom event
   */
  async handleSaveContent(index, newContent) {
    const event = new CustomEvent('view:saveField', {
      detail: { index, fieldName: 'content', value: newContent }
    });
    document.dispatchEvent(event);

    return new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Handle delete button click
   */
  handleDelete(index) {
    const event = new CustomEvent('view:deleteJob', {
      detail: { index }
    });
    document.dispatchEvent(event);
  }

  /**
   * Render/update checklist in the sidebar
   */
  renderChecklist(job, index, isExpanded = false, animate = false) {
    const checklistContainer = document.getElementById('checklistContainer');
    if (!checklistContainer) {
      console.error('Checklist container not found');
      return;
    }

    // Set up callbacks
    this.checklistComponent.setOnToggleExpand((jobIndex, isExpanded) => {
      const event = new CustomEvent('checklist:toggleExpand', {
        detail: { index: jobIndex, isExpanded }
      });
      document.dispatchEvent(event);
    });

    this.checklistComponent.setOnToggleItem((jobIndex, itemId) => {
      const event = new CustomEvent('checklist:toggleItem', {
        detail: { index: jobIndex, itemId }
      });
      document.dispatchEvent(event);
    });
    
    // Update checklist
    this.checklistComponent.update(
      checklistContainer,
      job.checklist, 
      job.applicationStatus, 
      index, 
      isExpanded,
      animate
    );
  }

  /**
   * Cleanup
   */
  cleanup() {
    super.cleanup();
    
    // Clear timers
    clearTimeout(this.validationDebounceTimer);
    clearTimeout(this.autoSaveTimer);

    // Cleanup checklist
    this.checklistComponent.cleanup();

    // Clear checklist container
    const checklistContainer = document.getElementById('checklistContainer');
    if (checklistContainer) {
      checklistContainer.innerHTML = '';
    }
  }
}
