// Navigation component - progress bar and navigation buttons
// Self-contained: handles both rendering and event listeners

import { progressConfig, getNavigationButtons } from './config';

export class Navigation {
  constructor() {
    this.listeners = [];
    this.onNavigate = null; // Callback when navigation button is clicked
  }

  /**
   * Update the progress bar
   * @param {string} status - Current application status
   * @param {boolean} animate - Whether to animate the transition
   */
  updateProgressBar(status, animate = true) {
    const progressBarFill = document.getElementById('progressBarFill');
    const progressBarLabel = document.getElementById('progressBarLabel');
    const progressBar = document.getElementById('progressBar');

    if (!progressBar || !progressBarFill || !progressBarLabel) {
      console.error('Progress bar elements not found');
      return;
    }

    const config = progressConfig[status] || progressConfig['Researching'];

    // Show progress bar
    progressBar.style.display = 'block';

    // Temporarily disable transitions if not animating
    if (!animate) {
      progressBarFill.style.transition = 'none';
      progressBarLabel.style.transition = 'none';
    }

    // Update fill, color, and label
    progressBarFill.style.width = `${config.fill}%`;
    progressBarFill.style.backgroundColor = config.color;
    progressBarLabel.style.color = config.textColor;
    progressBarLabel.textContent = status;

    // Re-enable transitions after a frame
    if (!animate) {
      requestAnimationFrame(() => {
        progressBarFill.style.transition = '';
        progressBarLabel.style.transition = '';
      });
    }
  }

  /**
   * Render navigation buttons for current status
   * @param {string} status - Current application status
   * @param {number} jobIndex - Global index of the job
   * @returns {string} HTML string
   */
  renderNavigationButtons(status, jobIndex) {
    const buttons = getNavigationButtons(status);
    let html = '';

    // Left button container (always render to maintain flexbox layout)
    html += `<div class="nav-button-container left">`;
    if (buttons.left) {
      const targetConfig =
        progressConfig[buttons.left.target] || progressConfig['Researching'];
      html += `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;" data-color="${targetConfig.color}">
          <span class="nav-label">${buttons.left.label}</span>
          <button class="nav-button" data-index="${jobIndex}" data-target="${buttons.left.target}" data-direction="backward" data-color="${targetConfig.color}">
            <i class="nav-arrow left"></i>
          </button>
        </div>
      `;
    }
    html += `</div>`;

    // Right button(s) container (always render to maintain flexbox layout)
    const multipleClass =
      buttons.right && buttons.right.length > 1 ? ' multiple' : '';
    html += `<div class="nav-button-container right${multipleClass}">`;

    if (buttons.right && buttons.right.length > 0) {
      buttons.right.forEach((btn) => {
        const targetConfig =
          progressConfig[btn.target] || progressConfig['Researching'];
        html += `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;" data-color="${targetConfig.color}">
            <span class="nav-label">${btn.label}</span>
            <button class="nav-button" data-index="${jobIndex}" data-target="${btn.target}" data-direction="forward" data-color="${targetConfig.color}">
              <i class="nav-arrow right"></i>
            </button>
          </div>
        `;
      });
    }

    html += `</div>`;

    return html;
  }

  /**
   * Update navigation buttons in the DOM
   * @param {string} status - Current application status
   * @param {number} jobIndex - Global index of the job
   */
  updateNavigationButtons(status, jobIndex) {
    const navButtonsContainer = document.getElementById('navButtonsContainer');
    if (!navButtonsContainer) {
      console.error('Navigation buttons container not found');
      return;
    }

    // Cleanup old listeners
    this.cleanupListeners();

    // Render new buttons
    navButtonsContainer.innerHTML = this.renderNavigationButtons(
      status,
      jobIndex
    );

    // Attach new listeners
    this.attachNavigationButtonListeners();

    // Apply CSS custom properties for colors
    this.applyButtonColors();
  }

  /**
   * Apply CSS custom properties for button colors based on data-color attributes
   */
  applyButtonColors() {
    // Apply colors to all elements with data-color attributes
    // This includes nav-button-container (left button) and inner divs (right buttons)
    document.querySelectorAll('[data-color]').forEach((element) => {
      const color = element.dataset.color;
      if (color) {
        element.style.setProperty('--nav-color', color);
      }
    });
  }

  /**
   * Attach event listeners to navigation buttons
   */
  attachNavigationButtonListeners() {
    const navButtons = document.querySelectorAll('.nav-button');

    navButtons.forEach((button) => {
      const clickHandler = (e) => {
        const index = parseInt(e.currentTarget.dataset.index, 10);
        const target = e.currentTarget.dataset.target;
        const direction = e.currentTarget.dataset.direction;

        if (this.onNavigate) {
          this.onNavigate(index, target, direction);
        }
      };

      button.addEventListener('click', clickHandler);
      this.listeners.push({
        element: button,
        event: 'click',
        handler: clickHandler,
      });
    });
  }

  /**
   * Set callback for when navigation button is clicked
   * @param {Function} callback - Function to call with (index, targetStatus, direction)
   */
  setOnNavigate(callback) {
    this.onNavigate = callback;
  }

  /**
   * Cleanup event listeners
   */
  cleanupListeners() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    this.cleanupListeners();
    this.onNavigate = null;
  }
}
