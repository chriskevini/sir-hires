// Storage operations module - handles all browser.storage.local interactions

import { checklistTemplates } from '@/config';
import type { Job, JobDocument, ChecklistItem, Filters } from './hooks';
import { generateJobId, generateItemId } from '../../utils/shared-utils';

// Type for checklist templates
type ChecklistTemplateStatus = keyof typeof checklistTemplates;

// Storage change callback type
export type StorageChangeCallback = (
  changes: Record<string, { oldValue?: unknown; newValue?: unknown }>
) => void;

// Document defaults type - uses Record for compatibility with Job.documents
type DocumentDefaults = Record<string, JobDocument>;

export class StorageService {
  private storageChangeListeners: StorageChangeCallback[] = [];

  constructor() {
    this.storageChangeListeners = [];
  }

  // ===== Document Utilities =====

  /**
   * Initialize empty documents for a job
   * Creates default tailoredResume and coverLetter documents
   */
  initializeDocuments(job: Partial<Job>): DocumentDefaults {
    return {
      tailoredResume: {
        title: `${job.content ? 'Resume' : 'Resume'} - ${job.content ? 'Company' : 'Company'}`,
        text: '',
        lastEdited: null,
        order: 0,
      },
      coverLetter: {
        title: `Cover Letter - Position at Company`,
        text: '',
        lastEdited: null,
        order: 1,
      },
    };
  }

  /**
   * Get document by key with fallback to defaults
   */
  getDocument(job: Job, documentKey: string): JobDocument {
    // Ensure documents object exists
    if (!job.documents) {
      job.documents = this.initializeDocuments(job);
    }

    // Return the document or create default
    if (job.documents && job.documents[documentKey]) {
      return job.documents[documentKey];
    }

    // Fallback defaults
    const defaults = this.initializeDocuments(job);
    return (
      defaults[documentKey] || {
        title: 'Untitled Document',
        text: '',
        lastEdited: null,
        order: 0,
      }
    );
  }

  /**
   * Save a document to a job
   */
  async saveDocument(
    jobId: string,
    documentKey: string,
    documentData: { title?: string; text?: string }
  ): Promise<void> {
    try {
      const result = await browser.storage.local.get('jobs');
      const jobsObj: Record<string, Job> = result.jobs || {};

      if (!jobsObj[jobId]) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Initialize documents if needed
      if (!jobsObj[jobId].documents) {
        jobsObj[jobId].documents = this.initializeDocuments(jobsObj[jobId]);
      }

      // Update the document
      jobsObj[jobId].documents![documentKey] = {
        ...jobsObj[jobId].documents![documentKey],
        ...documentData,
        lastEdited: new Date().toISOString(),
      };

      // Update job timestamp
      jobsObj[jobId].updatedAt = new Date().toISOString();

      await browser.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    }
  }

  /**
   * Get sorted document keys from a job
   */
  getDocumentKeys(job: Job): string[] {
    if (!job.documents) {
      return ['tailoredResume', 'coverLetter'];
    }

    // Get all keys and sort by order
    return Object.keys(job.documents).sort((a, b) => {
      const orderA = job.documents![a]?.order ?? 999;
      const orderB = job.documents![b]?.order ?? 999;
      return orderA - orderB;
    });
  }

  // ===== Checklist Utilities =====

  /**
   * Initialize checklists for all application statuses
   * Creates a checklist object with arrays for each status
   */
  initializeAllChecklists(): Record<string, ChecklistItem[]> {
    const checklist: Record<string, ChecklistItem[]> = {};

    // Create checklist arrays for each status
    Object.keys(checklistTemplates).forEach((status) => {
      const template =
        checklistTemplates[status as ChecklistTemplateStatus] || [];

      // Create checklist items with unique IDs
      checklist[status] = template.map(
        (templateItem: { text: string; order: number }, index: number) => ({
          id: generateItemId(status, index),
          text: templateItem.text,
          checked: false,
          order: templateItem.order,
        })
      );
    });

    return checklist;
  }

  /**
   * Initialize checklist for a specific status (used for adding missing statuses)
   */
  initializeChecklistForStatus(status: string): ChecklistItem[] {
    const template =
      checklistTemplates[status as ChecklistTemplateStatus] ||
      checklistTemplates['Researching'];

    // Create checklist items with unique IDs
    return template.map(
      (templateItem: { text: string; order: number }, index: number) => ({
        id: generateItemId(status, index),
        text: templateItem.text,
        checked: false,
        order: templateItem.order,
      })
    );
  }

  // ===== Job Operations =====

