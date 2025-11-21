import { useCallback, useMemo } from 'react';
import { statusOrder, terminalStates } from '../config';
import type { Job, Filters } from './useJobState';

export interface JobServiceConfig {
  statusOrder: string[];
  terminalStates: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BackupData {
  jobs: Job[];
  userProfile?: unknown;
  exportDate: string;
  version: string;
}

export interface StatusStats {
  [status: string]: number;
}

/**
 * React hook for job business logic (filtering, sorting, validation)
 * Replaces the JobService class with React hooks and memoization
 */
export function useJobService() {
  const config: JobServiceConfig = useMemo(
    () => ({
      statusOrder,
      terminalStates,
    }),
    []
  );

  // ===== Filtering =====

  /**
   * Filter jobs based on search, source, and status criteria
   */
  const filterJobs = useCallback((jobs: Job[], filters: Filters): Job[] => {
    let filtered = [...jobs];

    // Search filter - searches across multiple fields
    if (filters.search && filters.search.trim()) {
      const searchLower = filters.search.toLowerCase().trim();
      filtered = filtered.filter((job) => {
        return (
          job.jobTitle?.toLowerCase().includes(searchLower) ||
          job.company?.toLowerCase().includes(searchLower) ||
          job.location?.toLowerCase().includes(searchLower) ||
          job.rawDescription?.toLowerCase().includes(searchLower) ||
          job.aboutJob?.toLowerCase().includes(searchLower) ||
          job.aboutCompany?.toLowerCase().includes(searchLower) ||
          job.responsibilities?.toLowerCase().includes(searchLower) ||
          job.requirements?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Source filter
    if (filters.source && filters.source !== 'all') {
      filtered = filtered.filter((job) => job.source === filters.source);
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((job) => {
        const status = job.applicationStatus || 'Researching';
        return status === filters.status;
      });
    }

    return filtered;
  }, []);

  // ===== Sorting =====

  /**
   * Sort jobs based on specified criteria
   */
  const sortJobs = useCallback((jobs: Job[], sortBy: string): Job[] => {
    const sorted = [...jobs];

    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => {
          const dateA = a.updatedAt || a.postedDate || '';
          const dateB = b.updatedAt || b.postedDate || '';
          return dateB.localeCompare(dateA);
        });
        break;

      case 'oldest':
        sorted.sort((a, b) => {
          const dateA = a.updatedAt || a.postedDate || '';
          const dateB = b.updatedAt || b.postedDate || '';
          return dateA.localeCompare(dateB);
        });
        break;

      case 'deadline-soon':
        sorted.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        });
        break;

      case 'deadline-latest':
        sorted.sort((a, b) => {
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return b.deadline.localeCompare(a.deadline);
        });
        break;

      case 'company-az':
        sorted.sort((a, b) => {
          const companyA = (a.company || '').toLowerCase();
          const companyB = (b.company || '').toLowerCase();
          return companyA.localeCompare(companyB);
        });
        break;

      case 'company-za':
        sorted.sort((a, b) => {
          const companyA = (a.company || '').toLowerCase();
          const companyB = (b.company || '').toLowerCase();
          return companyB.localeCompare(companyA);
        });
        break;

      case 'title-az':
        sorted.sort((a, b) => {
          const titleA = (a.jobTitle || '').toLowerCase();
          const titleB = (b.jobTitle || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;

      case 'title-za':
        sorted.sort((a, b) => {
          const titleA = (a.jobTitle || '').toLowerCase();
          const titleB = (b.jobTitle || '').toLowerCase();
          return titleB.localeCompare(titleA);
        });
        break;

      default:
        // Default to newest first
        sorted.sort((a, b) => {
          const dateA = a.updatedAt || a.postedDate || '';
          const dateB = b.updatedAt || b.postedDate || '';
          return dateB.localeCompare(dateA);
        });
    }

    return sorted;
  }, []);

  // ===== Status Management =====

  /**
   * Update a job's status and maintain status history
   */
  const updateJobStatus = useCallback((job: Job, newStatus: string): Job => {
    const oldStatus = job.applicationStatus || 'Researching';

    // Initialize status history if needed
    if (!job.statusHistory) {
      job.statusHistory = [
        {
          status: oldStatus,
          date: job.updatedAt || new Date().toISOString(),
        },
      ];
    }

    // Add new status to history
    job.statusHistory.push({
      status: newStatus,
      date: new Date().toISOString(),
    });

    // Update job
    return {
      ...job,
      applicationStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };
  }, []);

  /**
   * Get the order index of a status
   */
  const getStatusOrder = useCallback(
    (status: string): number => {
      const index = config.statusOrder.indexOf(status);
      return index === -1 ? 0 : index;
    },
    [config.statusOrder]
  );

  /**
   * Check if a status is terminal (cannot progress further)
   */
  const isTerminalState = useCallback(
    (status: string): boolean => {
      return config.terminalStates.includes(status);
    },
    [config.terminalStates]
  );

  // ===== Validation =====

  /**
   * Validate a status transition
   */
  const validateStatusTransition = useCallback(
    (oldStatus: string, _newStatus: string): boolean => {
      // Can't progress from terminal states
      if (isTerminalState(oldStatus)) {
        return false;
      }
      return true;
    },
    [isTerminalState]
  );

  /**
   * Validate job data
   */
  const validateJob = useCallback((job: Job): ValidationResult => {
    const errors: string[] = [];

    if (!job.jobTitle || job.jobTitle.trim() === '') {
      errors.push('Job title is required');
    }

    if (!job.company || job.company.trim() === '') {
      errors.push('Company name is required');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  // ===== Backup/Restore =====

  /**
   * Prepare backup data for export
   */
  const prepareBackupData = useCallback(
    (jobs: Job[], masterResume?: unknown): BackupData => {
      return {
        jobs,
        userProfile: masterResume,
        exportDate: new Date().toISOString(),
        version: '1.0',
      };
    },
    []
  );

  /**
   * Validate backup data
   */
  const validateBackupData = useCallback((data: unknown): boolean => {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const backupData = data as Record<string, unknown>;

    // Must have at least jobs or userProfile (or old masterResume for backward compatibility)
    return Boolean(
      backupData.jobs || backupData.userProfile || backupData.masterResume
    );
  }, []);

  // ===== Utility Methods =====

  /**
   * Get all unique sources from jobs
   */
  const getUniqueSources = useCallback((jobs: Job[]): string[] => {
    const sources = new Set<string>();
    jobs.forEach((job) => {
      if (job.source) {
        sources.add(job.source);
      }
    });
    return Array.from(sources).sort();
  }, []);

  /**
   * Get jobs by status
   */
  const getJobsByStatus = useCallback((jobs: Job[], status: string): Job[] => {
    return jobs.filter(
      (job) => (job.applicationStatus || 'Researching') === status
    );
  }, []);

  /**
   * Get status statistics
   */
  const getStatusStats = useCallback(
    (jobs: Job[]): StatusStats => {
      const stats: StatusStats = {};

      config.statusOrder.forEach((status) => {
        stats[status] = 0;
      });

      jobs.forEach((job) => {
        const status = job.applicationStatus || 'Researching';
        if (stats[status] !== undefined) {
          stats[status]++;
        }
      });

      return stats;
    },
    [config.statusOrder]
  );

  return {
    // Filtering
    filterJobs,

    // Sorting
    sortJobs,

    // Status management
    updateJobStatus,
    getStatusOrder,
    isTerminalState,

    // Validation
    validateStatusTransition,
    validateJob,

    // Backup/restore
    prepareBackupData,
    validateBackupData,

    // Utility methods
    getUniqueSources,
    getJobsByStatus,
    getStatusStats,
  };
}
