import React, { useCallback } from 'react';
import { StatusFilterDots } from './StatusFilterDots';
import { SortIconButtons } from './SortIconButtons';
import { defaults } from '@/config';
import type { JobTemplateData } from '@/utils/job-parser';
import type { Job } from '@/entrypoints/job-details/hooks';
import { JobCard } from './JobCard';
import { cn } from '@/lib/utils';
import { useJobFilters } from '@/hooks/useJobFilters';
import { Input } from '@/components/ui/input';

// ============================================================================
// Types
// ============================================================================

/**
 * Display mode for JobSelector
 * - overlay: Full-width absolute positioning, covers content (mobile/sidepanel)
 * - push: Fixed-width in normal flow, pushes content aside (desktop)
 * - responsive: Overlay on small screens, push on md: and up
 */
type JobSelectorMode = 'overlay' | 'push' | 'responsive';

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
  /** Callback when open state changes (for toggle/close) */
  onOpenChange: (open: boolean) => void;
  /** Function to get parsed job data (from ParsedJobProvider) */
  getParsedJob: (jobId: string) => JobTemplateData | null;
  /**
   * Display mode
   * - overlay: absolute, full-width (sidepanel)
   * - push: relative, fixed-width w-80 (desktop)
   * - responsive: overlay on mobile, push on md:+
   * @default 'overlay'
   */
  mode?: JobSelectorMode;
  /** Width when in push mode or responsive desktop (Tailwind class) @default 'w-80' */
  pushWidth?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * JobSelector - Unified job selection panel with multiple display modes
 *
 * Features:
 * - Search filter by title/company
 * - Status filter dots (multi-select)
 * - Sort by date/company/title
 * - Job cards with status badges
 * - Three display modes: overlay, push, responsive
 *
 * @example
 * ```tsx
 * // Sidepanel - always overlay
 * <JobSelector mode="overlay" isOpen={open} onOpenChange={setOpen} ... />
 *
 * // Job-details - responsive (overlay mobile, push desktop)
 * <JobSelector mode="responsive" isOpen={open} onOpenChange={setOpen} ... />
 *
 * // Force push mode
 * <JobSelector mode="push" isOpen={open} onOpenChange={setOpen} ... />
 * ```
 */
export function JobSelector({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  isOpen,
  onOpenChange,
  getParsedJob,
  mode = 'overlay',
  pushWidth = 'w-80',
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
   * Handle job selection - select and close panel in overlay mode
   */
  const handleSelectJob = useCallback(
    (jobId: string) => {
      onSelectJob(jobId);
      // Close panel in overlay mode (or responsive on mobile)
      // In push mode, keep panel open after selection
      if (mode === 'overlay') {
        onOpenChange(false);
      }
      // For responsive mode, we close on mobile but keep open on desktop
      // Since we can't detect breakpoint in JS easily, we always close
      // (desktop users can reopen easily, mobile UX is more important)
      if (mode === 'responsive') {
        onOpenChange(false);
      }
    },
    [onSelectJob, onOpenChange, mode]
  );

  /**
   * Handle backdrop click - close panel (overlay mode only)
   */
  const handleBackdropClick = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  /**
   * Prevent click propagation from panel to backdrop
   */
  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Build container classes based on mode
  // Note: For responsive mode, we use md:w-80 directly since Tailwind needs
  // complete class names at compile time. The pushWidth prop only affects push mode.
  const containerClasses = cn(
    // Base styles (all modes)
    'flex flex-col bg-background overflow-hidden',
    'transition-[width] duration-200 ease-in-out',

    // Overlay mode: absolute, full-width, high z-index
    mode === 'overlay' && [
      'absolute inset-y-0 left-0 z-[100]',
      isOpen ? 'w-full' : 'w-0',
    ],

    // Push mode: relative, fixed-width, normal z-index, border
    mode === 'push' && [
      'relative shrink-0 border-r',
      isOpen ? [pushWidth, 'border-border'] : 'w-0 border-r-0',
    ],

    // Responsive mode: overlay on mobile, push on md:+
    mode === 'responsive' && [
      // Mobile (default): overlay behavior
      'absolute inset-y-0 left-0 z-[100]',
      isOpen ? 'w-full' : 'w-0',
      // Desktop (md:+): push behavior - uses fixed md:w-80
      'md:relative md:z-auto md:shrink-0 md:border-r',
      isOpen ? 'md:w-80 md:border-border' : 'md:w-0 md:border-r-0',
    ]
  );

  // Show backdrop only in overlay mode, or responsive mode on mobile
  // For responsive, backdrop is visible on mobile but hidden on md:+
  const showBackdrop = isOpen && (mode === 'overlay' || mode === 'responsive');

  // Always render - CSS transition handles open/close
  return (
    <div className={containerClasses} onClick={handlePanelClick}>
      {/* Invisible backdrop for closing when open (overlay/responsive-mobile only) */}
      {showBackdrop && (
        <div
          className={cn(
            'fixed inset-0 -z-[1]',
            // In responsive mode, hide backdrop on desktop (push mode doesn't need it)
            mode === 'responsive' && 'md:hidden'
          )}
          onClick={handleBackdropClick}
        />
      )}
      {/* Header with filters */}
      <div className="shrink-0 p-4 border-b border-border bg-background">
        <div className="flex flex-col gap-3">
          <Input
            type="text"
            className="w-full"
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
