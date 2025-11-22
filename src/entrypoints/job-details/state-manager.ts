// State management module - single source of truth for application state

export class StateManager {
  constructor() {
    // Job data
    this.allJobs = [];
    this.filteredJobs = [];
    this.selectedJobIndex = -1;
    this.jobInFocusId = null;

    // UI state
    this.isAnimating = false;
    this.pendingReload = false;
    this.checklistExpanded = false;

    // Filter state
    this.filters = {
      search: '',
      source: 'all',
      status: 'all',
      sort: 'newest',
    };

    // State change listeners
    this.listeners = [];
  }

  // ===== Job Data Getters =====

  getAllJobs() {
    return [...this.allJobs];
  }

  getFilteredJobs() {
    return [...this.filteredJobs];
  }

  getSelectedJob() {
    if (
      this.selectedJobIndex >= 0 &&
      this.selectedJobIndex < this.allJobs.length
    ) {
      return this.allJobs[this.selectedJobIndex];
    }
    return null;
  }

  getSelectedIndex() {
    return this.selectedJobIndex;
  }

  getJobInFocusId() {
    return this.jobInFocusId;
  }

  // ===== UI State Getters =====

  isAnimationActive() {
    return this.isAnimating;
  }

  hasPendingReload() {
    return this.pendingReload;
  }

  getChecklistExpanded() {
    return this.checklistExpanded;
  }

  // ===== Filter Getters =====

  getFilters() {
    return { ...this.filters };
  }

  // ===== Job Data Setters =====

  setAllJobs(jobs) {
    this.allJobs = Array.isArray(jobs) ? jobs : [];
    this.notifyChange('allJobs');
  }

  setFilteredJobs(jobs) {
    this.filteredJobs = Array.isArray(jobs) ? jobs : [];
    this.notifyChange('filteredJobs');
  }

  setSelectedIndex(index) {
    this.selectedJobIndex = index;
    this.notifyChange('selectedJobIndex');
  }

  setJobInFocus(jobId) {
    this.jobInFocusId = jobId;
    this.notifyChange('jobInFocusId');
  }

  clearJobInFocus() {
    this.jobInFocusId = null;
    this.notifyChange('jobInFocusId');
  }

  // ===== UI State Setters =====

  setAnimating(value) {
    this.isAnimating = Boolean(value);
    this.notifyChange('isAnimating');
  }

  setPendingReload(value) {
    this.pendingReload = Boolean(value);
    this.notifyChange('pendingReload');
  }

  setChecklistExpanded(value) {
    this.checklistExpanded = Boolean(value);
    this.notifyChange('checklistExpanded');
  }

  // ===== Filter Setters =====

  updateFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.notifyChange('filters');
  }

  resetFilters() {
    this.filters = {
      search: '',
      source: 'all',
      status: 'all',
      sort: 'newest',
    };
    this.notifyChange('filters');
  }

  // ===== Job Mutation Methods =====

  updateJob(index, jobData) {
    if (index >= 0 && index < this.allJobs.length) {
      this.allJobs[index] = { ...this.allJobs[index], ...jobData };
      this.notifyChange('allJobs');
      return true;
    }
    return false;
  }

  deleteJob(index) {
    if (index >= 0 && index < this.allJobs.length) {
      this.allJobs.splice(index, 1);

      // Adjust selected index if needed
      if (this.selectedJobIndex === index) {
        this.selectedJobIndex = -1;
      } else if (this.selectedJobIndex > index) {
        this.selectedJobIndex--;
      }

      this.notifyChange('allJobs');
      return true;
    }
    return false;
  }

  addJob(jobData) {
    this.allJobs.push(jobData);
    this.notifyChange('allJobs');
  }

  // ===== Job Query Methods =====

  findJobById(jobId) {
    return this.allJobs.find((job) => job.id === jobId);
  }

  findJobIndexById(jobId) {
    return this.allJobs.findIndex((job) => job.id === jobId);
  }

  // ===== State Change Notification =====

  onChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  offChange(callback) {
    this.listeners = this.listeners.filter((cb) => cb !== callback);
  }

  notifyChange(property) {
    this.listeners.forEach((callback) => {
      try {
        callback(property, this);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  // ===== Debug Methods =====

  getState() {
    return {
      allJobs: this.allJobs.length,
      filteredJobs: this.filteredJobs.length,
      selectedJobIndex: this.selectedJobIndex,
      jobInFocusId: this.jobInFocusId,
      isAnimating: this.isAnimating,
      pendingReload: this.pendingReload,
      checklistExpanded: this.checklistExpanded,
      filters: this.filters,
    };
  }

  logState() {
    console.info('Current State:', this.getState());
  }
}
