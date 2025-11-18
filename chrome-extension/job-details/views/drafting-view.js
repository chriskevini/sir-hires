// View for "Drafting" state - markdown editor for tailored resumes and cover letters
import { BaseView } from '../base-view.js';
import { ChecklistComponent } from '../components/checklist.js';
import { SynthesisModal } from '../components/synthesis-modal.js';
import { documentTemplates } from '../config.js';

export class DraftingView extends BaseView {
  constructor() {
    super();
    this.checklistComponent = new ChecklistComponent();
    this.synthesisModal = new SynthesisModal();
    this.activeTab = 'tailoredResume';
    this.autoSaveInterval = null;
    this.lastSavedContent = {}; // Track last saved content to detect changes
    
    // Configuration for default documents
    this.defaultDocuments = {
      tailoredResume: {
        label: 'Resume/CV',
        order: 0,
        defaultTitle: (job) => `${job.jobTitle || 'Resume'} - ${job.company || 'Company'}`,
        placeholder: 'Write your tailored resume here using Markdown formatting...\n\nExample:\n# Your Name\nemail@example.com | linkedin.com/in/yourprofile\n\n## Summary\nExperienced software engineer...'
      },
      coverLetter: {
        label: 'Cover Letter',
        order: 1,
        defaultTitle: (job) => `Cover Letter - ${job.jobTitle || 'Position'} at ${job.company || 'Company'}`,
        placeholder: 'Write your cover letter here using Markdown formatting...\n\nExample:\nDear Hiring Manager,\n\nI am writing to express my interest...'
      }
    };
  }

  /**
   * Render the Drafting state view
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job in allJobs array
   * @returns {string} HTML string
   */
  render(job, index) {
    // Initialize documents if they don't exist
    if (!job.documents) {
      this.initializeJobDocuments(job, index);
    }

    return `
      <div class="job-card">
        <div class="detail-panel-content">
          ${this.renderJobHeader(job)}
          ${this.renderDraftingEditor(job, index)}
        </div>
      </div>
    `;
  }

