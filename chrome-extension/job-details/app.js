// Main application controller - coordinates all modules and handles app-level events
// Entry point for the modular job details viewer

import { domIds } from './config.js';
import { StateManager } from './state-manager.js';
import { StorageService } from './storage.js';
import { JobService } from './job-service.js';
import { AnimationController } from './animations.js';
import { Navigation } from './navigation.js';
import { Sidebar } from './sidebar.js';
import { MainView } from './main-view.js';
import { NavigationService } from './navigation-service.js';
import { MigrationService } from './migration.js';
import * as config from './config.js';

export class JobDetailsApp {
  constructor() {
    // Initialize services
    this.state = new StateManager();
    this.storage = new StorageService();
    this.jobService = new JobService();
    
    // Initialize UI components
    this.animation = new AnimationController(this.state, config);
    this.navigation = new Navigation();
    this.sidebar = new Sidebar();
    this.mainView = new MainView();
    
    // Initialize navigation service
    this.navigationService = new NavigationService(
      this.state,
      this.storage,
      this.jobService,
      this.animation,
      this.navigation,
      this.mainView
    );

    // Flag to suppress reloads during document saves
    this.suppressReloadUntil = null;

    // Bind methods to preserve context
    this.handleStorageChange = this.handleStorageChange.bind(this);
    this.handleSaveField = this.handleSaveField.bind(this);
    this.handleSaveNotes = this.handleSaveNotes.bind(this);
    this.handleSaveNarrative = this.handleSaveNarrative.bind(this);
    this.handleOpenUrl = this.handleOpenUrl.bind(this);
    this.handleDeleteJob = this.handleDeleteJob.bind(this);
    this.handleChecklistToggleExpand = this.handleChecklistToggleExpand.bind(this);
    this.handleChecklistToggleItem = this.handleChecklistToggleItem.bind(this);
    this.handleInitializeDocuments = this.handleInitializeDocuments.bind(this);
    this.handleSaveDocument = this.handleSaveDocument.bind(this);
  }

  /**
   * Initialize the application
   */
  async init() {
    console.log('Initializing JobDetailsApp...');

    // Run data migration if needed (v0.1.0 → v0.2.0 status names)
    const migration = new MigrationService(this.storage);
    await migration.checkAndMigrate();

    // Setup event listeners
    this.setupEventListeners();

    // Load initial data
    await this.loadJobs();

    console.log('JobDetailsApp initialized');
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Storage change listener
    chrome.storage.onChanged.addListener(this.handleStorageChange);

    // Filter controls
    const searchInput = document.getElementById(domIds.searchInput);
    const sourceFilter = document.getElementById(domIds.sourceFilter);
    const statusFilter = document.getElementById(domIds.statusFilter);
    const sortFilter = document.getElementById(domIds.sortFilter);

    if (searchInput) searchInput.addEventListener('input', () => this.filterJobs());
    if (sourceFilter) sourceFilter.addEventListener('change', () => this.filterJobs());
    if (statusFilter) statusFilter.addEventListener('change', () => this.filterJobs());
    if (sortFilter) sortFilter.addEventListener('change', () => this.filterJobs());

    // Sidebar job selection
    this.sidebar.setOnJobSelect((index) => this.selectJob(index));

    // Navigation button clicks
    this.navigation.setOnNavigate((index, target, direction) => {
      this.navigationService.handleNavigationClick(index, target, direction);
    });

    // Custom events from views
    document.addEventListener('view:saveField', this.handleSaveField);
    document.addEventListener('view:saveNotes', this.handleSaveNotes);
    document.addEventListener('view:saveNarrative', this.handleSaveNarrative);
    document.addEventListener('view:openUrl', this.handleOpenUrl);
    document.addEventListener('view:deleteJob', this.handleDeleteJob);

    // Checklist events
    document.addEventListener('checklist:toggleExpand', this.handleChecklistToggleExpand);
    document.addEventListener('checklist:toggleItem', this.handleChecklistToggleItem);

    // Document events (Drafting view)
    document.addEventListener('view:initializeDocuments', this.handleInitializeDocuments);
    document.addEventListener('view:saveDocument', this.handleSaveDocument);

    // Master resume button
    const masterResumeBtn = document.getElementById(domIds.masterResumeBtn);
    if (masterResumeBtn) {
      masterResumeBtn.addEventListener('click', () => this.openMasterResume());
    }

    // Backup/restore buttons
    const createBackupBtn = document.getElementById(domIds.createBackupBtn);
    const restoreBackupBtn = document.getElementById(domIds.restoreBackupBtn);
    const clearAllBtn = document.getElementById(domIds.clearAllBtn);

    if (createBackupBtn) createBackupBtn.addEventListener('click', () => this.createBackup());
    if (restoreBackupBtn) restoreBackupBtn.addEventListener('click', () => this.restoreBackup());
    if (clearAllBtn) clearAllBtn.addEventListener('click', () => this.clearAllData());
  }

