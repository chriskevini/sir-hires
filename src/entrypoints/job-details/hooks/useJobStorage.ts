import { useEffect, useCallback, useRef } from 'react';
import { checklistTemplates } from '../config';
import type { Job, JobDocument, ChecklistItem } from './useJobState';

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
      return {
        tailoredResume: {
          title: `${job.jobTitle || 'Resume'} - ${job.company || 'Company'}`,
          text: '',
          lastEdited: null,
          order: 0,
        },
        coverLetter: {
          title: `Cover Letter - ${job.jobTitle || 'Position'} at ${job.company || 'Company'}`,
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
        const result = await browser.storage.local.get('jobs');
        const jobsObj = (result.jobs || {}) as Record<string, Job>;

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

        await browser.storage.local.set({ jobs: jobsObj });
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

  // ===== Job Operations =====

  /**
   * Get all jobs from storage
   */
  const getAllJobs = useCallback(async (): Promise<Job[]> => {
    try {
      const result = await browser.storage.local.get('jobs');
      const jobsObj = (result.jobs || {}) as Record<string, Job>;

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

        await browser.storage.local.set({ jobs: jobsObj });
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
        const result = await browser.storage.local.get('jobs');
        const jobsObj = (result.jobs || {}) as Record<string, Job>;

        jobsObj[jobId] = jobData;

        await browser.storage.local.set({ jobs: jobsObj });
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
      const result = await browser.storage.local.get('jobs');
      const jobsObj = (result.jobs || {}) as Record<string, Job>;

      delete jobsObj[jobId];

      await browser.storage.local.set({ jobs: jobsObj });
    } catch (error) {
      console.error('Failed to delete job:', error);
      throw error;
    }
  }, []);

  /**
   * Generate a unique ID for a job
   */
  const generateId = useCallback((): string => {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // ===== Job In Focus Operations =====

  /**
   * Get the currently focused job ID
   */
  const getJobInFocus = useCallback(async (): Promise<string | null> => {
    try {
      const result = await browser.storage.local.get('jobInFocus');
      return (result.jobInFocus as string) || null;
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
      await browser.storage.local.set({ jobInFocus: jobId });
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
      await browser.storage.local.remove('jobInFocus');
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
      const result = await browser.storage.local.get('userProfile');
      return result.userProfile || null;
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
        await browser.storage.local.set({ userProfile: resumeData });
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
      await browser.storage.local.set({ viewerFilters: filters });
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
      const result = await browser.storage.local.get('viewerFilters');
      return result.viewerFilters || null;
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
      const result = await browser.storage.local.get('checklistExpanded');
      return result.checklistExpanded !== undefined
        ? (result.checklistExpanded as boolean)
        : false;
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
        await browser.storage.local.set({ checklistExpanded: isExpanded });
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
      const data = await browser.storage.local.get(null);
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
        await browser.storage.local.clear();

        // Exclude dataVersion from restore to allow migration to detect and update it
        const { dataVersion: _dataVersion, ...restoreData } = data;

        await browser.storage.local.set(restoreData);
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
      await browser.storage.local.clear();
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
      const bytesInUse = await browser.storage.local.getBytesInUse();
      const data = await browser.storage.local.get(null);

      return {
        bytesInUse,
        jobCount: (data.jobs as Record<string, Job>)
          ? Object.keys(data.jobs as Record<string, Job>).length
          : 0,
        hasMasterResume: Boolean(data.userProfile),
        keys: Object.keys(data),
      };
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
