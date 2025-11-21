// Animation system module - handles panel transitions and animations

export class AnimationController {
  constructor(state, config) {
    this.state = state;
    this.config = config;
    this.duration = config.animationConfig.duration;
    this.easing = config.animationConfig.easing;
  }

  /**
   * Slide to a new panel with animation
   * @param {Object} job - Job data for new panel
   * @param {number} jobIndex - Index of job
   * @param {string} status - New status
   * @param {string} direction - Animation direction ('forward' or 'backward')
   * @param {Function} renderCallback - Function to render the new content
   * @param {Function} attachListenersCallback - Function to attach event listeners
   * @returns {Promise<boolean>} True if reload was pending
   */
  async slideToPanel(
    job,
    jobIndex,
    status,
    direction,
    renderCallback,
    attachListenersCallback
  ) {
    console.log('slideToPanel called:', { direction, status });

    const panelContainer = document.getElementById(
      this.config.domIds.detailPanel
    );
    if (!panelContainer) {
      console.error('Panel container not found');
      return false;
    }

    // Set animation flag
    this.state.setAnimating(true);

    // Save current scroll position
    const currentScrollTop = panelContainer.scrollTop;

    // Get new content from render callback
    const newContent = renderCallback(job, jobIndex);

    // Create wrapper with fixed positioning
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden;';

    // Create old panel
    const oldPanel = document.createElement('div');
    oldPanel.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      padding-bottom: 60px;
      background-color: white;
      transform: translateX(0);
      transition: transform ${this.duration}ms ${this.easing};
    `;
    oldPanel.innerHTML = panelContainer.innerHTML;
    oldPanel.scrollTop = currentScrollTop;

    // Create new panel
    const newPanel = document.createElement('div');
    const startPos = direction === 'forward' ? '100%' : '-100%';
    newPanel.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 24px;
      padding-bottom: 60px;
      background-color: white;
      transform: translateX(${startPos});
      transition: transform ${this.duration}ms ${this.easing};
    `;
    newPanel.innerHTML = newContent;

    // Add panels to wrapper
    wrapper.appendChild(oldPanel);
    wrapper.appendChild(newPanel);

    // Temporarily modify container - DON'T change padding
    const originalPosition = panelContainer.style.position;
    const originalOverflow = panelContainer.style.overflow;
    const originalPadding = panelContainer.style.padding;

    panelContainer.style.position = 'relative';
    panelContainer.style.overflow = 'hidden';
    panelContainer.style.padding = '0'; // Remove padding since panels have their own

    // Replace content with wrapper
    panelContainer.innerHTML = '';
    panelContainer.appendChild(wrapper);

    console.log('Panels created, starting animation in 50ms');

    // Return a promise that resolves when animation completes
    return new Promise((resolve) => {
      // Start animation after a small delay
      setTimeout(() => {
        const endPos = direction === 'forward' ? '-100%' : '100%';
        oldPanel.style.transform = `translateX(${endPos})`;
        newPanel.style.transform = 'translateX(0)';
        console.log('Animation triggered');

        // After animation, replace with final content
        setTimeout(() => {
          console.log('Animation complete, cleaning up');

          // Remove inline styles to let CSS take over
          panelContainer.style.removeProperty('position');
          panelContainer.style.removeProperty('overflow');
          panelContainer.style.removeProperty('padding');
          panelContainer.innerHTML = newContent;

          // Attach event listeners for new content
          if (attachListenersCallback) {
            attachListenersCallback(job, jobIndex);
          }

          // Clear animation flag
          this.state.setAnimating(false);

          // Check if reload was pending
          const hadPendingReload = this.state.hasPendingReload();
          if (hadPendingReload) {
            console.log('[Viewer] Animation complete, pending reload detected');
            this.state.setPendingReload(false);
          }

          resolve(hadPendingReload);
        }, this.duration + 50); // duration + small buffer
      }, 50);
    });
  }

  /**
   * Check if animation is currently active
   * @returns {boolean} True if animating
   */
  isActive() {
    return this.state.isAnimationActive();
  }

  /**
   * Wait for current animation to complete
   * @returns {Promise<void>}
   */
  async waitForAnimation() {
    while (this.isActive()) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Cancel any pending operations
   */
  cancel() {
    if (this.state.isAnimationActive()) {
      console.warn('Cannot cancel animation in progress');
    }
    this.state.setPendingReload(false);
  }
}
