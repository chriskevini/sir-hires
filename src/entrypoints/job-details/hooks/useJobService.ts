import { useCallback, useMemo } from 'react';
import { statusOrder, terminalStates } from '../config';
import type { Job, Filters } from './useJobState';
import {
  parseJobTemplate,
  getJobTitle,
  getCompanyName,
  getLocation,
  extractDescription,
  extractAboutCompany,
  extractRequiredSkills,
  extractPreferredSkills,
} from '../../../utils/job-parser';

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
        // Parse content for search
        const parsed = parseJobTemplate(job.content || '');
        const jobTitle = getJobTitle(parsed);
        const company = getCompanyName(parsed);
        const location = getLocation(parsed);
        const description = extractDescription(parsed).join(' ');
        const aboutCompany = extractAboutCompany(parsed).join(' ');
        const requiredSkills = extractRequiredSkills(parsed).join(' ');
        const preferredSkills = extractPreferredSkills(parsed).join(' ');

        // Search in parsed MarkdownDB fields
        return (
          jobTitle?.toLowerCase().includes(searchLower) ||
          company?.toLowerCase().includes(searchLower) ||
          location?.toLowerCase().includes(searchLower) ||
          description.toLowerCase().includes(searchLower) ||
          aboutCompany.toLowerCase().includes(searchLower) ||
          requiredSkills.toLowerCase().includes(searchLower) ||
          preferredSkills.toLowerCase().includes(searchLower) ||
          job.url?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Source filter - removed since source field no longer exists

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
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const dateA =
            a.updatedAt || parsedA.topLevelFields['POSTED_DATE'] || '';
          const dateB =
            b.updatedAt || parsedB.topLevelFields['POSTED_DATE'] || '';
          return dateB.localeCompare(dateA);
        });
        break;

      case 'oldest':
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const dateA =
            a.updatedAt || parsedA.topLevelFields['POSTED_DATE'] || '';
          const dateB =
            b.updatedAt || parsedB.topLevelFields['POSTED_DATE'] || '';
          return dateA.localeCompare(dateB);
        });
        break;

      case 'deadline-soon':
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const deadlineA = parsedA.topLevelFields['CLOSING_DATE'];
          const deadlineB = parsedB.topLevelFields['CLOSING_DATE'];
          if (!deadlineA && !deadlineB) return 0;
          if (!deadlineA) return 1;
          if (!deadlineB) return -1;
          return deadlineA.localeCompare(deadlineB);
        });
        break;

      case 'deadline-latest':
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const deadlineA = parsedA.topLevelFields['CLOSING_DATE'];
          const deadlineB = parsedB.topLevelFields['CLOSING_DATE'];
          if (!deadlineA && !deadlineB) return 0;
          if (!deadlineA) return 1;
          if (!deadlineB) return -1;
          return deadlineB.localeCompare(deadlineA);
        });
        break;

      case 'company-az':
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const companyA = (getCompanyName(parsedA) || '').toLowerCase();
          const companyB = (getCompanyName(parsedB) || '').toLowerCase();
          return companyA.localeCompare(companyB);
        });
        break;

      case 'company-za':
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const companyA = (getCompanyName(parsedA) || '').toLowerCase();
          const companyB = (getCompanyName(parsedB) || '').toLowerCase();
          return companyB.localeCompare(companyA);
        });
        break;

      case 'title-az':
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const titleA = (getJobTitle(parsedA) || '').toLowerCase();
          const titleB = (getJobTitle(parsedB) || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;

      case 'title-za':
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const titleA = (getJobTitle(parsedA) || '').toLowerCase();
          const titleB = (getJobTitle(parsedB) || '').toLowerCase();
          return titleB.localeCompare(titleA);
        });
        break;

      default:
        // Default to newest first
        sorted.sort((a, b) => {
          const parsedA = parseJobTemplate(a.content || '');
          const parsedB = parseJobTemplate(b.content || '');
          const dateA =
            a.updatedAt || parsedA.topLevelFields['POSTED_DATE'] || '';
          const dateB =
            b.updatedAt || parsedB.topLevelFields['POSTED_DATE'] || '';
          return dateB.localeCompare(dateA);
        });
    }

    return sorted;
  }, []);

  // ===== Status Management =====

  /**
   * Update a job's status and maintain status history
   * Note: Status history is not part of current Job interface
   * This function updates the application status only
   */
  const updateJobStatus = useCallback((job: Job, newStatus: string): Job => {
    // Update job with new status
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
    const parsed = parseJobTemplate(job.content || '');
    const jobTitle = getJobTitle(parsed);
    const company = getCompanyName(parsed);

    if (!jobTitle || jobTitle.trim() === '') {
      errors.push('Job title is required');
    }

    if (!company || company.trim() === '') {
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
   * Note: Source field no longer exists in MarkdownDB pattern - returns empty array
   */
  const getUniqueSources = useCallback((_jobs: Job[]): string[] => {
    return [];
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