  /**
   * Load jobs from storage and display
   */
  async loadJobs() {
    console.log('loadJobs() called');

    // Check if animation is active
    if (this.state.isAnimationActive()) {
      console.log('Animation in progress, setting pending reload flag');
      this.state.setPendingReload(true);
      return;
    }

    try {
      // Load data from storage
      const [jobs, jobInFocusId, masterResume, checklistExpanded] = await Promise.all([
        this.storage.getAllJobs(),
        this.storage.getJobInFocus(),
        this.storage.getMasterResume(),
        this.storage.getChecklistExpanded()
      ]);

      // Store in state
      this.state.setAllJobs(jobs);
      this.state.setJobInFocus(jobInFocusId);
      this.state.setChecklistExpanded(checklistExpanded);

      // Check resume status
      this.checkResumeStatus(masterResume);

      // Display jobs
      if (jobs.length === 0) {
        this.showEmptyState();
      } else {
        this.hideEmptyState();
        this.populateSourceFilter();
        this.restoreFilters();
        this.filterJobs();
      }

      this.updateStats();
    } catch (error) {
      console.error('Error loading jobs:', error);
      this.showError('Error loading jobs: ' + error.message);
    }
  }

  /**
   * Filter and display jobs based on current filter settings
   */
  filterJobs() {
    const filters = this.getCurrentFilters();
    const jobs = this.state.getAllJobs();

    // Apply filters
    let filtered = this.jobService.filterJobs(jobs, filters);

    // Apply sorting
    filtered = this.jobService.sortJobs(filtered, filters.sort);

    // Store filtered jobs
    this.state.setFilteredJobs(filtered);

    // Save filter state
    this.saveFilters();

    // Render jobs
    this.renderJobs(filtered);
  }

  /**
   * Render jobs in sidebar and select appropriate job
   * @param {Array} jobs - Filtered jobs to display
   */
  renderJobs(jobs) {
    console.log('renderJobs() called with', jobs.length, 'jobs');

    const jobInFocusId = this.state.getJobInFocusId();
    const jobsList = document.getElementById(domIds.jobsList);

    // Update sidebar
    this.sidebar.update(jobsList, jobs, -1, jobInFocusId);

    // Auto-select job
    if (jobs.length > 0) {
      const indexToSelect = this.determineJobToSelect(jobs, jobInFocusId);
      this.selectJob(indexToSelect);
    } else {
      const detailPanel = document.getElementById(domIds.detailPanel);
      detailPanel.innerHTML = '<div class="detail-panel-empty">No jobs match your filters</div>';
      this.state.setSelectedIndex(-1);
    }
  }

  /**
   * Determine which job index to select
   * @param {Array} jobs - Filtered jobs
   * @param {string} jobInFocusId - ID of job in focus
   * @returns {number} Index to select
   */
  determineJobToSelect(jobs, jobInFocusId) {
    // Priority 1: Job in focus
    if (jobInFocusId) {
      const focusIndex = jobs.findIndex(job => job.id === jobInFocusId);
      if (focusIndex !== -1) {
        console.log('Auto-selecting job in focus at index:', focusIndex);
        return focusIndex;
      }
    }

    // Priority 2: Currently selected job
    const selectedIndex = this.state.getSelectedIndex();
    if (selectedIndex >= 0 && selectedIndex < jobs.length) {
      console.log('Keeping current selection:', selectedIndex);
      return selectedIndex;
    }

    // Priority 3: First job
    console.log('Selecting first job');
    return 0;
  }

