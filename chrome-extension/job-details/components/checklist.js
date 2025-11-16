// Checklist component for job progress tracking
// Self-contained: handles both rendering and event listeners

import { BaseView } from '../base-view.js';
import { statusOrder, progressConfig } from '../config.js';

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
    // Always show expander (3 dots), with expanded dropdown above if isExpanded is true
    const expanderHtml = this.renderExpander(status, jobIndex);
    
    if (isExpanded) {
      const expandedHtml = this.renderExpandedDropdown(checklist, status, jobIndex);
      return `
        <div class="checklist-wrapper">
          ${expandedHtml}
          ${expanderHtml}
        </div>
      `;
    }
    
    return expanderHtml;
  }

  /**
   * Render expander (3 dots) - always visible toggle control
   * @param {string} status - Current application status
   * @param {number} jobIndex - Global index of the job
   * @returns {string} HTML string
   */
  renderExpander(status, jobIndex) {
    // Calculate next status color for expander dots
    const currentIndex = statusOrder.indexOf(status);
    const nextStatus = currentIndex >= 0 && currentIndex < statusOrder.length - 1 
      ? statusOrder[currentIndex + 1] 
      : null;
    const nextColor = nextStatus && progressConfig[nextStatus] 
      ? progressConfig[nextStatus].color 
      : '#666'; // fallback gray
    
    return `
      <div class="checklist-expander" data-index="${jobIndex}">
        <div class="checklist-dots">
          <span class="checklist-dot" style="color: ${nextColor}">•</span>
          <span class="checklist-dot" style="color: ${nextColor}">•</span>
          <span class="checklist-dot" style="color: ${nextColor}">•</span>
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
    
    // Calculate next status color for checked bullets
    const currentIndex = statusOrder.indexOf(status);
    const nextStatus = currentIndex >= 0 && currentIndex < statusOrder.length - 1 
      ? statusOrder[currentIndex + 1] 
      : null;
    const nextColor = nextStatus && progressConfig[nextStatus] 
      ? progressConfig[nextStatus].color 
      : '#1a73e8'; // fallback blue
    
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
        <span class="checklist-text">${this.escapeHtml(item.text)}</span>
        <span class="checklist-bullet ${item.checked ? 'checked' : ''}" style="${item.checked ? `color: ${nextColor}` : ''}">${item.checked ? '●' : '○'}</span>
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
   * @param {boolean} animate - Whether to animate the transition (default: false)
   */
  update(container, checklist, status, jobIndex, isExpanded = false, animate = false) {
    if (!container) {
      console.error('Checklist container not found');
      return;
    }

    // Check if we're transitioning states
    const currentDropdown = container.querySelector('.checklist-dropdown.expanded');
    const wasExpanded = currentDropdown !== null;
    
    if (wasExpanded && !isExpanded && animate) {
      // COLLAPSE: Animate collapse before removing (user-triggered)
      currentDropdown.classList.remove('expanded');
      currentDropdown.classList.add('collapsing');
      
      // Wait for animation to complete, then update
      setTimeout(() => {
        this.cleanup();
        container.innerHTML = this.render(checklist, status, jobIndex, isExpanded);
        this.attachListeners(container);
      }, 300); // Match animation duration
      
    } else if (!wasExpanded && isExpanded && animate) {
      // EXPAND: Render in expanded state, then trigger animation (user-triggered)
      this.cleanup();
      container.innerHTML = this.render(checklist, status, jobIndex, isExpanded);
      this.attachListeners(container);
      
      // Trigger animation on next frame
      const dropdown = container.querySelector('.checklist-dropdown.expanded');
      if (dropdown) {
        // Start from collapsed state
        dropdown.style.transform = 'scaleY(0)';
        dropdown.style.opacity = '0';
        
        // Trigger animation
        requestAnimationFrame(() => {
          dropdown.classList.add('expanding');
          // Remove inline styles to let animation take over
          dropdown.style.transform = '';
          dropdown.style.opacity = '';
          
          // Clean up animation class after animation completes
          setTimeout(() => {
            dropdown.classList.remove('expanding');
          }, 300);
        });
      }
      
    } else {
      // NO ANIMATION: Non-user-triggered update or no state change
      this.cleanup();
      container.innerHTML = this.render(checklist, status, jobIndex, isExpanded);
      this.attachListeners(container);
    }
  }

  /**
   * Attach event listeners
   * @param {HTMLElement} container - The container element
   */
  attachListeners(container) {
    // Handle expander (3 dots) - always present
    // When collapsed: click to expand
    // When expanded: click to collapse
    const expanderContainer = container.querySelector('.checklist-expander');
    if (expanderContainer) {
      const toggleHandler = (e) => {
        e.stopPropagation();
        const index = parseInt(expanderContainer.dataset.index, 10);
        // Check if currently expanded by looking for dropdown sibling
        const wrapper = expanderContainer.closest('.checklist-wrapper');
        const isCurrentlyExpanded = wrapper !== null;
        if (this.onToggleExpand) {
          // Toggle to opposite state
          this.onToggleExpand(index, !isCurrentlyExpanded);
        }
      };
      this.trackListener(expanderContainer, 'click', toggleHandler);
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