  /**
   * Get all jobs from storage
   */
  async getAllJobs(): Promise<Job[]> {
    try {
      const result = await browser.storage.local.get('jobs');
      const jobsObj: Record<string, Job> = result.jobs || {};

      // Convert object to array and ensure all jobs have an ID
      const jobsArray = Object.values(jobsObj).map((job: Job) => {
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
   */
  async saveAllJobs(jobsArray: Job[]): Promise<void> {
    try {
      // Convert array to object format keyed by job ID
      const jobsObj: Record<string, Job> = {};
      jobsArray.forEach((job: Job) => {
        if (job.id) {
          jobsObj[job.id] = job;
        } else {
          // Generate ID if missing
          job.id = this.generateId();
          jobsObj[job.id] = job;
        }
      });

      await browser.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to save jobs:', error);
      throw error;
    }
  }

  /**
   * Update a single job by ID
   */
  async updateJob(jobId: string, jobData: Job): Promise<void> {
    try {
      const result = await browser.storage.local.get('jobs');
      const jobsObj: Record<string, Job> = result.jobs || {};

      jobsObj[jobId] = jobData;

      await browser.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to update job:', error);
      throw error;
    }
  }

  /**
   * Delete a single job by ID
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      const result = await browser.storage.local.get('jobs');
      const jobsObj: Record<string, Job> = result.jobs || {};

      delete jobsObj[jobId];

      await browser.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to delete job:', error);
      throw error;
    }
  }

  /**
   * Generate a unique ID for a job
   */
  generateId(): string {
    return generateJobId();
  }

  // ===== Job In Focus Operations =====

  /**
   * Get the currently focused job ID
   */
  async getJobInFocus(): Promise<string | null> {
    try {
      const result = await browser.storage.local.get('jobInFocus');
      return result.jobInFocus || null;
    } catch (error) {
      console.error('Failed to get job in focus:', error);
      return null;
    }
  }

  /**
   * Set the currently focused job
   */
  async setJobInFocus(jobId: string): Promise<void> {
    try {
      await browser.storage.local.set({ jobInFocus: jobId });
    } catch (error) {
      console.error('Failed to set job in focus:', error);
      throw error;
    }
  }

  /**
   * Clear the focused job
   */
  async clearJobInFocus(): Promise<void> {
    try {
      await browser.storage.local.remove('jobInFocus');
    } catch (error) {
      console.error('Failed to clear job in focus:', error);
      throw error;
    }
  }

  // ===== Master Resume Operations =====

  /**
   * Get master resume from storage
   */
  async getMasterResume(): Promise<Record<string, unknown> | null> {
    try {
      const result = await browser.storage.local.get('userProfile');
      return result.userProfile || null;
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }

  /**
   * Set/save master resume to storage
   */
  async setMasterResume(resumeData: Record<string, unknown>): Promise<void> {
    try {
      await browser.storage.local.set({ userProfile: resumeData });
    } catch (error) {
      console.error('Failed to save user profile:', error);
      throw error;
    }
  }

  // ===== Filter Preferences =====

  /**
   * Set/save filter preferences
   */
  async setFilters(filters: Filters): Promise<void> {
    try {
      await browser.storage.local.set({ viewerFilters: filters });
    } catch (error) {
      console.error('Failed to save filters:', error);
      throw error;
    }
  }

  /**
   * Get filter preferences
   */
  async getFilters(): Promise<Filters | null> {
    try {
      const result = await browser.storage.local.get('viewerFilters');
      return result.viewerFilters || null;
    } catch (error) {
      console.error('Failed to load filters:', error);
      return null;
    }
  }

  // ===== Checklist UI Preferences =====

  /**
   * Get global checklist expanded state
   */
  async getChecklistExpanded(): Promise<boolean> {
    try {
      const result = await browser.storage.local.get('checklistExpanded');
      return result.checklistExpanded !== undefined
        ? result.checklistExpanded
        : false;
    } catch (error) {
      console.error('Failed to get checklist expanded state:', error);
      return false;
    }
  }

  /**
   * Set global checklist expanded state
   */
  async setChecklistExpanded(isExpanded: boolean): Promise<void> {
    try {
      await browser.storage.local.set({ checklistExpanded: isExpanded });
    } catch (error) {
      console.error('Failed to set checklist expanded state:', error);
      throw error;
    }
  }

  // ===== Backup/Restore Operations =====

  /**
   * Create a backup of all data
   */
  async createBackup(): Promise<Record<string, unknown>> {
    try {
      const data = await browser.storage.local.get(null);
      return data;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }

  /**
   * Restore data from backup
   */
  async restoreBackup(data: Record<string, unknown>): Promise<void> {
    try {
      await browser.storage.local.clear();

      // Exclude dataVersion from restore to allow migration to detect and update it
      const { dataVersion: _dataVersion, ...restoreData } = data;

      await browser.storage.local.set(restoreData);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  }

  /**
   * Clear all data from storage
   */
  async clearAll(): Promise<void> {
    try {
      await browser.storage.local.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  // ===== Storage Change Listener =====

  /**
   * Register a callback for storage changes
   */
  onStorageChange(callback: StorageChangeCallback): void {
    if (typeof callback === 'function') {
      this.storageChangeListeners.push(callback);
    }
  }

  /**
   * Unregister a storage change callback
   */
  offStorageChange(callback: StorageChangeCallback): void {
    this.storageChangeListeners = this.storageChangeListeners.filter(
      (cb) => cb !== callback
    );
  }

  /**
   * Initialize storage change listener
   */
  initStorageListener(): void {
    browser.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        this.storageChangeListeners.forEach((callback) => {
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
   */
  async getStorageInfo(): Promise<{
    bytesInUse: number;
    jobCount: number;
    hasMasterResume: boolean;
    keys: string[];
  } | null> {
    try {
      const bytesInUse = await browser.storage.local.getBytesInUse();
      const data = await browser.storage.local.get(null);

      return {
        bytesInUse,
        jobCount: data.jobs ? Object.keys(data.jobs).length : 0,
        hasMasterResume: Boolean(data.userProfile),
        keys: Object.keys(data),
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }
}