  /**
   * Select a job and display its details
   * @param {number} index - Index in filtered jobs array
   */
  async selectJob(index) {
    console.log('selectJob() called with index:', index);

    const filteredJobs = this.state.getFilteredJobs();
    const job = filteredJobs[index];

    if (!job) {
      console.error('Job not found at index:', index);
      return;
    }

    // Update state
    this.state.setSelectedIndex(index);

    // Update sidebar active state
    const jobsList = document.getElementById(domIds.jobsList);
    this.sidebar.updateActiveState(jobsList, index);

    // Get global index (in allJobs array)
    const allJobs = this.state.getAllJobs();
    const globalIndex = allJobs.findIndex(j => j.id === job.id);

    // Get checklist expanded state
    const checklistExpanded = this.state.getChecklistExpanded();

    // Render job detail
    const detailPanel = document.getElementById(domIds.detailPanel);
    this.mainView.render(detailPanel, job, globalIndex, checklistExpanded);

    // Update navigation
    const status = job.applicationStatus || config.defaults.status;
    this.navigation.updateProgressBar(status, false);
    this.navigation.updateNavigationButtons(status, globalIndex);

    // Set as job in focus
    if (job.id) {
      await this.storage.setJobInFocus(job.id);
      this.state.setJobInFocus(job.id);
      console.log(`Set job ${job.id} as job in focus`);
    }
  }

  /**
   * Get current filter values from UI
   * @returns {Object} Filter values
   */
  getCurrentFilters() {
    return {
      search: document.getElementById(domIds.searchInput)?.value || '',
      source: document.getElementById(domIds.sourceFilter)?.value || '',
      status: document.getElementById(domIds.statusFilter)?.value || '',
      sort: document.getElementById(domIds.sortFilter)?.value || 'newest'
    };
  }

  /**
   * Save current filters to localStorage
   */
  saveFilters() {
    const filters = this.getCurrentFilters();
    this.state.updateFilters(filters);
    localStorage.setItem('jobViewerFilters', JSON.stringify(filters));
  }

