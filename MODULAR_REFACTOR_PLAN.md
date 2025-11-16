# Modular Refactor Plan for job-details.js

## Overview

This document outlines the plan to refactor `job-details.js` (1,421 lines) into a modular, React-like architecture. The goal is to improve maintainability, testability, and make it easier to add features for different job application states.

**Approach:** Option B - Modular Rewrite (Build new modules in parallel, switch over all at once)

---

## Current State Analysis

**File Stats:**
- **1,421 lines** - Single monolithic file
- **39 functions** - Mix of rendering, state management, event handling, and storage
- **No modular structure** - Everything in global scope
- **Tight coupling** - DOM manipulation, business logic, and data access intertwined

**Key Problems:**
1. **Lack of separation of concerns** - Rendering, state, events, storage all mixed
2. **Global state scattered** - 8+ global variables (`allJobs`, `filteredJobs`, `selectedJobIndex`, etc.)
3. **Repetitive DOM manipulation** - Direct `innerHTML` updates throughout
4. **Animation handling complexity** - Flags and pending states scattered in multiple functions
5. **Large functions** - Some functions exceed 100+ lines (e.g., `getJobDetailHTML`, `renderJobDataPanel`)
6. **Inconsistent patterns** - Some functions return HTML, others modify DOM directly
7. **Event listener management** - Manually attached/reattached after each render

---

## Architecture Design

### React-Like Patterns

**Unidirectional Data Flow:**
```
User Action → Event Handler → Update State → Update Storage → Re-render UI
```

**Key Principles:**
- **Single source of truth** - State manager holds all application state
- **Separation of concerns** - Each module has one clear responsibility
- **Declarative rendering** - Render functions receive data, return HTML
- **Side effects isolated** - Storage and animation operations separated
- **Testable units** - Each module can be tested independently

---

## Module Structure

```
chrome-extension/
├── job-details/
│   ├── app.js                    # Main application controller
│   ├── config.js                 # Constants and configuration
│   ├── state-manager.js          # State management
│   ├── storage.js                # Storage operations
│   ├── job-service.js            # Business logic
│   ├── animations.js             # Animation system
│   ├── navigation-service.js     # Status navigation logic (coordinates transitions)
│   ├── main-view.js              # Manages which view is active (main view coordinator)
│   ├── sidebar.js                # Sidebar rendering and logic (job list)
│   ├── navigation.js             # Progress bar + navigation buttons (prev/next)
│   ├── base-view.js              # Base class for all state-specific views
│   └── views/
│       ├── researching-view.js   # "Researching" state panel
│       ├── drafting-view.js      # "Drafting" state panel (cover letter/application)
│       ├── awaiting-review-view.js  # "Awaiting Review" state panel
│       ├── interviewing-view.js  # "Interviewing" state panel
│       ├── deciding-view.js      # "Deciding" state panel
│       ├── accepted-view.js      # "Accepted" state panel (terminal)
│       ├── rejected-view.js      # "Rejected" state panel (terminal)
│       └── withdrawn-view.js     # "Withdrawn" state panel (terminal)
├── job-details.html              # Updated to use modules
├── job-details.js                # Thin wrapper that imports app.js
└── utils.js                      # Shared utilities (unchanged)
```

**Key Design Decisions:**
- **Self-contained views** - Each view handles its own rendering AND event listeners
- **Base view class** - Provides common functionality for all state views
- **Conventional naming** - No "-renderer" suffix, clearer purpose
- **Views directory** - Each job state gets its own file for easy maintenance

---

## Implementation Phases

### Phase 1: Extract Constants and Configuration
**File:** `job-details/config.js`

**Tasks:**
- Extract `statusOrder` array
- Extract progress bar configuration (`getProgressConfig`)
- Extract navigation button configuration (`getNavigationButtons`)
- Extract CSS class names used throughout
- Extract DOM element IDs

**Example:**
```javascript
export const statusOrder = [
  'Researching',
  'Drafting',
  'Awaiting Review',
  'Interviewing',
  'Deciding',
  'Accepted',
  'Rejected',
  'Withdrawn'
];

export const progressConfig = {
  'Researching': { fill: 0, color: '#e0e0e0', textColor: '#666' },
  'Drafting': { fill: 15, color: '#4caf50', textColor: '#fff' },
  'Awaiting Review': { fill: 35, color: '#2196f3', textColor: '#fff' },
  'Interviewing': { fill: 60, color: '#ff9800', textColor: '#fff' },
  'Deciding': { fill: 85, color: '#9c27b0', textColor: '#fff' },
  'Accepted': { fill: 100, color: '#4caf50', textColor: '#fff' },
  'Rejected': { fill: 100, color: '#f44336', textColor: '#fff' },
  'Withdrawn': { fill: 100, color: '#757575', textColor: '#fff' }
};

export const domIds = {
  jobsList: 'jobsList',
  detailPanel: 'detailPanel',
  searchInput: 'searchInput',
  // ...
};
```

**Estimated effort:** 1-2 hours

---

### Phase 2: Create State Management Module
**File:** `job-details/state-manager.js`

**Tasks:**
- Move global variables into `StateManager` class
- Provide getters/setters for state access
- Add state change notification system
- Handle animation state (`isAnimating`, `pendingReload`)
- Handle job selection state (`selectedJobIndex`, `jobInFocusId`)
- Handle filter/sort state

