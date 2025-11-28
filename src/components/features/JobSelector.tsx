import React, { useCallback } from 'react';
import { StatusFilterDots } from './StatusFilterDots';
import { SortIconButtons } from './SortIconButtons';
import { defaults } from '@/config';
import type { JobTemplateData } from '@/utils/job-parser';
import type { Job } from '@/entrypoints/job-details/hooks';
import { JobCard } from './JobCard';
import { cn } from '@/lib/utils';
import { useJobFilters } from '@/hooks/useJobFilters';

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
  // Use shared job filtering hook
  const {
    searchTerm,
    setSearchTerm,
    statusFilters,
    setStatusFilters,
    sortField,
    sortDirection,
    handleSortChange,
    filteredJobs,
    totalCount,
    filteredCount,
  } = useJobFilters({ jobs, getParsedJob });

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
        'absolute top-0 left-0 bottom-0 bg-background',
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
      <div className="shrink-0 p-4 border-b border-border bg-muted">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            className={cn(
              'w-full px-3 py-2.5 border border-border rounded',
              'text-sm font-sans',
              'transition-colors duration-200',
              'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10',
              'placeholder:text-muted-foreground/60'
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
          <div className="text-xs text-muted-foreground italic">
            {filteredCount} of {totalCount} jobs
          </div>
        </div>
      </div>

      {/* Job list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredJobs.map((job: Job) => {
          const isSelected = job.id === selectedJobId;
          const parsed = getParsedJob(job.id);
          const status = job.applicationStatus || defaults.status;

          return (
            <JobCard
              key={job.id}
              jobId={job.id}
              parsed={parsed}
              status={status}
              isSelected={isSelected}
              onClick={() => handleSelectJob(job.id)}
              onDelete={() => onDeleteJob(job.id)}
            />
          );
        })}

        {filteredJobs.length === 0 && (
          <div className="text-center py-10 px-5 text-muted-foreground text-sm italic">
            {jobs.length === 0
              ? 'No jobs yet. Extract a job to get started.'
              : 'No jobs match your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}