  /**
   * Restore filters from localStorage
   */
  restoreFilters() {
    const saved = localStorage.getItem('jobViewerFilters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        this.state.updateFilters(filters);
        
        const searchInput = document.getElementById(domIds.searchInput);
        const sourceFilter = document.getElementById(domIds.sourceFilter);
        const statusFilter = document.getElementById(domIds.statusFilter);
        const sortFilter = document.getElementById(domIds.sortFilter);

        if (searchInput) searchInput.value = filters.search || '';
        if (sourceFilter) sourceFilter.value = filters.source || '';
        if (statusFilter) statusFilter.value = filters.status || '';
        if (sortFilter) sortFilter.value = filters.sort || 'newest';
      } catch (error) {
        console.error('Error restoring filters:', error);
      }
    }
  }

  /**
   * Populate source filter dropdown with unique sources
   */
  populateSourceFilter() {
    const jobs = this.state.getAllJobs();
    const sources = [...new Set(jobs.map(job => job.source).filter(Boolean))];
    const select = document.getElementById(domIds.sourceFilter);

    if (!select) return;

    // Keep the "All Sources" option
    select.innerHTML = '<option value="">All Sources</option>';

    sources.forEach(source => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      select.appendChild(option);
    });
  }

  /**
   * Update job count stats
   */
  updateStats() {
    const jobCount = document.getElementById('jobCount');
    if (jobCount) {
      jobCount.textContent = this.state.getAllJobs().length;
    }
  }

  /**
   * Show empty state
   */
  showEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const mainContent = document.querySelector('.main-content');
    const jobsList = document.getElementById(domIds.jobsList);

    if (emptyState) emptyState.classList.remove('hidden');
    if (mainContent) mainContent.style.display = 'none';
    if (jobsList) jobsList.innerHTML = '';
  }

  /**
   * Hide empty state
   */
  hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const mainContent = document.querySelector('.main-content');

    if (emptyState) emptyState.classList.add('hidden');
    if (mainContent) mainContent.style.display = 'flex';
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const jobsList = document.getElementById(domIds.jobsList);
    if (jobsList) {
      jobsList.innerHTML = `<div style="color: red; padding: 20px;">${message}</div>`;
    }
  }

  /**
   * Check if master resume exists and show/hide hint
   * @param {Object} masterResume - Master resume object
   */
  checkResumeStatus(masterResume) {
    const resumeHint = document.getElementById(domIds.resumeHint);
    if (!resumeHint) return;

    if (!masterResume || !masterResume.content || masterResume.content.trim() === '') {
      resumeHint.classList.remove('hidden');
    } else {
      resumeHint.classList.add('hidden');
    }
  }

  /**
   * Handle storage change events
   * @param {Object} changes - Storage changes
   * @param {string} areaName - Storage area name
   */
  handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;

    console.log('[Viewer] Storage changed:', Object.keys(changes));

    // Check if reload is suppressed (during document auto-save)
    if (this.suppressReloadUntil && Date.now() < this.suppressReloadUntil) {
      console.log('[Viewer] Reload suppressed during document save');
      return;
    }

    // Check if animation is active
    if (this.state.isAnimationActive()) {
      console.log('[Viewer] Animation in progress, setting pending reload flag');
      this.state.setPendingReload(true);
      return;
    }

    // Reload jobs if they changed
    if (changes.jobs || changes.jobInFocus) {
      console.log('[Viewer] Jobs changed, reloading...');
      this.loadJobs();
    }
  }

  /**
   * Handle save field event (generic field save from editable components)
   * @param {CustomEvent} event - Custom event with detail: { index, fieldName, value }
   */
  async handleSaveField(event) {
    const { index, fieldName, value } = event.detail;
    const jobs = this.state.getAllJobs();
    const job = jobs[index];

    if (!job) {
      console.error('Job not found at index:', index);
      return;
    }

    // Update the field
    job[fieldName] = value;
    job.updatedAt = new Date().toISOString();

    await this.storage.updateJob(job.id, job);

    console.log(`Updated ${fieldName} for job at index ${index}`);
  }

  /**
   * Handle save notes event
   * @param {CustomEvent} event - Custom event with detail: { index, notes }
   */
  async handleSaveNotes(event) {
    const { index, notes } = event.detail;
    const jobs = this.state.getAllJobs();
    const job = jobs[index];

    if (!job) {
      console.error('Job not found at index:', index);
      return;
    }

    job.notes = notes;
    job.updatedAt = new Date().toISOString();

    await this.storage.updateJob(job.id, job);

    // Visual feedback
    this.showSaveConfirmation(`btn-save-notes[data-index="${index}"]`, 'Saved!');

    console.log(`Updated notes for job at index ${index}`);
  }

  /**
   * Handle save narrative event
   * @param {CustomEvent} event - Custom event with detail: { index, narrativeStrategy }
   */
  async handleSaveNarrative(event) {
    const { index, narrativeStrategy } = event.detail;
    const jobs = this.state.getAllJobs();
    const job = jobs[index];

    if (!job) {
      console.error('Job not found at index:', index);
      return;
    }

    job.narrativeStrategy = narrativeStrategy;
    job.updatedAt = new Date().toISOString();

    await this.storage.updateJob(job.id, job);

    // Visual feedback
    this.showSaveConfirmation(`btn-save-narrative[data-index="${index}"]`, 'Saved!');

    console.log(`Updated narrative strategy for job at index ${index}`);
  }

  /**
   * Handle open URL event
   * @param {CustomEvent} event - Custom event with detail: { url }
   */
  handleOpenUrl(event) {
    const { url } = event.detail;
    if (url) {
      window.open(url, '_blank');
    }
  }

  /**
   * Handle delete job event
   * @param {CustomEvent} event - Custom event with detail: { index }
   */
  async handleDeleteJob(event) {
    const { index } = event.detail;

    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    const jobs = this.state.getAllJobs();
    const job = jobs[index];

    if (!job) {
      console.error('Job not found at index:', index);
      return;
    }

    await this.storage.deleteJob(job.id);
    await this.loadJobs();

    console.log(`Deleted job at index ${index}`);
  }

  /**
   * Handle checklist toggle expand event
   * @param {CustomEvent} event - Custom event with detail: { index, isExpanded }
   */
  async handleChecklistToggleExpand(event) {
    const { index, isExpanded } = event.detail;
    
    // Toggle global checklist expanded state
    this.state.setChecklistExpanded(isExpanded);
    await this.storage.setChecklistExpanded(isExpanded);

    // Re-render the checklist for the current job WITH ANIMATION (user-triggered)
    const jobs = this.state.getAllJobs();
    const job = jobs[index];
    
    if (job && this.mainView.currentView && this.mainView.currentView.renderChecklist) {
      this.mainView.currentView.renderChecklist(job, index, isExpanded, true); // animate = true
    }

    console.log(`Toggled checklist expand globally to ${isExpanded}`);
  }

  /**
   * Handle checklist toggle item event
   * @param {CustomEvent} event - Custom event with detail: { index, itemId }
   */
  async handleChecklistToggleItem(event) {
    const { index, itemId } = event.detail;
    const jobs = this.state.getAllJobs();
    const job = jobs[index];

    if (!job || !job.checklist) {
      console.error('Job or checklist not found at index:', index);
      return;
    }

    // Find and toggle the item in the current status's checklist
    const currentStatusItems = job.checklist[job.applicationStatus];
    if (!currentStatusItems) {
      console.error('Checklist not found for status:', job.applicationStatus);
      return;
    }

    const item = currentStatusItems.find(i => i.id === itemId);
    if (item) {
      item.checked = !item.checked;
      job.updatedAt = new Date().toISOString();

      await this.storage.updateJob(job.id, job);

      // Get current expanded state
      const checklistExpanded = this.state.getChecklistExpanded();

      // Re-render the checklist
      if (this.mainView.currentView && this.mainView.currentView.renderChecklist) {
        this.mainView.currentView.renderChecklist(job, index, checklistExpanded);
      }

    }
  }

  /**
   * Handle initialize documents event (called when entering Drafting state)
   * @param {CustomEvent} event - Custom event with detail: { index }
   */
  async handleInitializeDocuments(event) {
    const { index } = event.detail;
    const jobs = this.state.getAllJobs();
    const job = jobs[index];

    if (!job) {
      console.error('Job not found at index:', index);
      return;
    }

    // Initialize documents if not already present
    if (!job.documents) {
      job.documents = this.storage.initializeDocuments(job);
      job.updatedAt = new Date().toISOString();
      await this.storage.updateJob(job.id, job);
      console.log(`Initialized documents for job at index ${index}`);
    }
  }

  /**
   * Handle save document event (called on auto-save or manual save)
   * @param {CustomEvent} event - Custom event with detail: { index, documentKey, documentData }
   */
  async handleSaveDocument(event) {
    const { index, documentKey, documentData } = event.detail;
    const jobs = this.state.getAllJobs();
    const job = jobs[index];

    if (!job) {
      console.error('Job not found at index:', index);
      return;
    }

    // Suppress reloads for 500ms to prevent auto-save from triggering view reload
    this.suppressReloadUntil = Date.now() + 500;

    // Save document to storage
    await this.storage.saveDocument(job.id, documentKey, documentData);

    console.log(`Saved document ${documentKey} for job at index ${index}`);
  }

  /**
   * Show save confirmation feedback
   * @param {string} selector - Button selector
   * @param {string} message - Confirmation message
   */
  showSaveConfirmation(selector, message) {
    const button = document.querySelector(`.${selector}`);
    if (button) {
      const originalText = button.textContent;
      button.textContent = message;
      button.style.backgroundColor = '#1a73e8';

      setTimeout(() => {
        button.textContent = originalText;
        button.style.backgroundColor = '';
      }, 2000);
    }
  }

  /**
   * Open master resume page
   */
  openMasterResume() {
    window.location.href = 'profile.html';
  }

  /**
   * Create backup of all data
   */
  async createBackup() {
    const storageData = await this.storage.createBackup();
    
    // Get version from manifest
    const manifestData = chrome.runtime.getManifest();
    const version = manifestData.version;
    
    // Create V1 format backup with metadata wrapper
    // Note: dataVersion is excluded from backup data (it's internal migration tracking)
    const { dataVersion, ...cleanData } = storageData;
    
    const backup = {
      version: version,  // Use semantic version from manifest (e.g., "0.2.0")
      exportDate: new Date().toISOString(),
      data: cleanData
    };
    
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sir-hires-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    alert('Backup created successfully!');
  }

  /**
   * Restore backup from file
   */
  async restoreBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        
        // Validate and extract data based on format
        let dataToRestore;
        let backupVersion;
        let exportDate;
        
        if (backup.version && backup.data) {
          // V1 format with metadata wrapper
          backupVersion = backup.version;
          exportDate = backup.exportDate;
          dataToRestore = backup.data;
          
          // Show confirmation with metadata
          const jobCount = Object.keys(dataToRestore.jobs || {}).length;
          const dateStr = exportDate ? new Date(exportDate).toLocaleString() : 'Unknown';
          const confirmMsg = `Restore backup from ${dateStr}?\n\nVersion: ${backupVersion}\nJobs: ${jobCount}\n\nThis will overwrite all current data.`;
          
          if (!confirm(confirmMsg)) {
            return;
          }
        } else if (backup.jobs) {
          // Legacy V2 format (raw storage) - support for backwards compatibility
          backupVersion = backup.dataVersion ? `0.${backup.dataVersion}.0` : '0.1.0';
          dataToRestore = backup;
          
          const jobCount = Object.keys(dataToRestore.jobs || {}).length;
          const confirmMsg = `Restore legacy backup?\n\nVersion: ${backupVersion} (estimated)\nJobs: ${jobCount}\n\nThis will overwrite all current data.`;
          
          if (!confirm(confirmMsg)) {
            return;
          }
        } else {
          alert('Invalid backup file format.');
          return;
        }
        
        await this.storage.restoreBackup(dataToRestore);
        
        // Run migration check after restore in case backup has old status names
        const migration = new MigrationService(this.storage);
        await migration.checkAndMigrate();
        
        alert('Backup restored successfully!');
        await this.loadJobs();
      } catch (error) {
        console.error('Error restoring backup:', error);
        alert('Error restoring backup: ' + error.message);
      }
    };
    input.click();
  }

  /**
   * Clear all data
   */
  async clearAllData() {
    if (!confirm('Are you sure you want to delete ALL jobs? This cannot be undone!')) {
      return;
    }

    if (!confirm('This will permanently delete all your saved jobs. Are you absolutely sure?')) {
      return;
    }

    await chrome.storage.local.clear();
    await this.loadJobs();
    alert('All data cleared.');
  }

  /**
   * Cleanup and destroy the app
   */
  cleanup() {
    // Remove event listeners
    chrome.storage.onChanged.removeListener(this.handleStorageChange);
    document.removeEventListener('view:saveField', this.handleSaveField);
    document.removeEventListener('view:saveNotes', this.handleSaveNotes);
    document.removeEventListener('view:saveNarrative', this.handleSaveNarrative);
    document.removeEventListener('view:openUrl', this.handleOpenUrl);
    document.removeEventListener('view:deleteJob', this.handleDeleteJob);
    document.removeEventListener('checklist:toggleExpand', this.handleChecklistToggleExpand);
    document.removeEventListener('checklist:toggleItem', this.handleChecklistToggleItem);
    document.removeEventListener('view:initializeDocuments', this.handleInitializeDocuments);
    document.removeEventListener('view:saveDocument', this.handleSaveDocument);

    // Cleanup components
    this.sidebar.cleanup();
    this.navigation.cleanup();
    this.mainView.cleanup();
  }
}