**Example API:**
```javascript
export class StateManager {
  constructor() {
    this.allJobs = [];
    this.filteredJobs = [];
    this.selectedJobIndex = -1;
    this.jobInFocusId = null;
    this.isAnimating = false;
    this.pendingReload = false;
    this.filters = {
      search: '',
      source: 'all',
      status: 'all',
      sort: 'newest'
    };
    this.listeners = [];
  }
  
  // Getters
  getAllJobs() { return [...this.allJobs]; }
  getFilteredJobs() { return [...this.filteredJobs]; }
  getSelectedJob() { return this.allJobs[this.selectedJobIndex]; }
  getSelectedIndex() { return this.selectedJobIndex; }
  getJobInFocusId() { return this.jobInFocusId; }
  isAnimationActive() { return this.isAnimating; }
  hasPendingReload() { return this.pendingReload; }
  getFilters() { return { ...this.filters }; }
  
  // Setters
  setAllJobs(jobs) {
    this.allJobs = jobs;
    this.notifyChange('allJobs');
  }
  
  setFilteredJobs(jobs) {
    this.filteredJobs = jobs;
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
  
  setAnimating(value) {
    this.isAnimating = value;
    this.notifyChange('isAnimating');
  }
  
  setPendingReload(value) {
    this.pendingReload = value;
    this.notifyChange('pendingReload');
  }
  
  updateFilters(filters) {
    this.filters = { ...this.filters, ...filters };
    this.notifyChange('filters');
  }
  
  updateJob(index, jobData) {
    if (index >= 0 && index < this.allJobs.length) {
      this.allJobs[index] = { ...this.allJobs[index], ...jobData };
      this.notifyChange('allJobs');
    }
  }
  
  deleteJob(index) {
    if (index >= 0 && index < this.allJobs.length) {
      this.allJobs.splice(index, 1);
      this.notifyChange('allJobs');
    }
  }
  
  // Notification system
  onChange(callback) {
    this.listeners.push(callback);
  }
  
  notifyChange(property) {
    this.listeners.forEach(callback => callback(property, this));
  }
}
```

**Estimated effort:** 3-4 hours

---

### Phase 3: Extract Storage Operations
**File:** `job-details/storage.js`

**Tasks:**
- Move all `chrome.storage.local` operations
- Provide clean async API for CRUD operations
- Handle conversion between array and object formats
- Add error handling and logging
- Handle storage change listeners

**Example API:**
```javascript
export class StorageService {
  constructor() {
    this.storageChangeListeners = [];
  }
  
  // Job operations
  async loadJobs() {
    const result = await chrome.storage.local.get('jobs');
    const jobsObj = result.jobs || {};
    // Ensure all jobs have an ID
    return Object.values(jobsObj).map(job => {
      if (!job.id) {
        job.id = this.generateId();
      }
      return job;
    });
  }
  
  generateId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async saveJobs(jobsArray) {
    const jobsObj = {};
    jobsArray.forEach(job => {
      if (job.id) {
        jobsObj[job.id] = job;
      }
    });
    await chrome.storage.local.set({ jobs: jobsObj });
  }
  
  async deleteJob(jobId) {
    const result = await chrome.storage.local.get('jobs');
    const jobsObj = result.jobs || {};
    delete jobsObj[jobId];
    await chrome.storage.local.set({ jobs: jobsObj });
  }
  
  // Job in focus
  async getJobInFocus() {
    const result = await chrome.storage.local.get('jobInFocus');
    return result.jobInFocus || null;
  }
  
  async setJobInFocus(jobId) {
    await chrome.storage.local.set({ jobInFocus: jobId });
  }
  
  async clearJobInFocus() {
    await chrome.storage.local.remove('jobInFocus');
  }
  
  // Master resume
  async loadMasterResume() {
    const result = await chrome.storage.local.get('masterResume');
    return result.masterResume || null;
  }
  
  // Filter preferences
  async saveFilters(filters) {
    await chrome.storage.local.set({ viewerFilters: filters });
  }
  
  async loadFilters() {
    const result = await chrome.storage.local.get('viewerFilters');
    return result.viewerFilters || null;
  }
  
  // Backup/restore
  async createBackup() {
    const data = await chrome.storage.local.get(null);
    return data;
  }
  
  async restoreBackup(data) {
    await chrome.storage.local.clear();
    await chrome.storage.local.set(data);
  }
  
  async clearAll() {
    await chrome.storage.local.clear();
  }
  
  // Storage change listener
  onStorageChange(callback) {
    this.storageChangeListeners.push(callback);
  }
  
  initStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        this.storageChangeListeners.forEach(callback => {
          callback(changes);
        });
      }
    });
  }
}
```

**Estimated effort:** 2-3 hours

---

### Phase 4: Extract Business Logic
**File:** `job-details/job-service.js`

**Tasks:**
- Move filtering logic (`filterJobs`)
- Move sorting logic (`sortJobs`)
- Move status update logic
- Move status history management
- Add validation logic
- Create backup/restore logic

