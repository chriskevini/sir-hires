// Business logic module - filtering, sorting, and job operations

export class JobService {
  constructor(config) {
    this.config = config;
  }

  // ===== Filtering =====

  /**
   * Filter jobs based on search, source, and status criteria
   * @param {Array} jobs - Array of job objects to filter
   * @param {Object} filters - Filter configuration
   * @returns {Array} Filtered array of jobs
   */
  filterJobs(jobs, filters) {
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
  }

  // ===== Sorting =====

  /**
   * Sort jobs based on specified criteria
   * @param {Array} jobs - Array of job objects to sort
   * @param {string} sortBy - Sort criteria
   * @returns {Array} Sorted array of jobs
   */
  sortJobs(jobs, sortBy) {
    const sorted = [...jobs]; // Create a copy to avoid mutating the original array

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
          // Jobs with deadlines come first, then by date ascending
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1; // Move jobs without deadline to end
          if (!b.deadline) return -1; // Move jobs without deadline to end
          return a.deadline.localeCompare(b.deadline);
        });
        break;

      case 'deadline-latest':
        sorted.sort((a, b) => {
          // Jobs with deadlines come first, then by date descending
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1; // Move jobs without deadline to end
          if (!b.deadline) return -1; // Move jobs without deadline to end
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
  }

  // ===== Status Management =====

  /**
   * Update a job's status and maintain status history
   * @param {Object} job - Job object to update
   * @param {string} newStatus - New status value
   * @returns {Object} Updated job object
   */
  updateJobStatus(job, newStatus) {
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
  }

  /**
   * Get the order index of a status
   * @param {string} status - Status value
   * @returns {number} Index in status order
   */
  getStatusOrder(status) {
    const index = this.config.statusOrder.indexOf(status);
    return index === -1 ? 0 : index;
  }

  /**
   * Check if a status is terminal (cannot progress further)
   * @param {string} status - Status value
   * @returns {boolean} True if terminal state
   */
  isTerminalState(status) {
    return this.config.terminalStates.includes(status);
  }

  // ===== Validation =====

  /**
   * Validate a status transition (currently no restrictions)
   * @param {string} oldStatus - Current status
   * @param {string} newStatus - Target status
   * @returns {boolean} True if transition is valid
   */
  validateStatusTransition(oldStatus, _newStatus) {
    // Currently no restrictions, but could add business rules here
    // For example: prevent moving forward from terminal states
    if (this.isTerminalState(oldStatus)) {
      return false; // Can't progress from terminal states
    }
    return true;
  }

  /**
   * Validate job data
   * @param {Object} job - Job object to validate
   * @returns {Object} Validation result with isValid and errors
   */
  validateJob(job) {
    const errors = [];

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
  }

  // ===== Backup/Restore =====

  /**
   * Prepare backup data for export
   * @param {Array} jobs - Array of jobs
   * @param {Object} masterResume - User profile data
   * @returns {Object} Backup data object
   */
  prepareBackupData(jobs, masterResume) {
    return {
      jobs,
      userProfile: masterResume,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
  }

  /**
   * Validate backup data
   * @param {Object} data - Backup data to validate
   * @returns {boolean} True if valid backup data
   */
  validateBackupData(data) {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Must have at least jobs or userProfile (or old masterResume for backward compatibility)
    return Boolean(data.jobs || data.userProfile || data.masterResume);
  }

  // ===== Utility Methods =====

  /**
   * Get all unique sources from jobs
   * @param {Array} jobs - Array of jobs
   * @returns {Array} Array of unique source names
   */
  getUniqueSources(jobs) {
    const sources = new Set();
    jobs.forEach((job) => {
      if (job.source) {
        sources.add(job.source);
      }
    });
    return Array.from(sources).sort();
  }

  /**
   * Get jobs by status
   * @param {Array} jobs - Array of jobs
   * @param {string} status - Status to filter by
   * @returns {Array} Jobs with the specified status
   */
  getJobsByStatus(jobs, status) {
    return jobs.filter(
      (job) => (job.applicationStatus || 'Researching') === status
    );
  }

  /**
   * Get status statistics
   * @param {Array} jobs - Array of jobs
   * @returns {Object} Status counts
   */
  getStatusStats(jobs) {
    const stats = {};

    this.config.statusOrder.forEach((status) => {
      stats[status] = 0;
    });

    jobs.forEach((job) => {
      const status = job.applicationStatus || 'Researching';
      if (stats[status] !== undefined) {
        stats[status]++;
      }
    });

    return stats;
  }
}
