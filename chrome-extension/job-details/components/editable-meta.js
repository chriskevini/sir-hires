// Editable meta item component
// Used for meta fields like location, salary, dates, and dropdowns

export class EditableMeta {
  /**
   * Create an editable meta item
   * @param {Object} options - Configuration options
   * @param {string} options.fieldName - The field name in the job object
   * @param {string} options.value - The current value
   * @param {string} options.type - Input type: 'text', 'date', 'select'
   * @param {string} options.icon - Emoji icon for the field
   * @param {string} options.label - Label text (e.g., 'Location', 'Posted')
   * @param {Array<string>} options.options - Options for select type
   * @param {Function} options.onSave - Callback when value is saved: (fieldName, newValue) => Promise
   */
  constructor(options) {
    this.fieldName = options.fieldName;
    this.value = options.value || '';
    this.type = options.type || 'text';
    this.icon = options.icon || '';
    this.label = options.label || '';
    this.options = options.options || [];
    this.onSave = options.onSave;
    this.element = null;
    this.indicator = null;
  }

  /**
   * Render the editable meta item as HTML string
   * @returns {string} HTML string
   */
  render() {
    const displayValue = this.getDisplayValue();
    const optionsJson = JSON.stringify(this.options).replace(/"/g, '&quot;');
    
    return `
      <div 
        class="meta-item editable-meta" 
        data-field="${this.escapeHtml(this.fieldName)}"
        data-type="${this.type}"
        data-options="${optionsJson}"
        data-raw-value="${this.escapeHtml(this.value)}"
      >
        ${this.icon ? `<span class="meta-icon">${this.icon}</span>` : ''}
        ${this.label ? `<span class="meta-label">${this.escapeHtml(this.label)}:</span>` : ''}
        <span class="meta-value">${this.escapeHtml(displayValue)}</span>
        <span class="save-indicator"></span>
      </div>
    `;
  }

  /**
   * Get display value based on type
   * @returns {string} Display value
   */
  getDisplayValue() {
    if (this.value) {
      if (this.type === 'date') {
        return this.formatDate(this.value);
      }
      return this.value;
    }
    
    // Placeholder when empty
    if (this.label) {
      return `(Add ${this.label})`;
    }
    return '(Click to edit)';
  }

  /**
   * Format date for display (e.g., "Jan 15, 2025")
   * @param {string} dateString - ISO date string (YYYY-MM-DD)
   * @returns {string} Formatted date
   */
  formatDate(dateString) {
    if (!dateString) return '';
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
   * Convert date input value (YYYY-MM-DD) to ISO format (YYYY-MM-DD)
   * @param {string} inputValue - Date input value
   * @returns {string} ISO date string
   */
  dateInputToISO(inputValue) {
    return inputValue; // Already in ISO format
  }

  /**
   * Convert ISO date (YYYY-MM-DD) to date input value
   * @param {string} isoDate - ISO date string
   * @returns {string} Date input value
   */
  isoToDateInput(isoDate) {
    return isoDate || '';
  }

  /**
   * Attach event listeners to a rendered element
   * @param {HTMLElement} element - The meta item element
   */
  attachListeners(element) {
    if (!element) return;
    
    this.element = element;
    this.indicator = element.querySelector('.save-indicator');

    // Click to edit
    element.addEventListener('click', () => {
      this.handleEdit();
    });
  }

  /**
   * Handle click to edit - convert to input/select
   */
  handleEdit() {
    const valueSpan = this.element.querySelector('.meta-value');
    if (!valueSpan) return;

    if (this.type === 'select') {
      this.createSelectInput(valueSpan);
    } else if (this.type === 'date') {
      this.createDateInput(valueSpan);
    } else {
      this.createTextInput(valueSpan);
    }
  }

  /**
   * Create text input
   * @param {HTMLElement} valueSpan - The value span element
   */
  createTextInput(valueSpan) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-input';
    input.value = this.value;
    
    const originalDisplay = valueSpan.textContent;
    valueSpan.textContent = '';
    valueSpan.appendChild(input);
    input.focus();
    input.select();
    
    // Handle blur (save)
    input.addEventListener('blur', async () => {
      const newValue = input.value.trim();
      await this.save(newValue);
      valueSpan.textContent = newValue || (this.label ? `(Add ${this.label})` : '(Click to edit)');
    });
    
    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
  }

  /**
   * Create date input
   * @param {HTMLElement} valueSpan - The value span element
   */
  createDateInput(valueSpan) {
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'inline-input';
    input.value = this.isoToDateInput(this.value);
    
    const originalDisplay = valueSpan.textContent;
    valueSpan.textContent = '';
    valueSpan.appendChild(input);
    input.focus();
    
    // Handle blur (save)
    input.addEventListener('blur', async () => {
      const newValue = this.dateInputToISO(input.value);
      await this.save(newValue);
      valueSpan.textContent = newValue ? this.formatDate(newValue) : (this.label ? `(Add ${this.label})` : '(Click to edit)');
    });
  }

  /**
   * Create select dropdown
   * @param {HTMLElement} valueSpan - The value span element
   */
  createSelectInput(valueSpan) {
    const select = document.createElement('select');
    select.className = 'inline-select';
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '(None)';
    select.appendChild(emptyOption);
    
    // Add options
    this.options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === this.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    const originalDisplay = valueSpan.textContent;
    valueSpan.textContent = '';
    valueSpan.appendChild(select);
    select.focus();
    
    // Handle change (save immediately)
    const handleSelect = async () => {
      const newValue = select.value;
      await this.save(newValue);
      valueSpan.textContent = newValue || (this.label ? `(Select ${this.label})` : '(Click to edit)');
    };
    
    select.addEventListener('change', handleSelect);
    select.addEventListener('blur', () => {
      // If select is still in the span, restore original display
      if (valueSpan.contains(select)) {
        valueSpan.textContent = originalDisplay;
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
      console.error(`[EditableMeta] Error saving ${this.fieldName}:`, error);
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
