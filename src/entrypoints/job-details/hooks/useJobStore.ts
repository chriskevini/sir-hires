/**
 * Unified Job Store Hook
 *
 * Combines job state management and storage synchronization into a single hook.
 * Implements optimistic updates with echo cancellation to prevent UI flicker
 * and stale closure issues.
 *
 * Key features:
 * - Single source of truth for job state
 * - ID-based updates (immune to array reordering)
 * - Functional state updates (avoids stale closures)
 * - Echo cancellation (ignores storage events from our own saves)
 * - Automatic merge of external changes
 *
 * @see docs/refactors/unified-optimistic-store.md for architecture details
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { browser } from 'wxt/browser';
import {
  jobsStorage,
  jobInFocusStorage,
  viewerFiltersStorage,
  checklistExpandedStorage,
  type ViewerFilters,
} from '../../../utils/storage';
import { mergeJobs, cleanupRecentSaves } from '../../../utils/job-merge';
import type { Job, JobDocument, ChecklistItem, Filters } from './useJobState';
import { checklistTemplates } from '../config';
import {
  parseJobTemplate,
  getJobTitle,
  getCompanyName,
} from '../../../utils/job-parser';

// ============================================================================
// Types
// ============================================================================

export interface JobStoreState {
  // Core data
  jobs: Job[];
  jobInFocusId: string | null;

  // Derived/filtered data
  filteredJobs: Job[];
  selectedJobIndex: number;

  // UI state
  isLoading: boolean;
  checklistExpanded: boolean;

  // Filter state
  filters: Filters;
}

export interface JobStoreActions {
  // Job mutations
  updateJob: (jobId: string, changes: Partial<Job>) => void;
  updateJobField: (
    jobId: string,
    fieldName: string,
    value: unknown
  ) => Promise<void>;
  deleteJob: (jobId: string) => Promise<void>;
  addJob: (job: Job) => void;

  // Job queries
  getJobById: (jobId: string) => Job | undefined;
  getJobByIndex: (index: number) => Job | undefined;
  findJobIndex: (jobId: string) => number;

  // Focus management
  setJobInFocus: (jobId: string | null) => Promise<void>;

  // Selection management
  setSelectedIndex: (index: number) => void;

  // Filter management
  updateFilters: (filters: Partial<Filters>) => void;
  resetFilters: () => void;

  // UI state
  setChecklistExpanded: (expanded: boolean) => Promise<void>;

  // Checklist operations
  toggleChecklistItem: (
    jobId: string,
    status: string,
    itemId: string
  ) => Promise<void>;
  initializeChecklist: (jobId: string) => void;

  // Document operations
  initializeDocuments: (
    jobId: string,
    documents?: Record<string, JobDocument>
  ) => void;
  saveDocument: (
    jobId: string,
    documentKey: string,
    data: Partial<JobDocument>
  ) => Promise<void>;
  getDocument: (jobId: string, documentKey: string) => JobDocument | undefined;
  getDocumentKeys: (jobId: string) => string[];

  // Reload (for manual refresh)
  reload: () => Promise<void>;
}

export type JobStore = JobStoreState & JobStoreActions;

// ============================================================================
// Constants
// ============================================================================

const ECHO_WINDOW_MS = 1000; // Ignore storage echoes within 1 second
const CLEANUP_INTERVAL_MS = 5000; // Clean up old save entries every 5 seconds

const DEFAULT_FILTERS: Filters = {
  search: '',
  source: 'all',
  status: 'all',
  sort: 'newest',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for a job
 */
function generateId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Apply filters to a job array
 */
function applyFilters(jobs: Job[], filters: Filters): Job[] {
  let result = [...jobs];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter((job) => {
      const parsed = parseJobTemplate(job.content || '');
      const title = getJobTitle(parsed)?.toLowerCase() || '';
      const company = getCompanyName(parsed)?.toLowerCase() || '';
      return title.includes(searchLower) || company.includes(searchLower);
    });
  }

  // Status filter
  if (filters.status && filters.status !== 'all') {
    result = result.filter((job) => job.applicationStatus === filters.status);
  }

  // Source filter (if applicable)
  if (filters.source && filters.source !== 'all') {
    result = result.filter((job) => {
      const url = job.url || '';
      return url.toLowerCase().includes(filters.source.toLowerCase());
    });
  }

  // Sort
  result.sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return filters.sort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  return result;
}

/**
 * Create default documents for a job
 */
