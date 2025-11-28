import { useState, useMemo, useCallback } from 'react';
import { defaults } from '@/config';
import {
  getJobTitle,
  getCompanyName,
  type JobTemplateData,
} from '@/utils/job-parser';
import type {
  SortField,
  SortDirection,
} from '@/components/features/SortIconButtons';

/**
 * Minimal job interface for filtering
 * Compatible with both Job type and any object with these fields
 */
interface FilterableJob {
  id: string;
  applicationStatus?: string;
  updatedAt?: string | number | Date;
}

/**
 * Hook return type
 */
interface UseJobFiltersReturn<T extends FilterableJob> {
  // Filter state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilters: string[];
  setStatusFilters: (statuses: string[]) => void;
  sortField: SortField;
  sortDirection: SortDirection;

  // Sort handler (for SortIconButtons)
  handleSortChange: (field: SortField, direction: SortDirection) => void;

  // Filtered results
  filteredJobs: T[];

  // Stats
  totalCount: number;
  filteredCount: number;
}

interface UseJobFiltersOptions<T extends FilterableJob> {
  /** All jobs to filter */
  jobs: T[];
  /** Function to get parsed job data for search/sort */
  getParsedJob: (jobId: string) => JobTemplateData | null;
}

/**
 * useJobFilters - Reusable hook for job filtering, searching, and sorting
 *
 * Extracts duplicated filter logic from:
 * - src/components/features/JobSelector.tsx
 * - src/entrypoints/job-details/App.tsx
 *
 * Features:
 * - Search by job title or company name
 * - Multi-select status filter (empty = show all)
 * - Sort by date, company, or title (asc/desc)
 *
 * @example
 * ```tsx
 * const {
 *   searchTerm, setSearchTerm,
 *   statusFilters, setStatusFilters,
 *   sortField, sortDirection, handleSortChange,
 *   filteredJobs, totalCount, filteredCount
 * } = useJobFilters({ jobs, getParsedJob });
 *
 * // Use with filter UI components
 * <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
 * <StatusFilterDots selectedStatuses={statusFilters} onChange={setStatusFilters} />
 * <SortIconButtons sortField={sortField} sortDirection={sortDirection} onChange={handleSortChange} />
 * <span>{filteredCount} of {totalCount} jobs</span>
 * ```
 */
export function useJobFilters<T extends FilterableJob>({
  jobs,
  getParsedJob,
}: UseJobFiltersOptions<T>): UseJobFiltersReturn<T> {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  /**
   * Handle sort change from SortIconButtons
   */
  const handleSortChange = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
    },
    []
  );

  /**
   * Filter and sort jobs based on current filter settings
   */
  const filteredJobs = useMemo(() => {
    // Step 1: Filter jobs
    let filtered = jobs.filter((job) => {
      const parsed = getParsedJob(job.id);
      if (!parsed) return true; // Include jobs with no content

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const jobTitle = getJobTitle(parsed);
        const company = getCompanyName(parsed);
        const matchesSearch =
          jobTitle?.toLowerCase().includes(searchLower) ||
          company?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter (multi-select: empty array = show all)
      if (statusFilters.length > 0) {
        const jobStatus = job.applicationStatus || defaults.status;
        if (!statusFilters.includes(jobStatus)) return false;
      }

      return true;
    });

    // Step 2: Sort jobs
    const dirMult = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'date') {
      filtered = filtered.sort(
        (a, b) =>
          dirMult *
          (new Date(a.updatedAt || 0).getTime() -
            new Date(b.updatedAt || 0).getTime())
      );
    } else if (sortField === 'company') {
      filtered = filtered.sort((a, b) => {
        const parsedA = getParsedJob(a.id);
        const parsedB = getParsedJob(b.id);
        const companyA = parsedA ? getCompanyName(parsedA) || '' : '';
        const companyB = parsedB ? getCompanyName(parsedB) || '' : '';
        return dirMult * companyA.localeCompare(companyB);
      });
    } else if (sortField === 'title') {
      filtered = filtered.sort((a, b) => {
        const parsedA = getParsedJob(a.id);
        const parsedB = getParsedJob(b.id);
        const titleA = parsedA ? getJobTitle(parsedA) || '' : '';
        const titleB = parsedB ? getJobTitle(parsedB) || '' : '';
        return dirMult * titleA.localeCompare(titleB);
      });
    }

    return filtered;
  }, [jobs, searchTerm, statusFilters, sortField, sortDirection, getParsedJob]);

  return {
    // Filter state
    searchTerm,
    setSearchTerm,
    statusFilters,
    setStatusFilters,
    sortField,
    sortDirection,

    // Sort handler
    handleSortChange,

    // Filtered results
    filteredJobs,

    // Stats
    totalCount: jobs.length,
    filteredCount: filteredJobs.length,
  };
}
