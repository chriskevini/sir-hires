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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

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
  /** Whether to auto-close on selection (only for overlay mode) */
  closeOnSelect?: boolean;
}

interface JobSidebarOverlayProps extends JobSidebarProps {
  /** Whether the overlay is open */
  isOpen: boolean;
  /** Callback to close the overlay */
  onClose: () => void;
}

interface JobSidebarLayoutProps extends JobSidebarProps {
  /** Whether the sidebar is open/expanded */
  open: boolean;
  /** Callback when sidebar open state changes */
  onOpenChange: (open: boolean) => void;
  /** Content to show in the main area */
  children: React.ReactNode;
}

// ============================================================================
// Shared Job List Content Component
// ============================================================================

interface JobListContentProps {
  jobs: Job[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  getParsedJob: (jobId: string) => JobTemplateData | null;
}

/**
 * Shared job list content with search, filters, and job cards
 * Used by both overlay and layout variants
 */
function JobListContent({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  getParsedJob,
}: JobListContentProps) {
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
              onClick={() => onSelectJob(job.id)}
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
// JobSidebarOverlay - Full-screen sliding overlay (for sidepanel)
// ============================================================================

/**
 * JobSidebarOverlay - Sliding overlay panel for selecting jobs
 *
 * Use this variant in narrow contexts (like sidepanel) where the job list
 * needs to overlay the content temporarily.
 *
 * Features:
 * - Full-width overlay with backdrop
 * - CSS transition for open/close
 * - Auto-closes on job selection (optional)
 */
export function JobSidebarOverlay({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  isOpen,
  onClose,
  getParsedJob,
  closeOnSelect = true,
}: JobSidebarOverlayProps) {
  /**
   * Handle job selection - select and optionally close panel
   */
  const handleSelectJob = useCallback(
    (jobId: string) => {
      onSelectJob(jobId);
      if (closeOnSelect) {
        onClose();
      }
    },
    [onSelectJob, onClose, closeOnSelect]
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-full p-0 bg-background"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Job List</SheetTitle>
          <SheetDescription>Select a job to view details</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col h-full">
          <JobListContent
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelectJob={handleSelectJob}
            onDeleteJob={onDeleteJob}
            getParsedJob={getParsedJob}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// JobSidebarLayout - Persistent sidebar with collapsible support
// ============================================================================

/**
 * Inner content component that uses useSidebar context
 */
function JobSidebarLayoutInner({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  getParsedJob,
  children,
}: Omit<JobSidebarLayoutProps, 'open' | 'onOpenChange'>) {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  /**
   * Handle job selection
   * On mobile, close the sheet after selection
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
      {/* Desktop Sidebar */}
      <Sidebar collapsible="offcanvas" className="border-r border-border">
        <JobListContent
          jobs={jobs}
          selectedJobId={selectedJobId}
          onSelectJob={handleSelectJob}
          onDeleteJob={onDeleteJob}
          getParsedJob={getParsedJob}
        />
      </Sidebar>

      {/* Mobile Sheet (handled by shadcn Sidebar internally, but we need custom handling) */}
      {isMobile && (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent side="left" className="w-80 p-0 bg-background">
            <SheetHeader className="sr-only">
              <SheetTitle>Job List</SheetTitle>
              <SheetDescription>Select a job to view details</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col h-full">
              <JobListContent
                jobs={jobs}
                selectedJobId={selectedJobId}
                onSelectJob={handleSelectJob}
                onDeleteJob={onDeleteJob}
                getParsedJob={getParsedJob}
              />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Main content area */}
      <SidebarInset>{children}</SidebarInset>
    </>
  );
}

/**
 * JobSidebarLayout - Desktop sidebar layout with responsive behavior
 *
 * Use this variant for full-page views (like job-details) where the sidebar
 * should be persistent but collapsible.
 *
 * Features:
 * - Collapsible sidebar on desktop (Ctrl+B to toggle)
 * - Sheet/drawer on mobile screens
 * - Keyboard shortcut support
 * - Persists collapsed state via cookie
 */
export function JobSidebarLayout({
  jobs,
  selectedJobId,
  onSelectJob,
  onDeleteJob,
  getParsedJob,
  open,
  onOpenChange,
  children,
}: JobSidebarLayoutProps) {
  return (
    <SidebarProvider
      open={open}
      onOpenChange={onOpenChange}
      className="h-screen"
      style={
        {
          '--sidebar-width': '20rem', // w-80 = 20rem
        } as React.CSSProperties
      }
    >
      <JobSidebarLayoutInner
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJob={onSelectJob}
        onDeleteJob={onDeleteJob}
        getParsedJob={getParsedJob}
      >
        {children}
      </JobSidebarLayoutInner>
    </SidebarProvider>
  );
}

// ============================================================================
// Re-export useSidebar for external control
// ============================================================================

export { useSidebar } from '@/components/ui/sidebar';