**Example API:**
```javascript
export class JobService {
  constructor(config) {
    this.config = config;
  }
  
  // Filtering
  filterJobs(jobs, filters) {
    let filtered = [...jobs];
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(job => {
        return (
          job.jobTitle?.toLowerCase().includes(searchLower) ||
          job.company?.toLowerCase().includes(searchLower) ||
          job.location?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Source filter
    if (filters.source && filters.source !== 'all') {
      filtered = filtered.filter(job => job.source === filters.source);
    }
    
    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(job => {
        const status = job.applicationStatus || 'Researching';
        return status === filters.status;
      });
    }
    
    return filtered;
  }
  
  // Sorting
  sortJobs(jobs, sortBy) {
    const sorted = [...jobs];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.postedDate || 0);
          const dateB = new Date(b.updatedAt || b.postedDate || 0);
          return dateB - dateA;
        });
      case 'oldest':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.postedDate || 0);
          const dateB = new Date(b.updatedAt || b.postedDate || 0);
          return dateA - dateB;
        });
      case 'company':
        return sorted.sort((a, b) => {
          return (a.company || '').localeCompare(b.company || '');
        });
      case 'title':
        return sorted.sort((a, b) => {
          return (a.jobTitle || '').localeCompare(b.jobTitle || '');
        });
      default:
        return sorted;
    }
  }
  
  // Status management
  updateJobStatus(job, newStatus) {
    const oldStatus = job.applicationStatus || 'Researching';
    
    // Initialize status history if needed
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
    
    // Update job
    return {
      ...job,
      applicationStatus: newStatus,
      updatedAt: new Date().toISOString()
    };
  }
  
  getStatusOrder(status) {
    const index = this.config.statusOrder.indexOf(status);
    return index === -1 ? 0 : index;
  }
  
  // Validation
  validateStatusTransition(oldStatus, newStatus) {
    // Currently no restrictions, but could add business rules here
    return true;
  }
  
  // Backup/restore
  prepareBackupData(jobs, masterResume) {
    return {
      jobs,
      masterResume,
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
  }
  
  validateBackupData(data) {
    return data && (data.jobs || data.masterResume);
  }
}
```

**Estimated effort:** 3-4 hours

---

### Phase 5: Extract Animation System
**File:** `job-details/animations.js`

**Tasks:**
- Move `slideToPanel()` function
- Create animation queue/scheduler
- Handle animation state properly
- Add animation configuration (duration, easing)

**Example API:**
```javascript
export class AnimationController {
  constructor(state) {
    this.state = state;
    this.duration = 300; // ms
  }
  
  async slideToPanel(job, jobIndex, status, direction) {
    const detailPanel = document.getElementById('detailPanel');
    if (!detailPanel) return;
    
    this.state.setAnimating(true);
    
    // Determine slide direction
    const slideClass = direction === 'forward' ? 'slide-left' : 'slide-right';
    
    // Add exit animation
    detailPanel.classList.add(slideClass);
    
    // Wait for exit animation
    await new Promise(resolve => setTimeout(resolve, this.duration));
    
    // Update content (renderer will be called externally)
    detailPanel.classList.remove(slideClass);
    
    // Add enter animation
    const enterClass = direction === 'forward' ? 'slide-from-right' : 'slide-from-left';
    detailPanel.classList.add(enterClass);
    
    // Wait for enter animation
    await new Promise(resolve => setTimeout(resolve, this.duration));
    
    // Clean up
    detailPanel.classList.remove(enterClass);
    
    this.state.setAnimating(false);
    
    // Handle pending reload if needed
    if (this.state.hasPendingReload()) {
      this.state.setPendingReload(false);
      // Notify that reload can happen now
      return true;
    }
    
    return false;
  }
  
  isActive() {
    return this.state.isAnimationActive();
  }
  
  async waitForAnimation() {
    while (this.isActive()) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}
```

**Estimated effort:** 3-4 hours

---

### Phase 6: Extract View System (Self-Contained Components)
**Files:** 
- `job-details/base-view.js` (base class for all views)
- `job-details/main-view.js` (main view coordinator)
- `job-details/sidebar.js` (sidebar rendering + event handling)
- `job-details/navigation.js` (progress bar rendering + event handling)
- `job-details/views/researching-view.js` (initial implementation)
- Additional state views (drafting, awaiting-review, etc.) will be implemented later

**Tasks:**
- Create `BaseView` class with common functionality
- Create `ResearchingView` as initial implementation (other state views are out of scope for now)
- Each view handles its own rendering AND event listeners (self-contained)
- Extract sidebar as self-contained component (job list)
- Extract navigation as self-contained component (progress bar + prev/next buttons)
- Use consistent template literal patterns
- Create reusable component functions

**Note:** Only `ResearchingView` will be fully implemented in this refactor. Other state-specific views (Drafting, Awaiting Review, Interviewing, Deciding, Accepted, Rejected, Withdrawn) will be added later as separate features.

**Example Structure:**

**`base-view.js`:**
```javascript
// Base class that all state-specific views extend
export class BaseView {
  constructor(state, storage, config) {
    this.state = state;
    this.storage = storage;
    this.config = config;
  }
  
  // Abstract method - must be implemented by child classes
  render(job, index) {
    throw new Error('render() must be implemented by child class');
  }
  
  // Abstract method - must be implemented by child classes
  attachListeners(job, index) {
    throw new Error('attachListeners() must be implemented by child class');
  }
  
  // Common utility methods available to all views
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  formatDate(dateString) {
    if (!dateString) return 'Date unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  
  // Cleanup method called before view is destroyed
  cleanup() {
    // Override in child classes if needed
  }
}
```

