// Editable section component
// Used for large text sections like notes, narrative strategy, about job, etc.

export class EditableSection {
  /**
   * Create an editable section
   * @param {Object} options - Configuration options
   * @param {string} options.fieldName - The field name in the job object
   * @param {string} options.value - The current value
   * @param {string} options.title - Section title (e.g., 'Notes', 'About the Job')
   * @param {string} options.placeholder - Placeholder text when empty
   * @param {Function} options.onSave - Callback when value is saved: (fieldName, newValue) => Promise
   * @param {boolean} options.readonly - If true, content is not editable (default: false)
   */
  constructor(options) {
    this.fieldName = options.fieldName;
    this.value = options.value || '';
    this.title = options.title || '';
    this.placeholder = options.placeholder || '(Click to add...)';
    this.onSave = options.onSave;
    this.readonly = options.readonly || false;
    this.element = null;
    this.indicator = null;
    this.originalValue = null;
  }

  /**
   * Render the editable section as HTML string
   * @returns {string} HTML string
   */
  render() {
    const displayContent = this.value || this.placeholder;
    const hasContent = !!this.value;
    const editableAttr = this.readonly ? '' : 'contenteditable="true"';
    
    return `
      <div class="job-section editable-section" data-field="${this.escapeHtml(this.fieldName)}">
        <h3 class="section-title">
          ${this.escapeHtml(this.title)}
          ${this.readonly ? '' : '<span class="save-indicator"></span>'}
        </h3>
        <div 
          class="section-content ${hasContent ? '' : 'empty-content'}" 
          ${editableAttr}
        >${this.escapeHtml(displayContent)}</div>
      </div>
    `;
  }

  /**
   * Attach event listeners to a rendered element
   * @param {HTMLElement} element - The section element
   */
  attachListeners(element) {
    if (!element || this.readonly) return;
    
    this.element = element;
    this.indicator = element.querySelector('.save-indicator');
    const contentDiv = element.querySelector('.section-content');
    
    if (!contentDiv) return;

    // Hover effect
    contentDiv.addEventListener('mouseenter', () => {
      contentDiv.classList.add('editing-hover');
    });
    
    contentDiv.addEventListener('mouseleave', () => {
      contentDiv.classList.remove('editing-hover');
    });

    // Focus: store original value
    contentDiv.addEventListener('focus', () => {
      contentDiv.classList.add('editing-active');
      this.originalValue = contentDiv.textContent.trim();
      
      // Select all text if it's a placeholder
      if (contentDiv.classList.contains('empty-content')) {
        setTimeout(() => {
          const range = document.createRange();
          range.selectNodeContents(contentDiv);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }, 0);
      }
    });

    // Blur: save if changed
    contentDiv.addEventListener('blur', async () => {
      contentDiv.classList.remove('editing-active');
      const newValue = contentDiv.textContent.trim();
      
      // Remove empty-content class if there's a value
      if (newValue) {
        contentDiv.classList.remove('empty-content');
      } else {
        contentDiv.classList.add('empty-content');
        contentDiv.textContent = this.placeholder;
      }
      
      // Only save if value changed
      if (newValue !== this.originalValue && this.onSave) {
        await this.save(newValue);
      }
    });

    // Handle keyboard shortcuts (Ctrl+S / Cmd+S to save)
    contentDiv.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        contentDiv.blur();
      }
    });
  }

  /**
   * Save the new value
   * @param {string} newValue - The new value to save
   */
  async save(newValue) {
    if (!this.onSave) return;

    // Show saving indicator
    this.showIndicator('saving', '💾');

    try {
      await this.onSave(this.fieldName, newValue);
      this.value = newValue;
      this.showIndicator('saved', '✓');
      
      // Hide after 2 seconds
      setTimeout(() => this.hideIndicator(), 2000);
    } catch (error) {
      console.error(`[EditableSection] Error saving ${this.fieldName}:`, error);
      this.showIndicator('error', '✗');
      
      // Hide after 2 seconds
      setTimeout(() => this.hideIndicator(), 2000);
    }
  }

  /**
   * Show save indicator
   * @param {string} state - 'saving', 'saved', or 'error'
   * @param {string} icon - The icon to display
   */
  showIndicator(state, icon) {
    if (!this.indicator) return;
    
    this.indicator.textContent = icon;
    this.indicator.className = `save-indicator ${state}`;
  }

  /**
   * Hide save indicator
   */
  hideIndicator() {
    if (!this.indicator) return;
    
    this.indicator.className = 'save-indicator';
    this.indicator.textContent = '';
  }

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
   * Cleanup listeners
   */
  cleanup() {
    this.element = null;
    this.indicator = null;
  }
}
