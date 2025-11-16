// Checklist component for job progress tracking
// Self-contained: handles both rendering and event listeners

import { BaseView } from '../base-view.js';

export class ChecklistComponent extends BaseView {
  constructor() {
    super();
    this.onToggleExpand = null; // Callback when checklist is expanded/collapsed
    this.onToggleItem = null; // Callback when item is checked/unchecked
  }

  /**
   * Render the checklist component
   * @param {Object} checklist - Checklist data (all statuses: { Researching: [], Drafting: [], ... })
   * @param {string} status - Current application status
   * @param {number} jobIndex - Global index of the job
   * @param {boolean} isExpanded - Whether checklist is expanded (global state)
   * @returns {string} HTML string
   */
  render(checklist, status, jobIndex, isExpanded = false) {
    // Always show minimized dots, with expanded dropdown above if isExpanded is true
    const minimizedHtml = this.renderMinimized(jobIndex);
    
    if (isExpanded) {
      const expandedHtml = this.renderExpandedDropdown(checklist, status, jobIndex);
      return `
        <div class="checklist-wrapper">
          ${expandedHtml}
          ${minimizedHtml}
        </div>
      `;
    }
    
    return minimizedHtml;
  }

  /**
   * Render minimized state (3 dots)
   * @param {number} jobIndex - Global index of the job
   * @returns {string} HTML string
   */
  renderMinimized(jobIndex) {
    return `
      <div class="checklist-container minimized" data-index="${jobIndex}">
        <div class="checklist-dots">
          <span class="checklist-dot">•</span>
          <span class="checklist-dot">•</span>
          <span class="checklist-dot">•</span>
        </div>
      </div>
    `;
  }

  /**
   * Render expanded state (dropdown with items) - appears above minimized dots
   * @param {Object} checklist - Checklist data (all statuses: { Researching: [], Drafting: [], ... })
   * @param {string} status - Current application status
   * @param {number} jobIndex - Global index of the job
   * @returns {string} HTML string
   */
  renderExpandedDropdown(checklist, status, jobIndex) {
    // Get items for current status
    const items = checklist && checklist[status] ? checklist[status] : [];
    
    // Handle empty or missing checklist for this status
    if (!items || items.length === 0) {
      return `
        <div class="checklist-dropdown expanded" data-index="${jobIndex}">
          <div class="checklist-items">
            <div class="checklist-empty" style="padding: 12px; text-align: center; color: #666; font-size: 13px;">
              No checklist items yet
            </div>
          </div>
        </div>
      `;
    }

    const sortedItems = [...items].sort((a, b) => a.order - b.order);

    const itemsHtml = sortedItems.map(item => `
      <div class="checklist-item" data-item-id="${item.id}" data-index="${jobIndex}">
        <span class="checklist-bullet ${item.checked ? 'checked' : ''}">${item.checked ? '●' : '○'}</span>
        <span class="checklist-text">${this.escapeHtml(item.text)}</span>
      </div>
    `).join('');

    return `
      <div class="checklist-dropdown expanded" data-index="${jobIndex}">
        <div class="checklist-items">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  /**
   * Update the checklist in the DOM
   * @param {HTMLElement} container - The container element
   * @param {Object} checklist - Checklist data (all statuses)
   * @param {string} status - Current application status
   * @param {number} jobIndex - Global index of the job
   * @param {boolean} isExpanded - Whether checklist is expanded (global state)
   */
  update(container, checklist, status, jobIndex, isExpanded = false) {
    if (!container) {
      console.error('Checklist container not found');
      return;
    }

    // Remove old listeners
    this.cleanup();

    // Render new HTML
    container.innerHTML = this.render(checklist, status, jobIndex, isExpanded);

    // Attach new listeners
    this.attachListeners(container);
  }

  /**
   * Attach event listeners
   * @param {HTMLElement} container - The container element
   */
  attachListeners(container) {
    // Handle minimized dots - always present
    // When collapsed: click to expand
    // When expanded: click to collapse
    const minimizedContainer = container.querySelector('.checklist-container.minimized');
    if (minimizedContainer) {
      const toggleHandler = (e) => {
        e.stopPropagation();
        const index = parseInt(minimizedContainer.dataset.index, 10);
        // Check if currently expanded by looking for dropdown sibling
        const wrapper = minimizedContainer.closest('.checklist-wrapper');
        const isCurrentlyExpanded = wrapper !== null;
        if (this.onToggleExpand) {
          // Toggle to opposite state
          this.onToggleExpand(index, !isCurrentlyExpanded);
        }
      };
      this.trackListener(minimizedContainer, 'click', toggleHandler);
    }
    
    // Handle expanded dropdown
    const expandedDropdown = container.querySelector('.checklist-dropdown.expanded');
    if (expandedDropdown) {
      // Click on items to toggle checked state
      const items = expandedDropdown.querySelectorAll('.checklist-item');
      items.forEach(item => {
        const itemClickHandler = (e) => {
          e.stopPropagation();
          const index = parseInt(item.dataset.index, 10);
          const itemId = item.dataset.itemId;
          if (this.onToggleItem) {
            this.onToggleItem(index, itemId);
          }
        };
        this.trackListener(item, 'click', itemClickHandler);
      });
    }
  }

  /**
   * Set callback for when checklist is expanded/collapsed
   * @param {Function} callback - Function to call with (index, isExpanded)
   */
  setOnToggleExpand(callback) {
    this.onToggleExpand = callback;
  }

  /**
   * Set callback for when item is checked/unchecked
   * @param {Function} callback - Function to call with (index, itemId)
   */
  setOnToggleItem(callback) {
    this.onToggleItem = callback;
  }
}