**`views/researching-view.js`:**
```javascript
import { BaseView } from '../base-view.js';

export class ResearchingView extends BaseView {
  render(job, index) {
    return `
      <div class="view-header">
        <h2>${this.escapeHtml(job.jobTitle || 'No Title')}</h2>
        <button class="btn-delete" data-index="${index}">Delete Job</button>
      </div>
      
      <div class="job-info">
        <p><strong>Company:</strong> ${this.escapeHtml(job.company || 'Unknown')}</p>
        <p><strong>Location:</strong> ${this.escapeHtml(job.location || 'Not specified')}</p>
        ${job.salary ? `<p><strong>Salary:</strong> ${this.escapeHtml(job.salary)}</p>` : ''}
        <p><strong>Posted:</strong> ${this.formatDate(job.postedDate)}</p>
      </div>
      
      <div class="job-description">
        <h3>Job Description</h3>
        <div class="description-content">${this.escapeHtml(job.rawDescription || 'No description')}</div>
      </div>
      
      <div class="job-notes">
        <h3>Research Notes</h3>
        <textarea id="job-notes" rows="5">${this.escapeHtml(job.notes || '')}</textarea>
        <button class="btn-save-notes" data-index="${index}">Save Notes</button>
      </div>
      
      <div class="job-actions">
        <button class="btn-open-job" data-url="${this.escapeHtml(job.url || '')}">Open Job Posting</button>
      </div>
    `;
  }
  
  attachListeners(job, index) {
    // Delete button
    const deleteBtn = document.querySelector(`[data-index="${index}"].btn-delete`);
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.handleDelete(index));
    }
    
    // Save notes button
    const saveNotesBtn = document.querySelector(`[data-index="${index}"].btn-save-notes`);
    if (saveNotesBtn) {
      saveNotesBtn.addEventListener('click', () => this.handleSaveNotes(index));
    }
    
    // Open job button
    const openJobBtn = document.querySelector('.btn-open-job');
    if (openJobBtn) {
      openJobBtn.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        if (url) this.handleOpenJob(url);
      });
    }
  }
  
  async handleDelete(index) {
    if (!confirm('Delete this job? This cannot be undone.')) {
      return;
    }
    
    const job = this.state.getAllJobs()[index];
    if (job && job.id) {
      await this.storage.deleteJob(job.id);
    }
    
    this.state.deleteJob(index);
    this.state.setSelectedIndex(-1);
    await this.storage.clearJobInFocus();
    
    // Notify app to re-render
    window.dispatchEvent(new CustomEvent('job-deleted'));
  }
  
  async handleSaveNotes(index) {
    const job = this.state.getAllJobs()[index];
    const notesTextarea = document.getElementById('job-notes');
    
    if (job && notesTextarea) {
      job.notes = notesTextarea.value;
      job.updatedAt = new Date().toISOString();
      
      this.state.updateJob(index, job);
      await this.storage.saveJobs(this.state.getAllJobs());
      
      // Show feedback
      const saveBtn = document.querySelector(`[data-index="${index}"].btn-save-notes`);
      if (saveBtn) {
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;
        setTimeout(() => {
          saveBtn.textContent = originalText;
          saveBtn.disabled = false;
        }, 2000);
      }
    }
  }
  
  handleOpenJob(url) {
    if (url) {
      chrome.tabs.create({ url });
    }
  }
}
```

**`sidebar.js`:**
```javascript
// Self-contained sidebar component
export class Sidebar {
  constructor(state, storage, config) {
    this.state = state;
    this.storage = storage;
    this.config = config;
  }
  
  render(jobs, selectedIndex) {
    const container = document.getElementById('jobsList');
    if (!container) return;
    
    if (jobs.length === 0) {
      container.innerHTML = '<p class="no-jobs">No jobs match your filters.</p>';
      return;
    }
    
    container.innerHTML = jobs.map((job, index) => {
      return this.renderJobCard(job, index, index === selectedIndex);
    }).join('');
    
    // Attach listeners after rendering
    this.attachListeners();
  }
  
  renderJobCard(job, index, isSelected) {
    const status = job.applicationStatus || 'Researching';
    const statusClass = status.toLowerCase().replace(/\s+/g, '-');
    const selectedClass = isSelected ? 'selected' : '';
    
    return `
      <div class="job-card ${selectedClass}" data-index="${index}">
        <div class="job-card-header">
          <h3 class="job-title">${this.escapeHtml(job.jobTitle || 'No Title')}</h3>
          <span class="status-badge ${statusClass}">${status}</span>
        </div>
        <div class="job-card-body">
          <p class="company">${this.escapeHtml(job.company || 'Unknown Company')}</p>
          <p class="location">${this.escapeHtml(job.location || 'Location not specified')}</p>
          ${job.salary ? `<p class="salary">${this.escapeHtml(job.salary)}</p>` : ''}
        </div>
        <div class="job-card-footer">
          <span class="posted-date">${this.formatDate(job.postedDate)}</span>
          <span class="source">${this.escapeHtml(job.source || 'Unknown')}</span>
        </div>
      </div>
    `;
  }
  
  attachListeners() {
    const jobCards = document.querySelectorAll('.job-card');
    jobCards.forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.dataset.index);
        this.handleJobSelect(index);
      });
    });
  }
  
  async handleJobSelect(index) {
    // Don't select during animation
    if (this.state.isAnimationActive()) {
      return;
    }
    
    this.state.setSelectedIndex(index);
    const job = this.state.getSelectedJob();
    
    if (job && job.id) {
      await this.storage.setJobInFocus(job.id);
    }
    
    // Notify app to re-render detail panel
    window.dispatchEvent(new CustomEvent('job-selected', { detail: { index } }));
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  formatDate(dateString) {
    if (!dateString) return 'Date unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
}
```

