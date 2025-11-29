import React, { useCallback } from 'react';
import { StatusFilterDots } from './StatusFilterDots';
import { SortIconButtons } from './SortIconButtons';
import { defaults } from '@/config';
import type { JobTemplateData } from '@/utils/job-parser';
import type { Job } from '@/entrypoints/job-details/hooks';
import { JobCard } from './JobCard';
import { cn } from '@/lib/utils';
import { useJobFilters } from '@/hooks/useJobFilters';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';

// ============================================================================
// Types
// ============================================================================

interface JobSidebarProps {
  /** All jobs to display */
  jobs: Job[];
  /** Currently selected job ID */
  selectedJobId: string | null;
  /** Callback when a job is selected */
  onSelectJob: (jobId: string) => void;
  /** Callback when a job is deleted */
  onDeleteJob: (jobId: string) => void;
  /** Function to get parsed job data (from ParsedJobProvider) */
  getParsedJob: (jobId: string) => JobTemplateData | null;
  /** Whether the sidebar is open/expanded */
  open: boolean;
  /** Callback when sidebar open state changes */
  onOpenChange: (open: boolean) => void;
  /** Content to show in the main area */
  children: React.ReactNode;
}

// ============================================================================
// JobSelector - Internal job list component
// ============================================================================

interface JobSelectorProps {
  jobs: Job[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  getParsedJob: (jobId: string) => JobTemplateData | null;
}

/**
 * JobSelector - Job list with search, filters, and job cards
 * Internal component used by JobSidebar
 */
function JobSelector({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  getParsedJob,
}: JobSelectorProps) {
  const { isMobile, setOpenMobile } = useSidebar();

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
   * Handle job selection - close sidebar on mobile after selection
   */
  const handleSelectJob = useCallback(
    (jobId: string) => {
      onSelectJob(jobId);
      if (isMobile) {
        setOpenMobile(false);
      }
    },
    [onSelectJob, isMobile, setOpenMobile]
  );

  return (
    <>
      {/* Header with filters */}
      <SidebarHeader className="p-4 border-b border-border bg-background">
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
      </SidebarHeader>

      {/* Job list */}
      <SidebarContent className="p-2">
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
      </SidebarContent>
    </>
  );
}

// ============================================================================
// JobSidebar - Exported layout component
// ============================================================================

/**
 * JobSidebar - Responsive sidebar layout for job selection
 *
 * Features:
 * - Collapsible sidebar on desktop (Ctrl+B to toggle)
 * - Sheet/drawer on mobile screens (<768px)
 * - Auto-closes on job selection (mobile only)
 * - Keyboard shortcut support
 *
 * @example
 * ```tsx
 * <JobSidebar
 *   jobs={jobs}
 *   selectedJobId={selectedId}
 *   onSelectJob={handleSelect}
 *   onDeleteJob={handleDelete}
 *   getParsedJob={getParsedJob}
 *   open={sidebarOpen}
 *   onOpenChange={setSidebarOpen}
 * >
 *   <MainContent />
 * </JobSidebar>
 * ```
 */
export function JobSidebar({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  getParsedJob,
  open,
  onOpenChange,
  children,
}: JobSidebarProps) {
  return (
    <SidebarProvider
      open={open}
      onOpenChange={onOpenChange}
      className="h-screen"
      style={
        {
          '--sidebar-width': '20rem',
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="offcanvas" className="border-r border-border">
        <JobSelector
          jobs={jobs}
          selectedJobId={selectedJobId}
          onSelectJob={onSelectJob}
          onDeleteJob={onDeleteJob}
          getParsedJob={getParsedJob}
        />
      </Sidebar>
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}

// Re-export useSidebar for external control if needed
export { useSidebar } from '@/components/ui/sidebar';
