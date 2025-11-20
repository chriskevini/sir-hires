// Storage operations module - handles all chrome.storage.local interactions

import { checklistTemplates } from './config.js';

export class StorageService {
  constructor() {
    this.storageChangeListeners = [];
  }
  
  // ===== Document Utilities =====
  
  /**
   * Initialize empty documents for a job
   * Creates default tailoredResume and coverLetter documents
   * @param {Object} job - Job object
   * @returns {Object} Documents object with default structure
   */
  initializeDocuments(job) {
    return {
      tailoredResume: {
        title: `${job.jobTitle || 'Resume'} - ${job.company || 'Company'}`,
        text: '',
        lastEdited: null,
        order: 0
      },
      coverLetter: {
        title: `Cover Letter - ${job.jobTitle || 'Position'} at ${job.company || 'Company'}`,
        text: '',
        lastEdited: null,
        order: 1
      }
    };
  }
  
  /**
   * Get document by key with fallback to defaults
   * @param {Object} job - Job object
   * @param {string} documentKey - Document key (e.g., 'tailoredResume')
   * @returns {Object} Document object
   */
  getDocument(job, documentKey) {
    // Ensure documents object exists
    if (!job.documents) {
      job.documents = this.initializeDocuments(job);
    }
    
    // Return the document or create default
    if (job.documents[documentKey]) {
      return job.documents[documentKey];
    }
    
    // Fallback defaults
    const defaults = this.initializeDocuments(job);
    return defaults[documentKey] || {
      title: 'Untitled Document',
      text: '',
      lastEdited: null,
      order: 0
    };
  }
  
  /**
   * Save a document to a job
   * @param {string} jobId - Job ID
   * @param {string} documentKey - Document key
   * @param {Object} documentData - Document data with title and text
   * @returns {Promise<void>}
   */
  async saveDocument(jobId, documentKey, documentData) {
    try {
      const result = await chrome.storage.local.get('jobs');
      const jobsObj = result.jobs || {};
      
      if (!jobsObj[jobId]) {
        throw new Error(`Job ${jobId} not found`);
      }
      
      // Initialize documents if needed
      if (!jobsObj[jobId].documents) {
        jobsObj[jobId].documents = this.initializeDocuments(jobsObj[jobId]);
      }
      
      // Update the document
      jobsObj[jobId].documents[documentKey] = {
        ...jobsObj[jobId].documents[documentKey],
        ...documentData,
        lastEdited: new Date().toISOString()
      };
      
      // Update job timestamp
      jobsObj[jobId].updatedAt = new Date().toISOString();
      
      await chrome.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    }
  }
  
  /**
   * Get sorted document keys from a job
   * @param {Object} job - Job object
   * @returns {Array<string>} Array of document keys sorted by order
   */
  getDocumentKeys(job) {
    if (!job.documents) {
      return ['tailoredResume', 'coverLetter'];
    }
    
    // Get all keys and sort by order
    return Object.keys(job.documents).sort((a, b) => {
      const orderA = job.documents[a]?.order ?? 999;
      const orderB = job.documents[b]?.order ?? 999;
      return orderA - orderB;
    });
  }
  
  // ===== Checklist Utilities =====
  