**`navigation.js`:**
```javascript
// Self-contained navigation component (progress bar + navigation buttons)
export class Navigation {
  constructor(state, storage, config) {
    this.state = state;
    this.storage = storage;
    this.config = config;
  }
  
  render(job, index) {
    this.renderProgressBar(job);
    this.renderNavigationButtons(job, index);
  }
  
  renderProgressBar(job) {
    const container = document.getElementById('progressBar');
    if (!container) return;
    
    if (!job) {
      container.innerHTML = '';
      return;
    }
    
    const status = job.applicationStatus || 'Researching';
    const progressInfo = this.config.progressConfig[status];
    
    if (!progressInfo) {
      container.innerHTML = '<p>Unknown status</p>';
      return;
    }
    
    container.innerHTML = `
      <div class="progress-container">
        <div class="progress-label">${this.escapeHtml(status)}</div>
        <div class="progress-bar-track">
          <div 
            class="progress-bar-fill" 
            style="width: ${progressInfo.fill}%; background-color: ${progressInfo.color};"
          ></div>
        </div>
        <div class="progress-percentage">${progressInfo.fill}%</div>
      </div>
    `;
  }
  
  renderNavigationButtons(job, index) {
    const container = document.getElementById('navigationButtons');
    if (!container) return;
    
    if (!job) {
      container.innerHTML = '';
      return;
    }
    
    const status = job.applicationStatus || 'Researching';
    const currentIndex = this.config.statusOrder.indexOf(status);
    
    // Determine available navigation options
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < this.config.statusOrder.length - 1 && !this.isTerminalState(status);
    
    const prevStatus = canGoBack ? this.config.statusOrder[currentIndex - 1] : null;
    const nextStatus = canGoForward ? this.config.statusOrder[currentIndex + 1] : null;
    
    container.innerHTML = `
      <div class="navigation-buttons">
        <button 
          class="btn-nav btn-prev" 
          ${!canGoBack ? 'disabled' : ''}
          data-status="${prevStatus || ''}"
          data-index="${index}"
          data-direction="backward"
        >
          ← ${prevStatus || 'Previous'}
        </button>
        
        <button 
          class="btn-nav btn-next" 
          ${!canGoForward ? 'disabled' : ''}
          data-status="${nextStatus || ''}"
          data-index="${index}"
          data-direction="forward"
        >
          ${nextStatus || 'Next'} →
        </button>
      </div>
    `;
    
    // Attach listeners after rendering
    this.attachListeners();
  }
  
  attachListeners() {
    const navButtons = document.querySelectorAll('.btn-nav');
    navButtons.forEach(button => {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        
        const newStatus = button.dataset.status;
        const index = parseInt(button.dataset.index);
        const direction = button.dataset.direction;
        
        this.handleNavigate(index, newStatus, direction);
      });
    });
  }
  
  async handleNavigate(index, newStatus, direction) {
    // Don't navigate during animation
    if (this.state.isAnimationActive()) {
      return;
    }
    
    // Dispatch custom event for NavigationService to handle
    window.dispatchEvent(new CustomEvent('status-changed', {
      detail: { index, status: newStatus, direction }
    }));
  }
  
  isTerminalState(status) {
    return ['Accepted', 'Rejected', 'Withdrawn'].includes(status);
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
```

**`main-view.js`:**
```javascript
// Coordinates which state-specific view is displayed
import { ResearchingView } from './views/researching-view.js';
import { DraftingView } from './views/drafting-view.js';
import { AwaitingReviewView } from './views/awaiting-review-view.js';
import { InterviewingView } from './views/interviewing-view.js';
import { DecidingView } from './views/deciding-view.js';
import { AcceptedView } from './views/accepted-view.js';
import { RejectedView } from './views/rejected-view.js';
import { WithdrawnView } from './views/withdrawn-view.js';

export class MainView {
  constructor(state, storage, config) {
    this.state = state;
    this.storage = storage;
    this.config = config;
    this.currentView = null;
    
    // Initialize all views
    this.views = {
      'Researching': new ResearchingView(state, storage, config),
      'Drafting': new DraftingView(state, storage, config),
      'Awaiting Review': new AwaitingReviewView(state, storage, config),
      'Interviewing': new InterviewingView(state, storage, config),
      'Deciding': new DecidingView(state, storage, config),
      'Accepted': new AcceptedView(state, storage, config),
      'Rejected': new RejectedView(state, storage, config),
      'Withdrawn': new WithdrawnView(state, storage, config)
    };
  }
  
  render(job, index) {
    const container = document.getElementById('mainView');
    if (!container) return;
    
    if (!job) {
      container.innerHTML = '<p class="no-job-selected">Select a job to view details</p>';
      return;
    }
    
    const status = job.applicationStatus || 'Researching';
    const view = this.views[status];
    
    if (!view) {
      container.innerHTML = `<p class="error">Unknown status: ${status}</p>`;
      return;
    }
    
    // Cleanup previous view
    if (this.currentView) {
      this.currentView.cleanup();
    }
    
    // Render new view
    container.innerHTML = view.render(job, index);
    
    // Attach listeners
    view.attachListeners(job, index);
    
    // Track current view
    this.currentView = view;
  }
}
```

**Estimated effort:** 4-5 hours (only implementing ResearchingView; other state views out of scope)

---

### Phase 7: Create Navigation Service
**File:** `job-details/navigation-service.js`

**Tasks:**
- Move `navigateToState()` function
- Coordinate between state, storage, animation, and rendering
- Handle status transitions
- Update job in focus

**Example API:**
```javascript
export class NavigationService {
  constructor(state, storage, animations, mainView, navigation, jobService) {
    this.state = state;
    this.storage = storage;
    this.animations = animations;
    this.mainView = mainView;
    this.navigation = navigation;
    this.jobService = jobService;
  }
  
  async navigateToState(jobIndex, newStatus, direction) {
    const jobs = this.state.getAllJobs();
    if (jobIndex < 0 || jobIndex >= jobs.length) return;
    
    const job = jobs[jobIndex];
    const oldStatus = job.applicationStatus || 'Researching';
    
    console.log(`Navigating from ${oldStatus} to ${newStatus}`);
    
    // Update job with new status
    const updatedJob = this.jobService.updateJobStatus(job, newStatus);
    
    // Update state
    this.state.updateJob(jobIndex, updatedJob);
    
    // Save to storage
    await this.storage.saveJobs(this.state.getAllJobs());
    
    // Animate panel transition
    await this.animations.slideToPanel(updatedJob, jobIndex, newStatus, direction);
    
    // Re-render components after animation
    this.mainView.render(updatedJob, jobIndex);
    this.navigation.render(updatedJob, jobIndex);
  }
}
```

