// Editable inline text field component
// Used for simple single-line fields like job title, company name

export class EditableField {
  /**
   * Create an editable field
   * @param {Object} options - Configuration options
   * @param {string} options.fieldName - The field name in the job object (e.g., 'jobTitle', 'company')
   * @param {string} options.value - The current value
   * @param {string} options.placeholder - Placeholder text when empty
   * @param {Function} options.onSave - Callback when value is saved: (fieldName, newValue) => Promise
   * @param {boolean} options.multiline - Allow multiline (default: false)
   * @param {string} options.className - Additional CSS class names
   */
  constructor(options) {
    this.fieldName = options.fieldName;
    this.value = options.value || '';
    this.placeholder = options.placeholder || 'Click to edit...';
    this.onSave = options.onSave;
    this.multiline = options.multiline || false;
    this.className = options.className || '';
    this.element = null;
    this.originalValue = null;
  }

  /**
   * Render the editable field as HTML string
   * @returns {string} HTML string
   */
  render() {
    const displayValue = this.value || this.placeholder;
    const emptyClass = this.value ? '' : 'empty-content';

    return `
      <span 
        class="editable-field ${this.className} ${emptyClass}" 
        data-field="${this.escapeHtml(this.fieldName)}"
        contenteditable="true"
      >${this.escapeHtml(displayValue)}</span>
      <span class="save-indicator"></span>
    `;
  }

  /**
   * Attach event listeners to a rendered element
   * @param {HTMLElement} element - The contenteditable element
   * @param {HTMLElement} indicator - The save indicator element
   */
  attachListeners(element, indicator) {
    if (!element) return;

    this.element = element;
    this.indicator = indicator;

    // Hover effect
    element.addEventListener('mouseenter', () => {
      element.classList.add('editing-hover');
    });

    element.addEventListener('mouseleave', () => {
      element.classList.remove('editing-hover');
    });

    // Focus: store original value
    element.addEventListener('focus', () => {
      element.classList.add('editing-active');
      this.originalValue = element.textContent.trim();

      // Select all text if it's a placeholder
      if (element.classList.contains('empty-content')) {
        setTimeout(() => {
          const range = document.createRange();
          range.selectNodeContents(element);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }, 0);
      }
    });

    // Blur: save if changed
    element.addEventListener('blur', async () => {
      element.classList.remove('editing-active');
      const newValue = element.textContent.trim();

      // Remove empty-content class if there's a value
      if (newValue) {
        element.classList.remove('empty-content');
      } else {
        element.classList.add('empty-content');
        element.textContent = this.placeholder;
      }

      // Only save if value changed
      if (newValue !== this.originalValue && this.onSave) {
        await this.save(newValue);
      }
    });

    // Prevent Enter key from creating new lines in single-line fields
    if (!this.multiline) {
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          element.blur();
        }
      });
    }
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
      console.error(`[EditableField] Error saving ${this.fieldName}:`, error);
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
    // Listeners are automatically removed when element is removed from DOM
    this.element = null;
    this.indicator = null;
  }
}
