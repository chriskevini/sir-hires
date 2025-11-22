import { useState, useCallback } from 'react';

// Types
export interface Job {
  id: string;
  content?: string; // Raw MarkdownDB template (source of truth)
  url: string;
  applicationStatus: string;
  checklist?: Record<string, ChecklistItem[]>;
  documents?: Record<string, JobDocument>;
  updatedAt: string;
  createdAt: string;
  // Transient extraction state (not persisted)
  isExtracting?: boolean;
  extractionError?: string;
}

export interface JobDocument {
  title: string;
  text: string;
  lastEdited: string | null;
  order: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

export interface Filters {
  search: string;
  source: string;
  status: string;
  sort: string;
}

export interface JobState {
  // Job data
  allJobs: Job[];
  filteredJobs: Job[];
  selectedJobIndex: number;
  jobInFocusId: string | null;

  // UI state
  isAnimating: boolean;
  pendingReload: boolean;
  checklistExpanded: boolean;

  // Filter state
  filters: Filters;
}

/**
 * React hook for managing job application state
 * Replaces the StateManager class with React state management
 */
export function useJobState() {
  // Initialize state
  const [state, setState] = useState<JobState>({
    allJobs: [],
    filteredJobs: [],
    selectedJobIndex: -1,
    jobInFocusId: null,
    isAnimating: false,
    pendingReload: false,
    checklistExpanded: false,
    filters: {
      search: '',
      source: 'all',
      status: 'all',
      sort: 'newest',
    },
  });

  // ===== Job Data Getters =====

  const getAllJobs = useCallback(() => {
    return [...state.allJobs];
  }, [state.allJobs]);

  const getFilteredJobs = useCallback(() => {
    return [...state.filteredJobs];
  }, [state.filteredJobs]);

  const getSelectedJob = useCallback(() => {
    if (
      state.selectedJobIndex >= 0 &&
      state.selectedJobIndex < state.allJobs.length
    ) {
      return state.allJobs[state.selectedJobIndex];
    }
    return null;
  }, [state.selectedJobIndex, state.allJobs]);

  // ===== Job Data Setters =====

  const setAllJobs = useCallback((jobs: Job[]) => {
    setState((prev) => ({
      ...prev,
      allJobs: Array.isArray(jobs) ? jobs : [],
    }));
  }, []);

  const setFilteredJobs = useCallback((jobs: Job[]) => {
    setState((prev) => ({
      ...prev,
      filteredJobs: Array.isArray(jobs) ? jobs : [],
    }));
  }, []);

  const setSelectedIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedJobIndex: index,
    }));
  }, []);

  const setJobInFocus = useCallback((jobId: string | null) => {
    setState((prev) => ({
      ...prev,
      jobInFocusId: jobId,
    }));
  }, []);

  const clearJobInFocus = useCallback(() => {
    setState((prev) => ({
      ...prev,
      jobInFocusId: null,
    }));
  }, []);

  // ===== UI State Setters =====

  const setAnimating = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      isAnimating: Boolean(value),
    }));
  }, []);

  const setPendingReload = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      pendingReload: Boolean(value),
    }));
  }, []);

  const setChecklistExpanded = useCallback((value: boolean) => {
    setState((prev) => ({
      ...prev,
      checklistExpanded: Boolean(value),
    }));
  }, []);

  // ===== Filter Setters =====

  const updateFilters = useCallback((filters: Partial<Filters>) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((prev) => ({
      ...prev,
      filters: {
        search: '',
        source: 'all',
        status: 'all',
        sort: 'newest',
      },
    }));
  }, []);

  // ===== Job Mutation Methods =====

  const updateJob = useCallback((index: number, jobData: Partial<Job>) => {
    setState((prev) => {
      if (index >= 0 && index < prev.allJobs.length) {
        const newJobs = [...prev.allJobs];
        newJobs[index] = { ...newJobs[index], ...jobData };
        return { ...prev, allJobs: newJobs };
      }
      return prev;
    });
  }, []);

  const deleteJob = useCallback((index: number) => {
    setState((prev) => {
      if (index >= 0 && index < prev.allJobs.length) {
        const newJobs = [...prev.allJobs];
        newJobs.splice(index, 1);

        // Adjust selected index if needed
        let newSelectedIndex = prev.selectedJobIndex;
        if (prev.selectedJobIndex === index) {
          newSelectedIndex = -1;
        } else if (prev.selectedJobIndex > index) {
          newSelectedIndex--;
        }

        return {
          ...prev,
          allJobs: newJobs,
          selectedJobIndex: newSelectedIndex,
        };
      }
      return prev;
    });
  }, []);

  const addJob = useCallback((jobData: Job) => {
    setState((prev) => ({
      ...prev,
      allJobs: [...prev.allJobs, jobData],
    }));
  }, []);

  // ===== Job Query Methods =====

  const findJobById = useCallback(
    (jobId: string) => {
      return state.allJobs.find((job) => job.id === jobId);
    },
    [state.allJobs]
  );

  const findJobIndexById = useCallback(
    (jobId: string) => {
      return state.allJobs.findIndex((job) => job.id === jobId);
    },
    [state.allJobs]
  );

  // Return state and methods
  return {
    // State
    ...state,

    // Getters
    getAllJobs,
    getFilteredJobs,
    getSelectedJob,

    // Job data setters
    setAllJobs,
    setFilteredJobs,
    setSelectedIndex,
    setJobInFocus,
    clearJobInFocus,

    // UI state setters
    setAnimating,
    setPendingReload,
    setChecklistExpanded,

    // Filter setters
    updateFilters,
    resetFilters,

    // Job mutation methods
    updateJob,
    deleteJob,
    addJob,

    // Job query methods
    findJobById,
    findJobIndexById,
  };
}