**Estimated effort:** 2-3 hours

---

### Phase 8: App-Level Event Handling
**File:** Handled within `job-details/app.js`

**Tasks:**
- Set up filter event listeners (search, source, status, sort)
- Set up toolbar button listeners (backup, restore, clear, master resume)
- Handle custom events from views (job-selected, job-deleted)
- Coordinate re-rendering after global actions

**Note:** Most event handling is now done within individual components (views, sidebar, navigation). The app only handles:
1. Filter controls (search, dropdowns)
2. Toolbar buttons (backup, restore, etc.)
3. Custom events dispatched by components

**Example (within app.js):**
```javascript
attachAppLevelListeners() {
  // Filter listeners
  document.getElementById('searchInput')?.addEventListener('input', () => this.handleFilter());
  document.getElementById('sourceFilter')?.addEventListener('change', () => this.handleFilter());
  document.getElementById('statusFilter')?.addEventListener('change', () => this.handleFilter());
  document.getElementById('sortFilter')?.addEventListener('change', () => this.handleFilter());
  
  // Toolbar buttons
  document.getElementById('masterResumeBtn')?.addEventListener('click', () => {
    window.location.href = 'resume.html';
  });
  
  document.getElementById('createBackupBtn')?.addEventListener('click', () => this.handleBackup());
  document.getElementById('restoreBackupBtn')?.addEventListener('click', () => this.handleRestore());
  document.getElementById('clearAllBtn')?.addEventListener('click', () => this.handleClearAll());
  
  // Custom events from components
  window.addEventListener('job-selected', (e) => {
    this.mainView.render(this.state.getSelectedJob(), e.detail.index);
  });
  
  window.addEventListener('job-deleted', () => {
    this.handleFilter(); // Re-apply filters and render
  });
}
```

**Estimated effort:** 2-3 hours

---

### Phase 9: Create Main Application Controller
**File:** `job-details/app.js`

**Tasks:**
- Create `JobDetailsApp` class
- Initialize all modules
- Wire up dependencies
- Handle initialization sequence
- Set up global error handling
- Coordinate module interactions
- Handle app-level event listeners (filters, toolbar buttons, custom events)