  /**
   * Render job header (minimal version for drafting)
   * @param {Object} job - The job object
   * @returns {string} HTML string
   */
  renderJobHeader(job) {
    return `
      <div class="job-header">
        <div>
          <div class="job-title">${this.escapeHtml(job.jobTitle)}</div>
          <div class="company">${this.escapeHtml(job.company)}</div>
        </div>
        <div>
          ${job.source && job.url ? `<a href="${this.escapeHtml(job.url)}" class="badge badge-link" target="_blank" rel="noopener noreferrer">${this.escapeHtml(job.source)}</a>` : job.source ? `<span class="badge">${this.escapeHtml(job.source)}</span>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Render the drafting editor container
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderDraftingEditor(job, index) {
    return `
      <div class="drafting-editor-container">
        ${this.renderTopbar(job, index)}
        ${this.renderEditors(job, index)}
        ${this.renderFooter(job, index)}
      </div>
    `;
  }

  /**
   * Render the thinking stream panel (initially hidden)
   * @returns {string} HTML string
   */
  renderThinkingPanel() {
    return `
      <div class="thinking-stream-panel hidden">
        <div class="thinking-header">
          <span class="thinking-title">🤔 AI Thinking Process</span>
          <button class="thinking-toggle-btn" title="Collapse">▼</button>
        </div>
        <textarea class="thinking-content" readonly></textarea>
      </div>
    `;
  }

  /**
   * Render the editor topbar with tabs and action buttons
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderTopbar(job, index) {
    const documentKeys = this.getDocumentKeys(job);
    
    return `
      <div class="editor-topbar">
        <div class="tab-container">
          ${this.renderTabs(job, documentKeys)}
        </div>
        <div class="editor-actions">
          <button class="btn-synthesize" id="synthesizeBtn" data-index="${index}">
            ✨ Synthesize with LLM
          </button>
          <div class="dropdown-container export-dropdown">
            <button class="btn-dropdown" id="exportDropdownBtn">
              📥 Export ▼
            </button>
            <div class="dropdown-menu hidden" id="exportDropdownMenu">
              <button class="dropdown-item" data-export="md">
                📄 Export as Markdown (.md)
              </button>
              <button class="dropdown-item" data-export="pdf">
                📑 Export as PDF (.pdf)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render tab buttons
   * @param {Object} job - The job object
   * @param {Array<string>} documentKeys - Sorted document keys
   * @returns {string} HTML string
   */
  renderTabs(job, documentKeys) {
    return documentKeys.map(key => {
      const config = this.defaultDocuments[key];
      const label = config ? config.label : key;
      const isActive = key === this.activeTab ? 'active' : '';
      
      return `
        <button class="tab-btn ${isActive}" data-tab="${key}">
          ${this.escapeHtml(label)}
        </button>
      `;
    }).join('');
  }

  /**
   * Render all editor panels
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderEditors(job, index) {
    const documentKeys = this.getDocumentKeys(job);
    
    return `
      <div class="editor-wrapper">
        ${documentKeys.map(key => this.renderEditorPanel(job, index, key)).join('')}
      </div>
    `;
  }

  /**
   * Render a single editor panel
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @param {string} documentKey - Document key
   * @returns {string} HTML string
   */
  renderEditorPanel(job, index, documentKey) {
    const doc = this.getDocument(job, documentKey);
    const config = this.defaultDocuments[documentKey];
    const isActive = documentKey === this.activeTab ? 'active' : '';
    const placeholder = config ? config.placeholder : 'Write your document here...';
    
    // Store last saved content for change detection
    this.lastSavedContent[documentKey] = {
      text: doc.text,
      lastEdited: doc.lastEdited
    };
    
    return `
      <div class="editor-content ${isActive}" data-content="${documentKey}">
        ${this.renderThinkingPanel()}
        <textarea 
          class="document-editor" 
          data-field="${documentKey}-text"
          placeholder="${this.escapeHtml(placeholder)}"
          data-index="${index}"
        >${this.escapeHtml(doc.text)}</textarea>
      </div>
    `;
  }

  /**
   * Render the editor footer with status and word count
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @returns {string} HTML string
   */
  renderFooter(job, index) {
    const doc = this.getDocument(job, this.activeTab);
    const wordCount = this.countWords(doc.text);
    
    // Get initial save status text
    const initialStatus = this.getInitialSaveStatus(doc);
    
    return `
      <div class="editor-footer">
        <div class="editor-status">
          <span class="save-status-indicator visible saved" id="saveStatus">${initialStatus}</span>
        </div>
        <div class="editor-meta">
          <span class="word-count" id="wordCount">${wordCount} words</span>
        </div>
      </div>
    `;
  }

  /**
   * Get initial save status text based on last edited time
   * @param {Object} doc - Document object
   * @returns {string} Initial status text
   */
  getInitialSaveStatus(doc) {
    if (!doc.lastEdited) {
      return 'No changes yet';
    }
    
    const lastEditedDate = new Date(doc.lastEdited);
    return `Last saved ${this.formatSaveTime(lastEditedDate)}`;
  }

  /**
   * Attach event listeners
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @param {boolean} isExpanded - Whether checklist should be expanded (global state)
   */
  attachListeners(container, job, index, isExpanded = false) {
    // Tab switching
    this.attachTabListeners(container, job, index);
    
    // Auto-save
    this.startAutoSave(container, job, index);
    
    // Export dropdown
    this.attachExportDropdownListeners(container, job, index);
    
    // Synthesize button
    this.attachSynthesizeListener(container, job, index);
    
    // Word count updates
    this.attachWordCountListeners(container);
    
    // Thinking panel toggle
    this.attachThinkingPanelListeners(container);
    
    // Render and attach checklist
    this.renderChecklist(job, index, isExpanded);
  }

  /**
   * Attach tab switching listeners
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  attachTabListeners(container, job, index) {
    const tabButtons = container.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
      const tabKey = btn.dataset.tab;
      const clickHandler = () => this.switchTab(container, tabKey);
      this.trackListener(btn, 'click', clickHandler);
    });
  }

  /**
   * Switch to a different tab
   * @param {HTMLElement} container - The container element
   * @param {string} newTabKey - The new tab key to switch to
   */
  switchTab(container, newTabKey) {
    this.activeTab = newTabKey;
    
    // Update tab buttons
    container.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.dataset.tab === newTabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update editor visibility
    container.querySelectorAll('.editor-content').forEach(editor => {
      if (editor.dataset.content === newTabKey) {
        editor.classList.add('active');
        // Focus the textarea
        const textarea = editor.querySelector('.document-editor');
        if (textarea) textarea.focus();
      } else {
        editor.classList.remove('active');
      }
    });
    
    // Update word count for new tab
    this.updateWordCount(container);
    
    // Update save indicator for new tab
    this.updateSaveIndicatorForTab(container, newTabKey);
  }

  /**
   * Update save indicator when switching tabs
   * @param {HTMLElement} container - The container element
   * @param {string} documentKey - The document key
   */
  updateSaveIndicatorForTab(container, documentKey) {
    const indicator = container.querySelector('#saveStatus');
    if (!indicator) return;
    
    // Get the document from lastSavedContent
    const doc = this.lastSavedContent[documentKey];
    
    if (!doc || !doc.lastEdited) {
      indicator.textContent = 'No changes yet';
      indicator.classList.add('visible', 'saved');
      return;
    }
    
    const lastEditedDate = new Date(doc.lastEdited);
    indicator.textContent = `Last saved ${this.formatSaveTime(lastEditedDate)}`;
    indicator.classList.add('visible', 'saved');
  }

  /**
   * Start auto-save interval and blur listeners
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  startAutoSave(container, job, index) {
    // Clear any existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    // Add blur listeners for immediate save when user clicks away
    const textareas = container.querySelectorAll('.document-editor');
    textareas.forEach(textarea => {
      const blurHandler = () => {
        const documentKey = textarea.dataset.field.replace('-text', '');
        this.saveDocumentOnBlur(container, job, index, documentKey);
      };
      this.trackListener(textarea, 'blur', blurHandler);
    });
    
    // Auto-save every 5 seconds as backup (for long typing sessions)
    this.autoSaveInterval = setInterval(() => {
      this.performAutoSave(container, job, index);
    }, 5000);
  }

  /**
   * Save document on blur (immediate save when user clicks away)
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @param {string} documentKey - The document key (e.g., 'tailoredResume', 'coverLetter')
   */
  saveDocumentOnBlur(container, job, index, documentKey) {
    const textarea = container.querySelector(`[data-field="${documentKey}-text"]`);
    if (!textarea) return;
    
    const currentText = textarea.value;
    const lastSaved = this.lastSavedContent[documentKey] || {};
    
    // Only save if content changed
    if (currentText !== lastSaved.text) {
      console.log(`[DraftingView] Blur detected on ${documentKey}, saving immediately...`);
      this.saveDocumentImmediately(container, job, index, documentKey, currentText);
    }
  }

  /**
   * Save a document immediately (used by both blur and interval saves)
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @param {string} documentKey - The document key
   * @param {string} text - The document text content
   */
  saveDocumentImmediately(container, job, index, documentKey, text) {
    // Generate default title from config
    const defaultTitle = this.defaultDocuments[documentKey]?.defaultTitle 
      ? this.defaultDocuments[documentKey].defaultTitle(job) 
      : 'Untitled';
    
    const now = new Date().toISOString();
    
    // Dispatch save event
    this.saveDocument(index, documentKey, {
      title: defaultTitle,
      text: text
    });
    
    // Update last saved content with lastEdited timestamp
    this.lastSavedContent[documentKey] = {
      title: defaultTitle,
      text: text,
      lastEdited: now
    };
    
    // Update save indicator immediately (no "Saving..." flash)
    this.updateSaveIndicator(container, 'saved');
  }

  /**
   * Perform auto-save if changes detected
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  performAutoSave(container, job, index) {
    const documentKeys = this.getDocumentKeys(job);
    let hasChanges = false;
    
    documentKeys.forEach(key => {
      const textArea = container.querySelector(`[data-field="${key}-text"]`);
      
      if (!textArea) {
        console.warn(`Textarea not found for ${key}`);
        return;
      }
      
      const currentText = textArea.value;
      const lastSaved = this.lastSavedContent[key] || {};
      
      // Check if content changed
      if (currentText !== lastSaved.text) {
        console.log(`[DraftingView] Interval auto-save: changes detected in ${key}`);
        this.saveDocumentImmediately(container, job, index, key, currentText);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      console.log('[DraftingView] Auto-save completed');
    }
  }

  /**
   * Save document - dispatches event for app to handle
   * @param {number} index - The global index of the job
   * @param {string} documentKey - The document key
   * @param {Object} documentData - Document data with title and text
   */
  saveDocument(index, documentKey, documentData) {
    const event = new CustomEvent('view:saveDocument', {
      detail: { index, documentKey, documentData }
    });
    document.dispatchEvent(event);
  }

  /**
   * Update save indicator
   * @param {HTMLElement} container - The container element
   * @param {string} status - 'saving' | 'saved' | 'error'
   */
  updateSaveIndicator(container, status) {
    const indicator = container.querySelector('#saveStatus');
    if (!indicator) {
      console.warn('Save status indicator not found');
      return;
    }
    
    indicator.classList.remove('saving', 'saved');
    indicator.classList.add('visible', status);
    
    if (status === 'saved') {
      const now = new Date();
      indicator.textContent = `Last saved ${this.formatSaveTime(now)}`;
    } else if (status === 'saving') {
      indicator.textContent = 'Saving...';
    }
  }

  /**
   * Format save time - shows time without seconds for today, relative date for other days
   * @param {Date} date - The save date
   * @returns {string} Formatted time string
   */
  formatSaveTime(date) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const daysDiff = Math.floor((todayStart - dateStart) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) {
      // Today - show time without seconds
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `at ${displayHours}:${minutes} ${ampm}`;
    } else if (daysDiff === 1) {
      return '1 day ago';
    } else if (daysDiff < 7) {
      return `${daysDiff} days ago`;
    } else if (daysDiff < 14) {
      return '1 week ago';
    } else if (daysDiff < 30) {
      const weeks = Math.floor(daysDiff / 7);
      return `${weeks} weeks ago`;
    } else if (daysDiff < 60) {
      return '1 month ago';
    } else {
      const months = Math.floor(daysDiff / 30);
      return `${months} months ago`;
    }
  }