function createDefaultDocuments(job: Job): Record<string, JobDocument> {
  const parsed = parseJobTemplate(job.content || '');
  const jobTitle = getJobTitle(parsed) || 'Position';
  const company = getCompanyName(parsed) || 'Company';

  return {
    tailoredResume: {
      title: `${jobTitle} - ${company}`,
      text: '',
      lastEdited: null,
      order: 0,
    },
    coverLetter: {
      title: `Cover Letter - ${jobTitle} at ${company}`,
      text: '',
      lastEdited: null,
      order: 1,
    },
  };
}

/**
 * Create default checklist for all statuses
 */
function createDefaultChecklist(): Record<string, ChecklistItem[]> {
  const checklist: Record<string, ChecklistItem[]> = {};
  const timestamp = Date.now();

  Object.keys(checklistTemplates).forEach((status) => {
    const template =
      checklistTemplates[status as keyof typeof checklistTemplates];
    checklist[status] = template.map((item, index) => ({
      id: `item_${timestamp}_${status}_${index}_${Math.random().toString(36).substring(2, 11)}`,
      text: item.text,
      checked: false,
      order: item.order,
    }));
  });

  return checklist;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useJobStore(): JobStore {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [state, setState] = useState<JobStoreState>({
    jobs: [],
    jobInFocusId: null,
    filteredJobs: [],
    selectedJobIndex: -1,
    isLoading: true,
    checklistExpanded: false,
    filters: DEFAULT_FILTERS,
  });

  // Track recent saves for echo cancellation
  const recentSavesRef = useRef<Map<string, number>>(new Map());

  // Track if initial load is complete
  const isInitializedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  /**
   * Persist a job to storage (fire-and-forget for optimistic updates)
   */
  const persistJob = useCallback(async (job: Job) => {
    try {
      const jobsObj = await jobsStorage.getValue();
      jobsObj[job.id] = job;
      await jobsStorage.setValue(jobsObj);
    } catch (error) {
      console.error('[useJobStore] Failed to persist job:', error);
      // TODO: Could implement retry logic or error state here
    }
  }, []);

  /**
   * Update state with new jobs array, recalculating filtered jobs
   */
  const updateStateWithJobs = useCallback(
    (
      jobs: Job[],
      updates?: Partial<Omit<JobStoreState, 'jobs' | 'filteredJobs'>>
    ) => {
      setState((prev) => {
        const newFilters = updates?.filters ?? prev.filters;
        const filteredJobs = applyFilters(jobs, newFilters);

        return {
          ...prev,
          ...updates,
          jobs,
          filteredJobs,
          filters: newFilters,
        };
      });
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Job Mutations
  // ---------------------------------------------------------------------------

  /**
   * Update a job by ID with partial changes
   * Uses functional update to avoid stale closures
   */
  const updateJob = useCallback(
    (jobId: string, changes: Partial<Job>) => {
      setState((prev) => {
        const jobIndex = prev.jobs.findIndex((j) => j.id === jobId);
        if (jobIndex === -1) {
          console.warn('[useJobStore] updateJob: Job not found:', jobId);
          return prev;
        }

        const updatedJob: Job = {
          ...prev.jobs[jobIndex],
          ...changes,
          updatedAt: new Date().toISOString(),
        };

        const newJobs = [...prev.jobs];
        newJobs[jobIndex] = updatedJob;

        // Mark as recently saved for echo cancellation
        recentSavesRef.current.set(jobId, Date.now());

        // Persist to storage (fire-and-forget)
        persistJob(updatedJob);

        // Recalculate filtered jobs
        const filteredJobs = applyFilters(newJobs, prev.filters);

        return {
          ...prev,
          jobs: newJobs,
          filteredJobs,
        };
      });
    },
    [persistJob]
  );

  /**
   * Update a specific field on a job
   * Reads fresh data from storage first to avoid overwriting concurrent changes
   */
  const updateJobField = useCallback(
    async (jobId: string, fieldName: string, value: unknown) => {
      // For content field, use optimistic update (called frequently during typing)
      if (fieldName === 'content') {
        updateJob(jobId, { [fieldName]: value } as Partial<Job>);
        return;
      }

      // For other fields, read fresh data first to avoid overwriting content changes
      // made by useImmediateSave (which updates storage directly)
      try {
        const jobsObj = await jobsStorage.getValue();
        const freshJob = jobsObj[jobId];

        if (!freshJob) {
          console.error('[useJobStore] updateJobField: Job not found:', jobId);
          return;
        }

        const updatedJob: Job = {
          ...freshJob,
          [fieldName]: value,
          updatedAt: new Date().toISOString(),
        };

        // Mark as recently saved
        recentSavesRef.current.set(jobId, Date.now());

        // Update storage
        jobsObj[jobId] = updatedJob;
        await jobsStorage.setValue(jobsObj);

        // Update local state
        setState((prev) => {
          const jobIndex = prev.jobs.findIndex((j) => j.id === jobId);
          if (jobIndex === -1) return prev;

          const newJobs = [...prev.jobs];
          newJobs[jobIndex] = updatedJob;

          return {
            ...prev,
            jobs: newJobs,
            filteredJobs: applyFilters(newJobs, prev.filters),
          };
        });
      } catch (error) {
        console.error('[useJobStore] Failed to update job field:', error);
      }
    },
    [updateJob]
  );

  /**
   * Delete a job by ID
   * Uses background message for cross-tab consistency
   */
  const deleteJob = useCallback(async (jobId: string) => {
    // Optimistic removal from state
    setState((prev) => {
      const newJobs = prev.jobs.filter((j) => j.id !== jobId);
      const newJobInFocusId =
        prev.jobInFocusId === jobId ? null : prev.jobInFocusId;

      // Adjust selected index if needed
      let newSelectedIndex = prev.selectedJobIndex;
      const deletedIndex = prev.jobs.findIndex((j) => j.id === jobId);
      if (deletedIndex !== -1) {
        if (prev.selectedJobIndex === deletedIndex) {
          newSelectedIndex = -1;
        } else if (prev.selectedJobIndex > deletedIndex) {
          newSelectedIndex--;
        }
      }

      return {
        ...prev,
        jobs: newJobs,
        filteredJobs: applyFilters(newJobs, prev.filters),
        jobInFocusId: newJobInFocusId,
        selectedJobIndex: newSelectedIndex,
      };
    });

    // Mark as recently modified
    recentSavesRef.current.set(jobId, Date.now());

    // Persist via background message for cross-tab sync
    try {
      await browser.runtime.sendMessage({
        action: 'deleteJob',
        jobId,
      });
    } catch (error) {
      console.error('[useJobStore] Failed to delete job:', error);
      // Could restore state here on failure
    }
  }, []);

  /**
   * Add a new job
   */
  const addJob = useCallback(
    (job: Job) => {
      // Ensure job has an ID
      const jobWithId = job.id ? job : { ...job, id: generateId() };

      setState((prev) => {
        const newJobs = [...prev.jobs, jobWithId];

        // Mark as recently saved
        recentSavesRef.current.set(jobWithId.id, Date.now());

        // Persist to storage
        persistJob(jobWithId);

        return {
          ...prev,
          jobs: newJobs,
          filteredJobs: applyFilters(newJobs, prev.filters),
        };
      });
    },
    [persistJob]
  );

  // ---------------------------------------------------------------------------
  // Job Queries
  // ---------------------------------------------------------------------------

  const getJobById = useCallback(
    (jobId: string) => {
      return state.jobs.find((j) => j.id === jobId);
    },
    [state.jobs]
  );

  const getJobByIndex = useCallback(
    (index: number) => {
      return state.jobs[index];
    },
    [state.jobs]
  );

  const findJobIndex = useCallback(
    (jobId: string) => {
      return state.jobs.findIndex((j) => j.id === jobId);
    },
    [state.jobs]
  );

  // ---------------------------------------------------------------------------
  // Focus Management
  // ---------------------------------------------------------------------------

  /**
   * Set the job in focus
   * Uses background message for cross-tab sync
   */
  const setJobInFocus = useCallback(async (jobId: string | null) => {
    // Optimistic update
    setState((prev) => ({
      ...prev,
      jobInFocusId: jobId,
    }));

    // Persist via background message
    try {
      await browser.runtime.sendMessage({
        action: 'setJobInFocus',
        jobId,
      });
    } catch (error) {
      console.error('[useJobStore] Failed to set job in focus:', error);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Selection Management
  // ---------------------------------------------------------------------------

  const setSelectedIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedJobIndex: index,
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Filter Management
  // ---------------------------------------------------------------------------

  const updateFilters = useCallback((filterUpdates: Partial<Filters>) => {
    setState((prev) => {
      const newFilters = { ...prev.filters, ...filterUpdates };
      const filteredJobs = applyFilters(prev.jobs, newFilters);

      // Persist filters to storage
      viewerFiltersStorage.setValue(newFilters as ViewerFilters).catch((e) => {
        console.error('[useJobStore] Failed to persist filters:', e);
      });

      return {
        ...prev,
        filters: newFilters,
        filteredJobs,
      };
    });
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => {
      const filteredJobs = applyFilters(prev.jobs, DEFAULT_FILTERS);

      // Clear persisted filters
      viewerFiltersStorage.setValue(null).catch((e) => {
        console.error('[useJobStore] Failed to clear filters:', e);
      });

      return {
        ...prev,
        filters: DEFAULT_FILTERS,
        filteredJobs,
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // UI State
  // ---------------------------------------------------------------------------

  const setChecklistExpanded = useCallback(async (expanded: boolean) => {
    setState((prev) => ({
      ...prev,
      checklistExpanded: expanded,
    }));

    try {
      await checklistExpandedStorage.setValue(expanded);
    } catch (error) {
      console.error(
        '[useJobStore] Failed to persist checklistExpanded:',
        error
      );
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Checklist Operations
  // ---------------------------------------------------------------------------

  /**
   * Toggle a checklist item for a job
   */
  const toggleChecklistItem = useCallback(
    async (jobId: string, status: string, itemId: string) => {
      setState((prev) => {
        const jobIndex = prev.jobs.findIndex((j) => j.id === jobId);
        if (jobIndex === -1) return prev;

        const job = prev.jobs[jobIndex];
        if (!job.checklist || !job.checklist[status]) return prev;

        const updatedChecklist = { ...job.checklist };
        updatedChecklist[status] = updatedChecklist[status].map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );

        const updatedJob: Job = {
          ...job,
          checklist: updatedChecklist,
          updatedAt: new Date().toISOString(),
        };

        const newJobs = [...prev.jobs];
        newJobs[jobIndex] = updatedJob;

        // Mark as recently saved
        recentSavesRef.current.set(jobId, Date.now());

        // Persist (fire-and-forget)
        persistJob(updatedJob);

        return {
          ...prev,
          jobs: newJobs,
          filteredJobs: applyFilters(newJobs, prev.filters),
        };
      });
    },
    [persistJob]
  );

  /**
   * Initialize checklist for a job if not present
   */
  const initializeChecklist = useCallback(
    (jobId: string) => {
      setState((prev) => {
        const jobIndex = prev.jobs.findIndex((j) => j.id === jobId);
        if (jobIndex === -1) return prev;

        const job = prev.jobs[jobIndex];
        if (job.checklist) return prev; // Already initialized

        const updatedJob: Job = {
          ...job,
          checklist: createDefaultChecklist(),
          updatedAt: new Date().toISOString(),
        };

        const newJobs = [...prev.jobs];
        newJobs[jobIndex] = updatedJob;

        // Persist
        recentSavesRef.current.set(jobId, Date.now());
        persistJob(updatedJob);

        return {
          ...prev,
          jobs: newJobs,
          filteredJobs: applyFilters(newJobs, prev.filters),
        };
      });
    },
    [persistJob]
  );

  // ---------------------------------------------------------------------------
  // Document Operations
  // ---------------------------------------------------------------------------

  /**
   * Initialize documents for a job if not present
   * Optionally accepts custom documents, otherwise generates defaults
   */
  const initializeDocuments = useCallback(
    (jobId: string, documents?: Record<string, JobDocument>) => {
      setState((prev) => {
        const jobIndex = prev.jobs.findIndex((j) => j.id === jobId);
        if (jobIndex === -1) return prev;

        const job = prev.jobs[jobIndex];
        if (job.documents) return prev; // Already initialized

        const updatedJob: Job = {
          ...job,
          documents: documents || createDefaultDocuments(job),
          updatedAt: new Date().toISOString(),
        };

        const newJobs = [...prev.jobs];
        newJobs[jobIndex] = updatedJob;

        // Persist
        recentSavesRef.current.set(jobId, Date.now());
        persistJob(updatedJob);

        return {
          ...prev,
          jobs: newJobs,
          filteredJobs: applyFilters(newJobs, prev.filters),
        };
      });
    },
    [persistJob]
  );

  /**
   * Save a document to a job
   */
  const saveDocument = useCallback(
    async (jobId: string, documentKey: string, data: Partial<JobDocument>) => {
      setState((prev) => {
        const jobIndex = prev.jobs.findIndex((j) => j.id === jobId);
        if (jobIndex === -1) return prev;

        const job = prev.jobs[jobIndex];
        const documents = job.documents || createDefaultDocuments(job);

        const updatedDocuments = {
          ...documents,
          [documentKey]: {
            ...documents[documentKey],
            ...data,
            lastEdited: new Date().toISOString(),
          },
        };

        const updatedJob: Job = {
          ...job,
          documents: updatedDocuments,
          updatedAt: new Date().toISOString(),
        };

        const newJobs = [...prev.jobs];
        newJobs[jobIndex] = updatedJob;

        // Mark as recently saved
        recentSavesRef.current.set(jobId, Date.now());

        // Persist
        persistJob(updatedJob);

        return {
          ...prev,
          jobs: newJobs,
          filteredJobs: applyFilters(newJobs, prev.filters),
        };
      });
    },
    [persistJob]
  );

  /**
   * Get a document from a job
   */
  const getDocument = useCallback(
    (jobId: string, documentKey: string): JobDocument | undefined => {
      const job = state.jobs.find((j) => j.id === jobId);
      if (!job) return undefined;

      if (!job.documents) {
        const defaults = createDefaultDocuments(job);
        return defaults[documentKey];
      }

      return job.documents[documentKey];
    },
    [state.jobs]
  );

  /**
   * Get sorted document keys for a job
   */
  const getDocumentKeys = useCallback(
    (jobId: string): string[] => {
      const job = state.jobs.find((j) => j.id === jobId);
      if (!job || !job.documents) {
        return ['tailoredResume', 'coverLetter'];
      }

      return Object.keys(job.documents).sort((a, b) => {
        const orderA = job.documents![a]?.order ?? 999;
        const orderB = job.documents![b]?.order ?? 999;
        return orderA - orderB;
      });
    },
    [state.jobs]
  );

  // ---------------------------------------------------------------------------
  // Reload
  // ---------------------------------------------------------------------------

  /**
   * Manual reload from storage
   */
  const reload = useCallback(async () => {
    try {
      const [jobsObj, focusId, savedFilters, checklistExp] = await Promise.all([
        jobsStorage.getValue(),
        jobInFocusStorage.getValue(),
        viewerFiltersStorage.getValue(),
        checklistExpandedStorage.getValue(),
      ]);

      const jobs = Object.values(jobsObj);
      const filters = (savedFilters as Filters) || DEFAULT_FILTERS;

      updateStateWithJobs(jobs, {
        jobInFocusId: focusId,
        filters,
        checklistExpanded: checklistExp ?? false,
        isLoading: false,
      });
    } catch (error) {
      console.error('[useJobStore] Failed to reload:', error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [updateStateWithJobs]);

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------

  /**
   * Initial load from storage
   */
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    reload();
  }, [reload]);

  /**
   * Storage change listener with echo cancellation
   */
  useEffect(() => {
    const handleStorageChange = async (
      changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
      namespace: string
    ) => {
      if (namespace !== 'local') return;
      if (!changes.jobs && !changes.jobInFocus) return;

      // Clean up old entries from recent saves
      cleanupRecentSaves(recentSavesRef.current, CLEANUP_INTERVAL_MS);

      try {
        const [jobsObj, focusId] = await Promise.all([
          jobsStorage.getValue(),
          jobInFocusStorage.getValue(),
        ]);

        const remoteJobs = Object.values(jobsObj);

        setState((currentState) => {
          // Use merge logic with echo cancellation
          const mergedJobs = mergeJobs(
            currentState.jobs,
            remoteJobs,
            recentSavesRef.current,
            ECHO_WINDOW_MS
          );

          // Only update if jobs actually changed
          const jobsChanged =
            mergedJobs.length !== currentState.jobs.length ||
            mergedJobs.some(
              (job, i) =>
                !currentState.jobs[i] || job.id !== currentState.jobs[i].id
            );

          const focusChanged = focusId !== currentState.jobInFocusId;

          if (!jobsChanged && !focusChanged) {
            return currentState;
          }

          return {
            ...currentState,
            jobs: mergedJobs,
            filteredJobs: applyFilters(mergedJobs, currentState.filters),
            jobInFocusId: focusId,
          };
        });
      } catch (error) {
        console.error('[useJobStore] Error handling storage change:', error);
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // State
    ...state,

    // Job mutations
    updateJob,
    updateJobField,
    deleteJob,
    addJob,

    // Job queries
    getJobById,
    getJobByIndex,
    findJobIndex,

    // Focus management
    setJobInFocus,

    // Selection management
    setSelectedIndex,

    // Filter management
    updateFilters,
    resetFilters,

    // UI state
    setChecklistExpanded,

    // Checklist operations
    toggleChecklistItem,
    initializeChecklist,

    // Document operations
    initializeDocuments,
    saveDocument,
    getDocument,
    getDocumentKeys,

    // Reload
    reload,
  };
}