**Example:**
```javascript
import { StateManager } from './state-manager.js';
import { StorageService } from './storage.js';
import { JobService } from './job-service.js';
import { AnimationController } from './animations.js';
import { MainView } from './main-view.js';
import { Sidebar } from './sidebar.js';
import { Navigation } from './navigation.js';
import { NavigationService } from './navigation-service.js';
import * as config from './config.js';

export class JobDetailsApp {
  constructor() {
    // Initialize modules
    this.state = new StateManager();
    this.storage = new StorageService();
    this.jobService = new JobService(config);
    this.animations = new AnimationController(this.state);
    this.mainView = new MainView(this.state, this.storage, config);
    this.sidebar = new Sidebar(this.state, this.storage, config);
    this.navigation = new Navigation(this.state, this.storage, config);
    this.navigationService = new NavigationService(
      this.state,
      this.storage,
      this.animations,
      this.mainView,
      this.navigation,
      this.jobService
    );
  }
  
  async init() {
    try {
      console.log('Initializing Job Details App...');
      
      // Load initial data
      await this.loadInitialData();
      
      // Set up event listeners
      this.attachAppLevelListeners();
      
      // Render initial view
      this.renderInitialView();
      
      // Set up storage listener for multi-tab sync
      this.setupStorageListener();
      
      console.log('Job Details App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showErrorState(error);
    }
  }
  
  async loadInitialData() {
    // Load jobs
    const jobs = await this.storage.loadJobs();
    this.state.setAllJobs(jobs);
    
    // Load saved filters
    const savedFilters = await this.storage.loadFilters();
    if (savedFilters) {
      this.state.updateFilters(savedFilters);
      this.restoreFilterUI(savedFilters);
    }
    
    // Apply initial filters
    let filtered = this.jobService.filterJobs(jobs, this.state.getFilters());
    filtered = this.jobService.sortJobs(filtered, this.state.getFilters().sort);
    this.state.setFilteredJobs(filtered);
    
    // Load job in focus
    const jobInFocusId = await this.storage.getJobInFocus();
    if (jobInFocusId) {
      const index = jobs.findIndex(job => job.id === jobInFocusId);
      if (index >= 0) {
        this.state.setSelectedIndex(index);
        this.state.setJobInFocus(jobInFocusId);
      }
    }
    
    // Check resume status
    const masterResume = await this.storage.loadMasterResume();
    this.checkResumeStatus(masterResume);
  }
  
  attachAppLevelListeners() {
    // Filter controls
    document.getElementById('searchInput')?.addEventListener('input', () => this.handleFilter());
    document.getElementById('sourceFilter')?.addEventListener('change', () => this.handleFilter());
    document.getElementById('statusFilter')?.addEventListener('change', () => this.handleFilter());
    document.getElementById('sortFilter')?.addEventListener('change', () => this.handleFilter());
    
    // Toolbar buttons
    document.getElementById('masterResumeBtn')?.addEventListener('click', () => {
      window.location.href = 'resume.html';
    });
    
    document.getElementById('createBackupBtn')?.addEventListener('click', () => this.handleBackup());
    document.getElementById('restoreBackupBtn')?.addEventListener('click', () => this.handleRestore());
    document.getElementById('clearAllBtn')?.addEventListener('click', () => this.handleClearAll());
    
    // Custom events from components
    window.addEventListener('job-selected', (e) => {
      this.mainView.render(this.state.getSelectedJob(), e.detail.index);
      this.navigation.render(this.state.getSelectedJob(), e.detail.index);
    });
    
    window.addEventListener('job-deleted', async () => {
      await this.handleFilter(); // Re-apply filters and render
    });
    
    window.addEventListener('status-changed', async (e) => {
      await this.navigationService.navigateToState(e.detail.index, e.detail.status, e.detail.direction);
    });
    
    // State change listener for automatic re-rendering
    this.state.onChange((property) => {
      console.log(`State changed: ${property}`);
      // Could add automatic re-rendering here if needed
    });
  }
  
  async handleFilter() {
    // Get current filter values
    const filters = {
      search: document.getElementById('searchInput')?.value || '',
      source: document.getElementById('sourceFilter')?.value || 'all',
      status: document.getElementById('statusFilter')?.value || 'all',
      sort: document.getElementById('sortFilter')?.value || 'newest'
    };
    
    // Update state
    this.state.updateFilters(filters);
    
    // Save filters to storage
    await this.storage.saveFilters(filters);
    
    // Apply filters
    let filtered = this.jobService.filterJobs(this.state.getAllJobs(), filters);
    filtered = this.jobService.sortJobs(filtered, filters.sort);
    this.state.setFilteredJobs(filtered);
    
    // Re-render sidebar
    this.sidebar.render(filtered, this.state.getSelectedIndex());
    
    // Update empty state if needed
    if (filtered.length === 0) {
      this.mainView.render(null, -1);
    }
  }
  
  async handleBackup() {
    const jobs = this.state.getAllJobs();
    const masterResume = await this.storage.loadMasterResume();
    const backupData = this.jobService.prepareBackupData(jobs, masterResume);
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sir-hires-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async handleRestore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (!this.jobService.validateBackupData(data)) {
          alert('Invalid backup file');
          return;
        }
        
        if (!confirm('This will replace all current data. Continue?')) {
          return;
        }
        
        await this.storage.restoreBackup(data);
        location.reload();
      } catch (error) {
        console.error('Restore failed:', error);
        alert('Failed to restore backup: ' + error.message);
      }
    };
    
    input.click();
  }
  
  async handleClearAll() {
    if (!confirm('Clear all jobs and data? This cannot be undone!')) {
      return;
    }
    
    await this.storage.clearAll();
    location.reload();
  }
  
  renderInitialView() {
    this.sidebar.render(this.state.getFilteredJobs(), this.state.getSelectedIndex());
    this.mainView.render(this.state.getSelectedJob(), this.state.getSelectedIndex());
    this.navigation.render(this.state.getSelectedJob(), this.state.getSelectedIndex());
    this.populateSourceFilter();
  }
  
  setupStorageListener() {
    this.storage.initStorageListener();
    
    this.storage.onStorageChange(async (changes) => {
      // Don't reload during animation
      if (this.state.isAnimationActive()) {
        this.state.setPendingReload(true);
        return;
      }
      
      // Reload if jobs changed
      if (changes.jobs) {
        await this.loadInitialData();
        this.renderInitialView();
      }
      
      // Update job in focus if changed
      if (changes.jobInFocus) {
        const jobInFocusId = changes.jobInFocus.newValue;
        if (jobInFocusId) {
          const jobs = this.state.getAllJobs();
          const index = jobs.findIndex(job => job.id === jobInFocusId);
          if (index >= 0 && index !== this.state.getSelectedIndex()) {
            this.state.setSelectedIndex(index);
            this.state.setJobInFocus(jobInFocusId);
            this.renderInitialView();
          }
        }
      }
    });
  }
  
  restoreFilterUI(filters) {
    if (filters.search) {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = filters.search;
    }
    if (filters.source) {
      const sourceFilter = document.getElementById('sourceFilter');
      if (sourceFilter) sourceFilter.value = filters.source;
    }
    if (filters.status) {
      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) statusFilter.value = filters.status;
    }
    if (filters.sort) {
      const sortFilter = document.getElementById('sortFilter');
      if (sortFilter) sortFilter.value = filters.sort;
    }
  }
  
  populateSourceFilter() {
    const sourceFilter = document.getElementById('sourceFilter');
    if (!sourceFilter) return;
    
    const sources = new Set();
    this.state.getAllJobs().forEach(job => {
      if (job.source) sources.add(job.source);
    });
    
    const currentValue = sourceFilter.value;
    
    // Keep 'all' option and add unique sources
    sourceFilter.innerHTML = '<option value="all">All Sources</option>';
    Array.from(sources).sort().forEach(source => {
      const option = document.createElement('option');
      option.value = source;
      option.textContent = source;
      sourceFilter.appendChild(option);
    });
    
    // Restore selected value
    if (currentValue) {
      sourceFilter.value = currentValue;
    }
  }
  
  checkResumeStatus(masterResume) {
    const resumeBtn = document.getElementById('masterResumeBtn');
    const resumeHint = document.getElementById('resumeHint');
    
    if (resumeBtn && resumeHint) {
      if (masterResume && masterResume.content) {
        resumeBtn.classList.add('has-resume');
        resumeHint.classList.remove('hidden');
        resumeBtn.title = 'Master Resume Available - Click to Edit';
      } else {
        resumeBtn.classList.remove('has-resume');
        resumeHint.classList.add('hidden');
        resumeBtn.title = 'Create Master Resume';
      }
    }
  }
  
  showErrorState(error) {
    const mainView = document.getElementById('mainView');
    if (mainView) {
      mainView.innerHTML = `
        <div class="error-state">
          <h2>Error Loading Jobs</h2>
          <p>${error.message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }
}
```

**Estimated effort:** 2-3 hours

---

### Phase 10: Update Entry Point
**File:** `job-details.js` (becomes thin wrapper)

**Tasks:**
- Import and initialize the app
- Keep as minimal entry point

**Example:**
```javascript
import { JobDetailsApp } from './job-details/app.js';

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const app = new JobDetailsApp();
  await app.init();
  
  // Expose app globally for console debugging
  window.__jobDetailsApp = app;
});
```

**Estimated effort:** 30 minutes

---

### Phase 11: Update HTML for ES6 Modules
**File:** `job-details.html`

**Tasks:**
- Update script tag to use `type="module"`
- Verify Chrome extension module support
- Test module loading

**Changes:**
```html
<!-- Old -->
<script src="job-details.js"></script>