  /**
   * Attach export dropdown listeners
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  attachExportDropdownListeners(container, job, index) {
    const dropdownBtn = container.querySelector('#exportDropdownBtn');
    const dropdownMenu = container.querySelector('#exportDropdownMenu');
    
    if (!dropdownBtn || !dropdownMenu) return;
    
    // Toggle dropdown
    const toggleHandler = (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('hidden');
    };
    this.trackListener(dropdownBtn, 'click', toggleHandler);
    
    // Close on outside click
    const outsideClickHandler = (e) => {
      if (!dropdownMenu.contains(e.target) && e.target !== dropdownBtn) {
        dropdownMenu.classList.add('hidden');
      }
    };
    this.trackListener(document, 'click', outsideClickHandler);
    
    // Export actions
    dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
      const exportHandler = () => {
        const exportType = item.dataset.export;
        this.handleExport(container, job, index, exportType);
        dropdownMenu.classList.add('hidden');
      };
      this.trackListener(item, 'click', exportHandler);
    });
  }

  /**
   * Handle export action
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   * @param {string} exportType - 'md' | 'pdf'
   */
  handleExport(container, job, index, exportType) {
    const doc = this.getDocument(job, this.activeTab);
    
    if (exportType === 'md') {
      this.exportMarkdown(doc);
    } else if (exportType === 'pdf') {
      this.exportPDF(doc);
    }
  }

