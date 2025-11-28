import React, { useState, useCallback, useMemo } from 'react';
import { StatusFilterDots } from './StatusFilterDots';
import {
  SortIconButtons,
  type SortField,
  type SortDirection,
} from './SortIconButtons';
import { statusStyles, defaults } from '@/config';
import {
  getJobTitle,
  getCompanyName,
  type JobTemplateData,
} from '@/utils/job-parser';
import type { Job } from '@/entrypoints/job-details/hooks';
import { CloseIcon } from '../ui/icons';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface JobSelectorProps {
  /** All jobs to display */
  jobs: Job[];
  /** Currently selected job ID */
  selectedJobId: string | null;
  /** Callback when a job is selected */
  onSelectJob: (jobId: string) => void;
  /** Callback when a job is deleted */
  onDeleteJob: (jobId: string) => void;
  /** Whether the selector is open */
  isOpen: boolean;
  /** Callback to close the selector */
  onClose: () => void;
  /** Function to get parsed job data (from ParsedJobProvider) */
  getParsedJob: (jobId: string) => JobTemplateData | null;
}

/**
 * JobSelector - Sliding overlay panel for selecting jobs
 *
 * Features:
 * - Search filter by title/company
 * - Status filter dots (multi-select)
 * - Sort by date/company/title
 * - Job cards with status badges
 * - CSS transition for open/close (width: 0 <-> 100%)
 */
export function JobSelector({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  isOpen,
  onClose,
  getParsedJob,
}: JobSelectorProps) {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  /**
   * Filter and sort jobs based on current filter settings
   */
  const filteredJobs = useMemo(() => {
    let filtered = jobs.filter((job: Job) => {
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

    // Sort jobs
    const dirMult = sortDirection === 'asc' ? 1 : -1;

    if (sortField === 'date') {
      filtered = filtered.sort(
        (a: Job, b: Job) =>
          dirMult *
          (new Date(a.updatedAt || 0).getTime() -
            new Date(b.updatedAt || 0).getTime())
      );
    } else if (sortField === 'company') {
      filtered = filtered.sort((a: Job, b: Job) => {
        const parsedA = getParsedJob(a.id);
        const parsedB = getParsedJob(b.id);
        const companyA = parsedA ? getCompanyName(parsedA) || '' : '';
        const companyB = parsedB ? getCompanyName(parsedB) || '' : '';
        return dirMult * companyA.localeCompare(companyB);
      });
    } else if (sortField === 'title') {
      filtered = filtered.sort((a: Job, b: Job) => {
        const parsedA = getParsedJob(a.id);
        const parsedB = getParsedJob(b.id);
        const titleA = parsedA ? getJobTitle(parsedA) || '' : '';
        const titleB = parsedB ? getJobTitle(parsedB) || '' : '';
        return dirMult * titleA.localeCompare(titleB);
      });
    }

    return filtered;
  }, [jobs, searchTerm, statusFilters, sortField, sortDirection, getParsedJob]);

  /**
   * Handle job selection - select and close panel
   */
  const handleSelectJob = useCallback(
    (jobId: string) => {
      onSelectJob(jobId);
      onClose();
    },
    [onSelectJob, onClose]
  );

  /**
   * Handle sort change
   */
  const handleSortChange = useCallback(
    (field: SortField, direction: SortDirection) => {
      setSortField(field);
      setSortDirection(direction);
    },
    []
  );

  /**
   * Handle backdrop click - close panel
   */
  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Prevent click propagation from panel to backdrop
   */
  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Always render - CSS transition handles open/close
  return (
    <div
      className={cn(
        'absolute top-0 left-0 bottom-0 bg-white',
        'flex flex-col z-[100] overflow-hidden',
        'transition-[width] duration-200 ease-in-out',
        isOpen ? 'w-full' : 'w-0'
      )}
      onClick={handlePanelClick}
    >
      {/* Invisible backdrop for closing when open */}
      {isOpen && (
        <div className="fixed inset-0 -z-[1]" onClick={handleBackdropClick} />
      )}
      {/* Header with filters */}
      <div className="shrink-0 p-4 border-b border-neutral-200 bg-neutral-50">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            className={cn(
              'w-full px-3 py-2.5 border border-neutral-300 rounded',
              'text-sm font-sans',
              'transition-colors duration-200',
              'focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10',
              'placeholder:text-neutral-400'
            )}
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          <div className="flex items-center justify-center">
            <StatusFilterDots
              selectedStatuses={statusFilters}
              onChange={setStatusFilters}
            />
          </div>
          <div className="flex items-center justify-center">
            <SortIconButtons
              sortField={sortField}
              sortDirection={sortDirection}
              onChange={handleSortChange}
            />
          </div>
          <div className="text-xs text-neutral-500 italic">
            {filteredJobs.length} of {jobs.length} jobs
          </div>
        </div>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredJobs.map((job: Job) => {
          const isSelected = job.id === selectedJobId;
          const parsed = getParsedJob(job.id);
          const status = job.applicationStatus || defaults.status;
          const styles = statusStyles[status] || statusStyles['Researching'];

          return (
            <div
              key={job.id}
              className={cn(
                'border border-neutral-200 rounded-md p-3 mb-2 cursor-pointer',
                'transition-all duration-200',
                'hover:bg-blue-50 hover:border-blue-600',
                isSelected &&
                  'bg-blue-100 border-blue-600 border-2 shadow-md shadow-blue-600/20'
              )}
              style={{
                backgroundColor: isSelected ? undefined : styles.cardBg,
              }}
              onClick={() => handleSelectJob(job.id)}
            >
              <div className="flex flex-col gap-1 relative">
                <div className="text-sm font-semibold text-neutral-800 overflow-hidden text-ellipsis line-clamp-2 pr-6">
                  {parsed ? getJobTitle(parsed) || 'Untitled' : 'Untitled'}
                </div>
                <div className="text-xs text-neutral-600 mb-1">
                  {parsed ? getCompanyName(parsed) || 'Unknown' : 'Unknown'}
                </div>
                <span
                  className="inline-block px-2 py-0.5 rounded-xl text-[10px] font-medium w-fit text-white"
                  style={{ backgroundColor: styles.color }}
                >
                  {status}
                </span>
                {isSelected && (
                  <Button
                    variant="ghost"
                    className={cn(
                      'absolute -top-1 -right-1 w-5 h-5 rounded-full',
                      'bg-neutral-400 text-white text-xs leading-none',
                      'flex items-center justify-center opacity-70',
                      'hover:bg-red-600 hover:opacity-100',
                      'active:scale-90',
                      'transition-all duration-200'
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteJob(job.id);
                    }}
                    title="Delete this job"
                  >
                    {CloseIcon}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="text-center py-10 px-5 text-neutral-600 text-sm italic">
            {jobs.length === 0
              ? 'No jobs yet. Extract a job to get started.'
              : 'No jobs match your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