<!-- New -->
<script type="module" src="job-details.js"></script>
```

**Estimated effort:** 30 minutes

---

## Implementation Order

### Recommended Approach: Build All Modules First, Then Integrate

1. **Create directory structure** (5 min)
   ```bash
   mkdir chrome-extension/job-details
   mkdir chrome-extension/job-details/renderers
   ```

2. **Build all modules in parallel** (~15-20 hours)
   - Can work on multiple modules simultaneously
   - Each module is independent
   - Test module APIs in isolation

3. **Create app controller** (~2-3 hours)
   - Wire all modules together
   - Test integration

4. **Update entry point and HTML** (~1 hour)
   - Update `job-details.js` to import app
   - Update HTML to use modules

5. **Integration testing** (~2-3 hours)
   - Load extension with new code
   - Test all features
   - Fix integration issues
   - Test edge cases

**Total estimated time:** 20-25 hours

---

## Testing Strategy

### Module Testing (During Development)
- Test each module's API in isolation
- Use browser console to import and test modules
- Verify state management works correctly
- Test storage operations

### Integration Testing (After Assembly)
1. **Load extension** - Verify it loads without errors
2. **Job loading** - Ensure jobs load from storage
3. **Job selection** - Click job cards, verify detail panel updates
4. **Status navigation** - Test forward/backward navigation with animations
5. **Filtering** - Test search, source, status filters
6. **Sorting** - Test all sort options
7. **CRUD operations** - Create, read, update, delete jobs
8. **Backup/Restore** - Test export and import
9. **Multi-tab sync** - Open multiple tabs, verify storage listener works
10. **Master resume integration** - Test navigation to resume page
11. **Empty state** - Clear all jobs, verify empty state displays
12. **Edge cases** - Test with 0 jobs, 1 job, 100+ jobs
13. **Animations** - Verify smooth transitions, no animation conflicts

### Browser Testing
- Test in Chrome (primary target)
- Verify all Chrome extension APIs work with modules
- Check console for errors

---

## Rollback Plan

If the refactor causes critical issues:

1. **Keep old code intact** - Don't delete `job-details.js` until refactor is proven
2. **Branch strategy** - Work on feature branch, merge only when stable
3. **Backup data** - User data in `chrome.storage.local` is unaffected
4. **Quick revert** - Can revert Git commit to restore old code

---

## Benefits After Refactoring

### Code Quality
- **Modular** - Each module has single responsibility
- **Testable** - Can test modules in isolation
- **Maintainable** - Easy to find and update code
- **Readable** - Clear structure and naming

### Developer Experience
- **Easier debugging** - Can inspect each module separately
- **Faster feature development** - Clear patterns to follow
- **Less coupling** - Changes in one area don't break others
- **Better error handling** - Centralized error management

### Feature Development
- **Easy to add new job states** - Just add new panel renderer
- **Easy to add new filters** - Update job service
- **Easy to add new animations** - Update animation controller
- **Easy to add new storage** - Update storage service

---

## Post-Refactor Tasks

1. **Update documentation** - Document new architecture
2. **Add JSDoc comments** - Document module APIs
3. **Consider TypeScript** - Could add type safety in future
4. **Consider testing framework** - Could add Jest for unit tests
5. **Optimize bundle size** - Could add code splitting if needed

---

## Questions to Consider

1. **Do we want to add a build step?** (e.g., bundler like Vite, Rollup)
   - Pros: Can use advanced features, tree-shaking, minification
   - Cons: Adds complexity, requires build process

2. **Do we want to add TypeScript?**
   - Pros: Type safety, better IDE support
   - Cons: Adds compilation step, learning curve

3. **Do we want to add unit tests?**
   - Pros: Confidence in code, easier refactoring
   - Cons: Takes time to set up and write

**Recommendation:** Start with pure ES6 modules (no build step), then add tooling later if needed.

---

## Success Metrics

The refactor is successful if:

✅ All existing features work exactly as before  
✅ Code is split into logical, manageable modules  
✅ No regressions in functionality  
✅ Easier to understand code structure  
✅ Clear path to add new features  
✅ Performance is same or better  
✅ Extension loads without errors  
✅ Storage operations work correctly  
✅ Animations are smooth  
✅ Multi-tab sync works  

---

## Timeline Estimate

- **Phase 1-2:** Config + State (4-6 hours)
- **Phase 3-4:** Storage + Business Logic (5-7 hours)
- **Phase 5:** Animations (3-4 hours)
- **Phase 6:** Rendering (4-5 hours - only ResearchingView initially)
- **Phase 7:** Navigation Service (2-3 hours)
- **Phase 8:** Event Handling (4-5 hours)
- **Phase 9:** App Controller (2-3 hours)
- **Phase 10-11:** Entry Point + HTML (1 hour)
- **Testing & Integration:** (2-3 hours)

**Total:** 20-30 hours of focused development

---

## Next Steps

1. Create feature branch: `git checkout -b refactor/modular-job-details`
2. Create directory structure
3. Start building modules (begin with config.js)
4. Build and test each module independently
5. Create app controller and wire everything together
6. Test thoroughly
7. Merge when stable

---

**End of Plan**