  /**
   * Export document as Markdown file
   * @param {Object} doc - Document object with title and text
   */
  exportMarkdown(doc) {
    if (!doc.text || !doc.text.trim()) {
      this.showToast('Document is empty. Nothing to export.', 'error');
      return;
    }

    const blob = new Blob([doc.text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Export failed:', chrome.runtime.lastError);
        this.showToast(`Failed to export: ${chrome.runtime.lastError.message}`, 'error');
      }
      // Note: No success toast here because the browser's save dialog provides feedback
      // and the callback fires before the user completes the save action
      URL.revokeObjectURL(url);
    });
  }

  /**
   * Export document as PDF (using browser print)
   * @param {Object} doc - Document object with title and text
   */
  exportPDF(doc) {
    if (!doc.text || !doc.text.trim()) {
      this.showToast('Document is empty. Nothing to export.', 'error');
      return;
    }

    try {
      // Create a temporary window with the content
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        this.showToast('Failed to open print window. Please allow popups for this site.', 'error');
        return;
      }
      
      // Convert markdown to simple HTML (basic conversion)
      const htmlContent = this.markdownToHtml(doc.text);
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.escapeHtml(doc.title)}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            h2 { font-size: 20px; margin-top: 20px; margin-bottom: 10px; }
            h3 { font-size: 16px; margin-top: 15px; margin-bottom: 8px; }
            p { margin-bottom: 10px; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.print();
        // Note: No toast here because the print dialog provides feedback
      };
    } catch (error) {
      console.error('PDF export failed:', error);
      this.showToast(`Failed to export PDF: ${error.message}`, 'error');
    }
  }

  /**
   * Attach synthesize button listener
   * @param {HTMLElement} container - The container element
   * @param {Object} job - The job object
   * @param {number} index - The global index of the job
   */
  attachSynthesizeListener(container, job, index) {
    const synthesizeBtn = container.querySelector('#synthesizeBtn');
    
    if (synthesizeBtn) {
      const clickHandler = async () => {
        // Open synthesis modal with current job, index, and active tab
        await this.synthesisModal.open(job, index, this.activeTab);
        
        // Set streaming callback for thinking updates
        this.synthesisModal.onThinkingUpdate = (thinkingDelta) => {
          // Show thinking panel on first update (get active editor's panel)
          const activeEditor = container.querySelector('.editor-content.active');
          if (activeEditor) {
            const panel = activeEditor.querySelector('.thinking-stream-panel');
            if (panel && panel.classList.contains('hidden')) {
              this.showThinkingPanel(container);
            }
          }
          
          // Append thinking content
          this.updateThinkingStream(container, thinkingDelta);
        };
        
        // Set streaming callback for document updates
        this.synthesisModal.onDocumentUpdate = (documentDelta) => {
          // Get the textarea for the active document
          const textarea = container.querySelector(`[data-field="${this.activeTab}-text"]`);
          if (textarea) {
            // Append document content in real-time
            textarea.value += documentDelta;
            
            // Update word count in real-time
            this.updateWordCount(container);
          }
        };
        
        // Set callback to handle generation completion
        this.synthesisModal.onGenerate = (jobIndex, documentKey, result) => {
          console.log(`[DraftingView] Generation completed for ${documentKey}`, { truncated: result.truncated });
          
          // Get the textarea for the active document
          const textarea = container.querySelector(`[data-field="${documentKey}-text"]`);
          if (!textarea) {
            console.error(`[DraftingView] Textarea not found for ${documentKey}`);
            this.showToast('Failed to insert generated content', 'error');
            return;
          }
          
          // Content is already in editor from streaming updates
          const generatedContent = result.content || textarea.value;
          
          // Update save indicator to trigger save
          this.updateSaveIndicator(container, 'saving');
          
          // Perform immediate save
          const defaultTitle = this.defaultDocuments[documentKey]?.defaultTitle 
            ? this.defaultDocuments[documentKey].defaultTitle(job) 
            : 'Untitled';
          
          const now = new Date().toISOString();
          
          this.saveDocument(index, documentKey, {
            title: defaultTitle,
            text: generatedContent
          });
          
          // Update last saved content
          this.lastSavedContent[documentKey] = {
            title: defaultTitle,
            text: generatedContent,
            lastEdited: now
          };
          
          // Update save indicator
          setTimeout(() => {
            this.updateSaveIndicator(container, 'saved');
          }, 500);
          
          // Update word count
          this.updateWordCount(container);
          
          // Show success toast
          this.showToast('Document generated successfully!', 'success');
        };
        
        // Set callback to handle generation errors
        this.synthesisModal.onError = (jobIndex, documentKey, error) => {
          console.error(`[DraftingView] Generation failed for ${documentKey}:`, error);
          
          // Keep thinking panel visible on error so user can see what the model was thinking
          
          // Show error toast
          this.showToast(`Generation failed: ${error.message}`, 'error');
        };
      };
      this.trackListener(synthesizeBtn, 'click', clickHandler);
    }
  }

  /**
   * Attach word count update listeners
   * @param {HTMLElement} container - The container element
   */
  attachWordCountListeners(container) {
    const textareas = container.querySelectorAll('.document-editor');
    
    textareas.forEach(textarea => {
      const inputHandler = () => this.updateWordCount(container);
      this.trackListener(textarea, 'input', inputHandler);
    });
  }

  /**
   * Update word count display
   * @param {HTMLElement} container - The container element
   */
  updateWordCount(container) {
    const activeEditor = container.querySelector('.editor-content.active .document-editor');
    const wordCountSpan = container.querySelector('#wordCount');
    
    if (!activeEditor || !wordCountSpan) return;
    
    const text = activeEditor.value;
    const wordCount = this.countWords(text);
    wordCountSpan.textContent = `${wordCount} words`;
  }

  /**
   * Count words in text
   * @param {string} text - Text to count
   * @returns {number} Word count
   */
  countWords(text) {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  }

  /**
   * Get document by key with fallback to defaults
   * @param {Object} job - Job object
   * @param {string} documentKey - Document key
   * @returns {Object} Document object
   */
  getDocument(job, documentKey) {
    if (!job.documents) {
      job.documents = this.createDefaultDocuments(job);
    }
    
    if (job.documents[documentKey]) {
      return job.documents[documentKey];
    }
    
    // Fallback default
    const config = this.defaultDocuments[documentKey];
    return {
      title: config ? config.defaultTitle(job) : 'Untitled Document',
      text: '',
      lastEdited: null,
      order: config ? config.order : 0
    };
  }

  /**
   * Get sorted document keys
   * @param {Object} job - Job object
   * @returns {Array<string>} Sorted document keys
   */
  getDocumentKeys(job) {
    if (!job.documents) {
      return ['tailoredResume', 'coverLetter'];
    }
    
    return Object.keys(job.documents).sort((a, b) => {
      const orderA = job.documents[a]?.order ?? 999;
      const orderB = job.documents[b]?.order ?? 999;
      return orderA - orderB;
    });
  }

  /**
   * Create default document structure for a job
   * @param {Object} job - Job object
   * @returns {Object} Default documents object
   */
  createDefaultDocuments(job) {
    return {
      tailoredResume: {
        title: this.defaultDocuments.tailoredResume.defaultTitle(job),
        text: documentTemplates.tailoredResume,
        lastEdited: null,
        order: 0
      },
      coverLetter: {
        title: this.defaultDocuments.coverLetter.defaultTitle(job),
        text: documentTemplates.coverLetter,
        lastEdited: null,
        order: 1
      }
    };
  }

  /**
   * Initialize job documents if they don't exist
   * @param {Object} job - Job object
   * @param {number} index - The global index of the job
   */
  initializeJobDocuments(job, index) {
    if (!job.documents) {
      job.documents = this.createDefaultDocuments(job);
      
      // Dispatch event to save initialized documents
      const event = new CustomEvent('view:initializeDocuments', {
        detail: { index, documents: job.documents }
      });
      document.dispatchEvent(event);
    }
  }

  /**
   * Render/update checklist in the sidebar
   * @param {Object} job - The job object
   * @param {number} index - Global index of the job
   * @param {boolean} isExpanded - Whether checklist should be expanded (global state)
   * @param {boolean} animate - Whether to animate the transition (user-triggered)
   */
  renderChecklist(job, index, isExpanded = false, animate = false) {
    const checklistContainer = document.getElementById('checklistContainer');
    if (!checklistContainer) {
      console.error('Checklist container not found');
      return;
    }

    // Set up callbacks first (before update)
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
    
    // Use update() method to handle animation
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
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type: 'success' | 'error' | 'info'
   * @param {number} duration - Duration in milliseconds (default: 4000)
   */
  showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
      console.warn('Toast container not found, creating it...');
      const newContainer = document.createElement('div');
      newContainer.id = 'toastContainer';
      newContainer.className = 'toast-container';
      document.body.appendChild(newContainer);
      return this.showToast(message, type, duration);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Choose icon based on type
    let icon = '';
    switch (type) {
      case 'success':
        icon = '✓';
        break;
      case 'error':
        icon = '✕';
        break;
      case 'info':
        icon = 'ℹ';
        break;
      default:
        icon = 'ℹ';
    }
    
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode === container) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  /**
   * Cleanup - remove event listeners and intervals
   */
  cleanup() {
    super.cleanup();
    
    // Clear auto-save interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    
    // Clear last saved content
    this.lastSavedContent = {};
    
    // Cleanup checklist
    this.checklistComponent.cleanup();
    
    // Cleanup synthesis modal
    this.synthesisModal.cleanup();

    // Clear checklist container
    const checklistContainer = document.getElementById('checklistContainer');
    if (checklistContainer) {
      checklistContainer.innerHTML = '';
    }
  }

  /**
   * Show thinking stream panel
   * @param {HTMLElement} container - The container element
   */
  showThinkingPanel(container) {
    // Get the active editor-content container
    const activeEditor = container.querySelector('.editor-content.active');
    if (!activeEditor) return;
    
    const panel = activeEditor.querySelector('.thinking-stream-panel');
    if (panel) {
      panel.classList.remove('hidden');
      // Clear previous content
      const content = activeEditor.querySelector('.thinking-content');
      if (content) {
        content.value = '';
      }
    }
  }

  /**
   * Hide thinking stream panel
   * @param {HTMLElement} container - The container element
   */
  hideThinkingPanel(container) {
    // Get the active editor-content container
    const activeEditor = container.querySelector('.editor-content.active');
    if (!activeEditor) return;
    
    const panel = activeEditor.querySelector('.thinking-stream-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
  }

  /**
   * Update thinking stream content
   * @param {HTMLElement} container - The container element
   * @param {string} delta - New thinking content to append
   */
  updateThinkingStream(container, delta) {
    // Get the active editor-content container
    const activeEditor = container.querySelector('.editor-content.active');
    if (!activeEditor) return;
    
    const content = activeEditor.querySelector('.thinking-content');
    if (content) {
      content.value += delta;
      // Auto-scroll to bottom
      content.scrollTop = content.scrollHeight;
    }
  }

  /**
   * Attach thinking panel toggle listener
   * @param {HTMLElement} container - The container element
   */
  attachThinkingPanelListeners(container) {
    // Attach listener to all thinking panel toggle buttons
    const toggleBtns = container.querySelectorAll('.thinking-toggle-btn');
    
    toggleBtns.forEach(toggleBtn => {
      // Find the thinking-content within the same thinking-stream-panel
      const panel = toggleBtn.closest('.thinking-stream-panel');
      if (!panel) return;
      
      const content = panel.querySelector('.thinking-content');
      if (!content) return;
      
      const clickHandler = () => {
        const isExpanded = content.style.display !== 'none';
        
        if (isExpanded) {
          // Collapse
          content.style.display = 'none';
          toggleBtn.textContent = '▶';
          toggleBtn.title = 'Expand';
        } else {
          // Expand
          content.style.display = 'block';
          toggleBtn.textContent = '▼';
          toggleBtn.title = 'Collapse';
          // Auto-scroll to bottom when expanding
          content.scrollTop = content.scrollHeight;
        }
      };
      this.trackListener(toggleBtn, 'click', clickHandler);
    });
  }
}
