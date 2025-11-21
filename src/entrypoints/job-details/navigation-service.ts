// Navigation service - handles state transitions with animation and persistence
// Coordinates: state changes, storage updates, animations, and UI updates

import { statusOrder, defaults } from './config';

export class NavigationService {
  constructor(stateManager, storageService, jobService, animationController, navigation, mainView) {
    this.state = stateManager;
    this.storage = storageService;
    this.jobService = jobService;
    this.animation = animationController;
    this.navigation = navigation;
    this.mainView = mainView;
  }

  /**
   * Navigate to a new state (status) with animation
   * @param {number} jobIndex - Global index in allJobs array
   * @param {string} newStatus - Target status
   * @param {string} direction - 'forward' or 'backward'
   * @returns {Promise<boolean>} True if reload was pending
   */
  async navigateToState(jobIndex, newStatus, direction) {
    const jobs = this.state.getAllJobs();
    const job = jobs[jobIndex];
    
    if (!job) {
      console.error('Job not found at index:', jobIndex);
      return false;
    }

    const oldStatus = job.applicationStatus || defaults.status;
    
    console.log(`Navigating from ${oldStatus} to ${newStatus}`);

    // Update job status and history (in memory only, don't save yet)
    this.updateJobStatus(job, oldStatus, newStatus);

    // Update progress bar (no animation during state transition)
    this.navigation.updateProgressBar(newStatus, true);

    // Animate panel transition
    const hadPendingReload = await this.animation.slideToPanel(
      job,
      jobIndex,
      newStatus,
      direction,
      // Render callback
      (job, index) => {
        const status = job.applicationStatus || defaults.status;
        const view = this.mainView.getViewForStatus(status);
        return view.render(job, index);
      },
      // Attach listeners callback
      (job, index) => {
        this.mainView.reattachListeners(document.getElementById('detailPanel'));
        this.navigation.updateNavigationButtons(newStatus, jobIndex);
      }
    );

    // Save to storage AFTER animation completes
    // This prevents storage change listener from interrupting the animation
    await this.storage.updateJob(job.id, job);
    console.log(`Job status saved to storage after animation: ${newStatus}`);

    return hadPendingReload;
  }

  /**
   * Update job status and status history
   * @param {Object} job - The job object to update
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   */
  updateJobStatus(job, oldStatus, newStatus) {
    // Update status
    job.applicationStatus = newStatus;

    // Initialize status history if it doesn't exist
    if (!job.statusHistory) {
      job.statusHistory = [{
        status: oldStatus,
        date: job.updatedAt || new Date().toISOString()
      }];
    }

    // Add new status to history
    job.statusHistory.push({
      status: newStatus,
      date: new Date().toISOString()
    });

    // Update timestamp
    job.updatedAt = new Date().toISOString();
  }

  /**
   * Get the order index of a status
   * @param {string} status - The status
   * @returns {number} Index in status order (0-based)
   */
  getStatusOrder(status) {
    const index = statusOrder.indexOf(status);
    return index === -1 ? 0 : index;
  }

  /**
   * Check if navigation is moving backward
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - Target status
   * @returns {boolean} True if moving backward
   */
  isBackward(fromStatus, toStatus) {
    return this.getStatusOrder(toStatus) < this.getStatusOrder(fromStatus);
  }

  /**
   * Get the next status in the progression
   * @param {string} currentStatus - Current status
   * @returns {string|null} Next status or null if at end
   */
  getNextStatus(currentStatus) {
    const currentIndex = this.getStatusOrder(currentStatus);
    if (currentIndex < statusOrder.length - 1) {
      return statusOrder[currentIndex + 1];
    }
    return null;
  }

  /**
   * Get the previous status in the progression
   * @param {string} currentStatus - Current status
   * @returns {string|null} Previous status or null if at start
   */
  getPreviousStatus(currentStatus) {
    const currentIndex = this.getStatusOrder(currentStatus);
    if (currentIndex > 0) {
      return statusOrder[currentIndex - 1];
    }
    return null;
  }

  /**
   * Handle navigation button click
   * @param {number} jobIndex - Global job index
   * @param {string} targetStatus - Target status
   * @param {string} direction - 'forward' or 'backward'
   */
  async handleNavigationClick(jobIndex, targetStatus, direction) {
    // Don't navigate if animation is active
    if (this.state.isAnimationActive()) {
      console.log('Animation in progress, ignoring navigation click');
      return;
    }

    await this.navigateToState(jobIndex, targetStatus, direction);
  }
}