  /**
   * Initialize checklists for all application statuses
   * Creates a checklist object with arrays for each status
   * @returns {Object} Checklist object with status keys
   */
  initializeAllChecklists() {
    const checklist = {};
    
    // Create checklist arrays for each status
    Object.keys(checklistTemplates).forEach(status => {
      const template = checklistTemplates[status];
      const timestamp = Date.now();
      
      // Create checklist items with unique IDs
      checklist[status] = template.map((templateItem, index) => ({
        id: `item_${timestamp}_${status}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        text: templateItem.text,
        checked: false,
        order: templateItem.order
      }));
    });
    
    return checklist;
  }
  
  /**
   * Initialize checklist for a specific status (used for adding missing statuses)
   * @param {string} status - Application status
   * @returns {Array} Array of checklist items for the status
   */
  initializeChecklistForStatus(status) {
    const template = checklistTemplates[status] || checklistTemplates['Researching'];
    const timestamp = Date.now();
    
    // Create checklist items with unique IDs
    return template.map((templateItem, index) => ({
      id: `item_${timestamp}_${status}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      text: templateItem.text,
      checked: false,
      order: templateItem.order
    }));
  }
  
  // ===== Job Operations =====
  
  /**
   * Get all jobs from storage
   * @returns {Promise<Array>} Array of job objects
   */
  async getAllJobs() {
    try {
      const result = await chrome.storage.local.get('jobs');
      const jobsObj = result.jobs || {};
      
      // Convert object to array and ensure all jobs have an ID
      const jobsArray = Object.values(jobsObj).map(job => {
        if (!job.id) {
          job.id = this.generateId();
        }
        return job;
      });
      
      return jobsArray;
    } catch (error) {
      console.error('Failed to load jobs:', error);
      return [];
    }
  }
  
  /**
   * Save all jobs to storage (bulk operation for backup/restore)
   * @param {Array} jobsArray - Array of job objects
   * @returns {Promise<void>}
   */
  async saveAllJobs(jobsArray) {
    try {
      // Convert array to object format keyed by job ID
      const jobsObj = {};
      jobsArray.forEach(job => {
        if (job.id) {
          jobsObj[job.id] = job;
        } else {
          // Generate ID if missing
          job.id = this.generateId();
          jobsObj[job.id] = job;
        }
      });
      
      await chrome.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to save jobs:', error);
      throw error;
    }
  }
  
  /**
   * Update a single job by ID
   * @param {string} jobId - ID of job to update
   * @param {Object} jobData - Updated job data
   * @returns {Promise<void>}
   */
  async updateJob(jobId, jobData) {
    try {
      const result = await chrome.storage.local.get('jobs');
      const jobsObj = result.jobs || {};
      
      jobsObj[jobId] = jobData;
      
      await chrome.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to update job:', error);
      throw error;
    }
  }
  
  /**
   * Delete a single job by ID
   * @param {string} jobId - ID of job to delete
   * @returns {Promise<void>}
   */
  async deleteJob(jobId) {
    try {
      const result = await chrome.storage.local.get('jobs');
      const jobsObj = result.jobs || {};
      
      delete jobsObj[jobId];
      
      await chrome.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to delete job:', error);
      throw error;
    }
  }
  
  /**
   * Generate a unique ID for a job
   * @returns {string} Unique ID
   */
  generateId() {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // ===== Job In Focus Operations =====
  
  /**
   * Get the currently focused job ID
   * @returns {Promise<string|null>} Job ID or null
   */
  async getJobInFocus() {
    try {
      const result = await chrome.storage.local.get('jobInFocus');
      return result.jobInFocus || null;
    } catch (error) {
      console.error('Failed to get job in focus:', error);
      return null;
    }
  }
  
  /**
   * Set the currently focused job
   * @param {string} jobId - Job ID to focus
   * @returns {Promise<void>}
   */
  async setJobInFocus(jobId) {
    try {
      await chrome.storage.local.set({ jobInFocus: jobId });
    } catch (error) {
      console.error('Failed to set job in focus:', error);
      throw error;
    }
  }
  
  /**
   * Clear the focused job
   * @returns {Promise<void>}
   */
  async clearJobInFocus() {
    try {
      await chrome.storage.local.remove('jobInFocus');
    } catch (error) {
      console.error('Failed to clear job in focus:', error);
      throw error;
    }
  }
  
  // ===== Master Resume Operations =====
  
  /**
   * Get master resume from storage
   * @returns {Promise<Object|null>} Master resume object or null
   */
  async getMasterResume() {
    try {
      const result = await chrome.storage.local.get('userProfile');
      return result.userProfile || null;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }
  
  /**
   * Set/save master resume to storage
   * @param {Object} resumeData - Resume data object
   * @returns {Promise<void>}
   */
  async setMasterResume(resumeData) {
    try {
      await chrome.storage.local.set({ userProfile: resumeData });
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }
  
  // ===== Filter Preferences =====
  
  /**
   * Set/save filter preferences
   * @param {Object} filters - Filter configuration
   * @returns {Promise<void>}
   */
  async setFilters(filters) {
    try {
      await chrome.storage.local.set({ viewerFilters: filters });
    } catch (error) {
      console.error('Failed to save filters:', error);
      throw error;
    }
  }
  
  /**
   * Get filter preferences
   * @returns {Promise<Object|null>} Filter configuration or null
   */
  async getFilters() {
    try {
      const result = await chrome.storage.local.get('viewerFilters');
      return result.viewerFilters || null;
    } catch (error) {
      console.error('Failed to load filters:', error);
      return null;
    }
  }
  
  // ===== Checklist UI Preferences =====
  
  /**
   * Get global checklist expanded state
   * @returns {Promise<boolean>} Whether checklist should be expanded (default: false)
   */
  async getChecklistExpanded() {
    try {
      const result = await chrome.storage.local.get('checklistExpanded');
      return result.checklistExpanded !== undefined ? result.checklistExpanded : false;
    } catch (error) {
      console.error('Failed to get checklist expanded state:', error);
      return false;
    }
  }
  
  /**
   * Set global checklist expanded state
   * @param {boolean} isExpanded - Whether checklist should be expanded
   * @returns {Promise<void>}
   */
  async setChecklistExpanded(isExpanded) {
    try {
      await chrome.storage.local.set({ checklistExpanded: isExpanded });
    } catch (error) {
      console.error('Failed to set checklist expanded state:', error);
      throw error;
    }
  }
  
  // ===== Backup/Restore Operations =====
  
  /**
   * Create a backup of all data
   * @returns {Promise<Object>} All storage data
   */
  async createBackup() {
    try {
      const data = await chrome.storage.local.get(null);
      return data;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }
  
  /**
   * Restore data from backup
   * @param {Object} data - Backup data to restore
   * @returns {Promise<void>}
   */
  async restoreBackup(data) {
    try {
      await chrome.storage.local.clear();
      
      // Exclude dataVersion from restore to allow migration to detect and update it
      const { dataVersion, ...restoreData } = data;
      
      await chrome.storage.local.set(restoreData);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }
  
  /**
   * Clear all data from storage
   * @returns {Promise<void>}
   */
  async clearAll() {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }
  
  // ===== Storage Change Listener =====
  
  /**
   * Register a callback for storage changes
   * @param {Function} callback - Callback function
   */
  onStorageChange(callback) {
    if (typeof callback === 'function') {
      this.storageChangeListeners.push(callback);
    }
  }
  
  /**
   * Unregister a storage change callback
   * @param {Function} callback - Callback function to remove
   */
  offStorageChange(callback) {
    this.storageChangeListeners = this.storageChangeListeners.filter(
      cb => cb !== callback
    );
  }
  
  /**
   * Initialize storage change listener
   */
  initStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        this.storageChangeListeners.forEach(callback => {
          try {
            callback(changes);
          } catch (error) {
            console.error('Error in storage change listener:', error);
          }
        });
      }
    });
  }
  
  // ===== Utility Methods =====
  
  /**
   * Get storage usage statistics
   * @returns {Promise<Object>} Storage usage info
   */
  async getStorageInfo() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const data = await chrome.storage.local.get(null);
      
      return {
        bytesInUse,
        jobCount: data.jobs ? Object.keys(data.jobs).length : 0,
        hasMasterResume: Boolean(data.userProfile),
        keys: Object.keys(data)
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
}
