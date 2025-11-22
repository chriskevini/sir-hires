import { useEffect, useCallback, useRef } from 'react';
import { browser } from 'wxt/browser';
import { checklistTemplates } from '../config';
import type { Job, JobDocument, ChecklistItem } from './useJobState';
import { parseJobTemplate } from '../../../utils/job-parser';
import {
  jobsStorage,
  jobInFocusStorage,
  userProfileStorage,
  viewerFiltersStorage,
  checklistExpandedStorage,
  getAllStorageData,
  restoreStorageFromBackup,
  clearAllStorage,
  getStorageStats,
  type UserProfile,
  type ViewerFilters,
} from '../../../utils/storage';

export interface StorageChanges {
  [key: string]: {
    oldValue?: unknown;
    newValue?: unknown;
  };
}

export type StorageChangeCallback = (_changes: StorageChanges) => void;

/**
 * React hook for managing browser storage operations
 * Replaces the StorageService class with React hooks
 */
export function useJobStorage() {
  const storageChangeListenersRef = useRef<StorageChangeCallback[]>([]);

  // ===== Document Utilities =====

  /**
   * Initialize empty documents for a job
   */
  const initializeDocuments = useCallback(
    (job: Job): Record<string, JobDocument> => {
      // Parse content for title generation
      const parsed = parseJobTemplate(job.content || '');
      return {
        tailoredResume: {
          title: `${parsed.jobTitle || 'Resume'} - ${parsed.company || 'Company'}`,
          text: '',
          lastEdited: null,
          order: 0,
        },
        coverLetter: {
          title: `Cover Letter - ${parsed.jobTitle || 'Position'} at ${parsed.company || 'Company'}`,
          text: '',
          lastEdited: null,
          order: 1,
        },
      };
    },
    []
  );

  /**
   * Get document by key with fallback to defaults
   */
  const getDocument = useCallback(
    (job: Job, documentKey: string): JobDocument => {
      // Ensure documents object exists
      if (!job.documents) {
        job.documents = initializeDocuments(job);
      }

      // Return the document or create default
      if (job.documents[documentKey]) {
        return job.documents[documentKey];
      }

      // Fallback defaults
      const defaults = initializeDocuments(job);
      return (
        defaults[documentKey] || {
          title: 'Untitled Document',
          text: '',
          lastEdited: null,
          order: 0,
        }
      );
    },
    [initializeDocuments]
  );

  /**
   * Save a document to a job
   */
  const saveDocument = useCallback(
    async (
      jobId: string,
      documentKey: string,
      documentData: Partial<JobDocument>
    ): Promise<void> => {
      try {
        const jobsObj = await jobsStorage.getValue();

        if (!jobsObj[jobId]) {
          throw new Error(`Job ${jobId} not found`);
        }

        // Initialize documents if needed
        if (!jobsObj[jobId].documents) {
          jobsObj[jobId].documents = initializeDocuments(jobsObj[jobId]);
        }

        // Update the document
        jobsObj[jobId].documents![documentKey] = {
          ...jobsObj[jobId].documents![documentKey],
          ...documentData,
          lastEdited: new Date().toISOString(),
        };

        // Update job timestamp
        jobsObj[jobId].updatedAt = new Date().toISOString();

        await jobsStorage.setValue(jobsObj);
      } catch (error) {
        console.error('Failed to save document:', error);
        throw error;
      }
    },
    [initializeDocuments]
  );

  /**
   * Get sorted document keys from a job
   */
  const getDocumentKeys = useCallback((job: Job): string[] => {
    if (!job.documents) {
      return ['tailoredResume', 'coverLetter'];
    }

    // Get all keys and sort by order
    return Object.keys(job.documents).sort((a, b) => {
      const orderA = job.documents![a]?.order ?? 999;
      const orderB = job.documents![b]?.order ?? 999;
      return orderA - orderB;
    });
  }, []);

  // ===== Checklist Utilities =====

  /**
   * Initialize checklists for all application statuses
   */
  const initializeAllChecklists = useCallback((): Record<
    string,
    ChecklistItem[]
  > => {
    const checklist: Record<string, ChecklistItem[]> = {};

    // Create checklist arrays for each status
    Object.keys(checklistTemplates).forEach((status) => {
      const template =
        checklistTemplates[status as keyof typeof checklistTemplates];
      const timestamp = Date.now();

      // Create checklist items with unique IDs
      checklist[status] = template.map((templateItem, index) => ({
        id: `item_${timestamp}_${status}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        text: templateItem.text,
        checked: false,
        order: templateItem.order,
      }));
    });

    return checklist;
  }, []);

  /**
   * Initialize checklist for a specific status
   */
  const initializeChecklistForStatus = useCallback(
    (status: string): ChecklistItem[] => {
      const template =
        checklistTemplates[status as keyof typeof checklistTemplates] ||
        checklistTemplates['Researching'];
      const timestamp = Date.now();

      // Create checklist items with unique IDs
      return template.map((templateItem, index) => ({
        id: `item_${timestamp}_${status}_${index}_${Math.random().toString(36).substr(2, 9)}`,
        text: templateItem.text,
        checked: false,
        order: templateItem.order,
      }));
    },
    []
  );

  // ===== Utility Methods (used by job operations) =====

  /**
   * Generate a unique ID for a job
   */
  const generateId = useCallback((): string => {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // ===== Job Operations =====

  /**
   * Get all jobs from storage
   */
  const getAllJobs = useCallback(async (): Promise<Job[]> => {
    try {
      const jobsObj = await jobsStorage.getValue();

      // Convert object to array and ensure all jobs have an ID
      const jobsArray = Object.values(jobsObj).map((job) => {
        if (!job.id) {
          job.id = generateId();
        }
        return job;
      });

      return jobsArray;
    } catch (error) {
      console.error('Failed to load jobs:', error);
      return [];
    }
  }, [generateId]);

  /**
   * Save all jobs to storage (bulk operation for backup/restore)
   */
  const saveAllJobs = useCallback(
    async (jobsArray: Job[]): Promise<void> => {
      try {
        // Convert array to object format keyed by job ID
        const jobsObj: Record<string, Job> = {};
        jobsArray.forEach((job) => {
          if (job.id) {
            jobsObj[job.id] = job;
          } else {
            // Generate ID if missing
            job.id = generateId();
            jobsObj[job.id] = job;
          }
        });

        await jobsStorage.setValue(jobsObj);
      } catch (error) {
        console.error('Failed to save jobs:', error);
        throw error;
      }
    },
    [generateId]
  );

  /**
   * Update a single job by ID
   */
  const updateJob = useCallback(
    async (jobId: string, jobData: Job): Promise<void> => {
      try {
        const jobsObj = await jobsStorage.getValue();

        jobsObj[jobId] = jobData;

        await jobsStorage.setValue(jobsObj);
      } catch (error) {
        console.error('Failed to update job:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Delete a single job by ID
   */
  const deleteJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      const jobsObj = await jobsStorage.getValue();

      delete jobsObj[jobId];

      await jobsStorage.setValue(jobsObj);
    } catch (error) {
      console.error('Failed to delete job:', error);
      throw error;
    }
  }, []);

  // ===== Job In Focus Operations =====

  /**
   * Get the currently focused job ID
   */
  const getJobInFocus = useCallback(async (): Promise<string | null> => {
    try {
      return await jobInFocusStorage.getValue();
    } catch (error) {
      console.error('Failed to get job in focus:', error);
      return null;
    }
  }, []);

  /**
   * Set the currently focused job
   */
  const setJobInFocus = useCallback(async (jobId: string): Promise<void> => {
    try {
      await jobInFocusStorage.setValue(jobId);
    } catch (error) {
      console.error('Failed to set job in focus:', error);
      throw error;
    }
  }, []);

  /**
   * Clear the focused job
   */
  const clearJobInFocus = useCallback(async (): Promise<void> => {
    try {
      await jobInFocusStorage.removeValue();
    } catch (error) {
      console.error('Failed to clear job in focus:', error);
      throw error;
    }
  }, []);

  // ===== Master Resume Operations =====

  /**
   * Get master resume from storage
   */
  const getMasterResume = useCallback(async (): Promise<unknown> => {
    try {
      return await userProfileStorage.getValue();
    } catch (error) {
      console.error('Failed to load user profile:', error);
      return null;
    }
  }, []);

  /**
   * Set/save master resume to storage
   */
  const setMasterResume = useCallback(
    async (resumeData: unknown): Promise<void> => {
      try {
        await userProfileStorage.setValue(resumeData as UserProfile | null);
      } catch (error) {
        console.error('Failed to save user profile:', error);
        throw error;
      }
    },
    []
  );

  // ===== Filter Preferences =====

  /**
   * Set/save filter preferences
   */
  const setFilters = useCallback(async (filters: unknown): Promise<void> => {
    try {
      await viewerFiltersStorage.setValue(filters as ViewerFilters | null);
    } catch (error) {
      console.error('Failed to save filters:', error);
      throw error;
    }
  }, []);

  /**
   * Get filter preferences
   */
  const getFilters = useCallback(async (): Promise<unknown> => {
    try {
      return await viewerFiltersStorage.getValue();
    } catch (error) {
      console.error('Failed to load filters:', error);
      return null;
    }
  }, []);

  // ===== Checklist UI Preferences =====

  /**
   * Get global checklist expanded state
   */
  const getChecklistExpanded = useCallback(async (): Promise<boolean> => {
    try {
      return await checklistExpandedStorage.getValue();
    } catch (error) {
      console.error('Failed to get checklist expanded state:', error);
      return false;
    }
  }, []);

  /**
   * Set global checklist expanded state
   */
  const setChecklistExpanded = useCallback(
    async (isExpanded: boolean): Promise<void> => {
      try {
        await checklistExpandedStorage.setValue(isExpanded);
      } catch (error) {
        console.error('Failed to set checklist expanded state:', error);
        throw error;
      }
    },
    []
  );

  // ===== Backup/Restore Operations =====

  /**
   * Create a backup of all data
   */
  const createBackup = useCallback(async (): Promise<unknown> => {
    try {
      const data = await getAllStorageData();
      return data;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  }, []);

  /**
   * Restore data from backup
   */
  const restoreBackup = useCallback(
    async (data: Record<string, unknown>): Promise<void> => {
      try {
        await restoreStorageFromBackup(data);
      } catch (error) {
        console.error('Failed to restore backup:', error);
        throw error;
      }
    },
    []
  );

  /**
   * Clear all data from storage
   */
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await clearAllStorage();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }, []);

  // ===== Storage Change Listener =====

  /**
   * Register a callback for storage changes
   */
  const onStorageChange = useCallback((callback: StorageChangeCallback) => {
    if (typeof callback === 'function') {
      storageChangeListenersRef.current.push(callback);
    }
  }, []);

  /**
   * Unregister a storage change callback
   */
  const offStorageChange = useCallback((callback: StorageChangeCallback) => {
    storageChangeListenersRef.current =
      storageChangeListenersRef.current.filter((cb) => cb !== callback);
  }, []);

  /**
   * Initialize storage change listener
   */
  useEffect(() => {
    const listener = (changes: StorageChanges, namespace: string) => {
      if (namespace === 'local') {
        storageChangeListenersRef.current.forEach((callback) => {
          try {
            callback(changes);
          } catch (error) {
            console.error('Error in storage change listener:', error);
          }
        });
      }
    };

    browser.storage.onChanged.addListener(listener);

    return () => {
      browser.storage.onChanged.removeListener(listener);
    };
  }, []);

  // ===== Utility Methods =====

  /**
   * Get storage usage statistics
   */
  const getStorageInfo = useCallback(async () => {
    try {
      return await getStorageStats();
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  }, []);

  return {
    // Document utilities
    initializeDocuments,
    getDocument,
    saveDocument,
    getDocumentKeys,

    // Checklist utilities
    initializeAllChecklists,
    initializeChecklistForStatus,

    // Job operations
    getAllJobs,
    saveAllJobs,
    updateJob,
    deleteJob,
    generateId,

    // Job in focus operations
    getJobInFocus,
    setJobInFocus,
    clearJobInFocus,

    // Master resume operations
    getMasterResume,
    setMasterResume,

    // Filter preferences
    setFilters,
    getFilters,

    // Checklist UI preferences
    getChecklistExpanded,
    setChecklistExpanded,

    // Backup/restore operations
    createBackup,
    restoreBackup,
    clearAll,

    // Storage change listeners
    onStorageChange,
    offStorageChange,

    // Utility methods
    getStorageInfo,
  };
}
