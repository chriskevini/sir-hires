import React from 'react';
import { useParsedJob } from './ParsedJobProvider';
import { getJobTitle, getCompanyName } from '../../utils/job-parser';
import type { Job } from '../../entrypoints/job-details/hooks';
import { defaults } from '@/config';
import { JobHeader } from './JobHeader';
import { JobFooter } from './JobFooter';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

/**
 * Common props for view components (ID-based callbacks)
 * Views now only render content - header/footer handled by router
 */
interface ViewComponentProps {
  job: Job;
  onDeleteJob: (jobId: string) => void;
  onSaveField: (jobId: string, fieldName: string, value: string) => void;
}

/**
 * Props for JobViewRouter component (ID-based callbacks)
 */
export interface JobViewRouterProps {
  job: Job | null;
  isChecklistExpanded: boolean;
  ResearchingView: React.ComponentType<ViewComponentProps>;
  DraftingView: React.ComponentType<
    ViewComponentProps & {
      onSaveDocument: (
        jobId: string,
        documentKey: string,
        documentData: { title: string; text: string }
      ) => void;
      onDeleteDocument: (jobId: string, documentKey: string) => void;
    }
  >;
  onDeleteJob: (jobId: string) => void;
  onSaveField: (jobId: string, fieldName: string, value: string) => void;
  onSaveDocument: (
    jobId: string,
    documentKey: string,
    documentData: { title: string; text: string }
  ) => void;
  onDeleteDocument: (jobId: string, documentKey: string) => void;
  onToggleChecklistExpand: (isExpanded: boolean) => void;
  onToggleChecklistItem: (jobId: string, itemId: string) => void;
  emptyStateMessage?: string;
  /** Show the JobHeader component (default: true) */
  showHeader?: boolean;
  /** Show the JobFooter component (default: true) */
  showFooter?: boolean;
}

/**
 * JobViewRouter - Routes to appropriate view based on job status
 *
 * Architecture (v2):
 * ┌─────────────────────────────────┐
 * │ JobHeader                       │ - Progress bar, title, status, link
 * ├─────────────────────────────────┤
 * │ View Content (scrollable)       │ - ResearchingView / DraftingView
 * │                                 │
 * ├─────────────────────────────────┤
 * │ JobFooter                       │ - Nav buttons, checklist drawer
 * └─────────────────────────────────┘
 *
 * Views are now "content-only" - they don't render headers, footers, or overlays.
 * All navigation and status chrome is handled at the router level.
 *
 * @param props - Router configuration and handlers
 * @returns Appropriate view component for the job's status
 */
export function JobViewRouter({
  job,
  isChecklistExpanded,
  ResearchingView,
  DraftingView,
  onDeleteJob,
  onSaveField,
  onSaveDocument,
  onDeleteDocument,
  onToggleChecklistExpand,
  onToggleChecklistItem,
  emptyStateMessage = 'No job selected',
  showHeader = true,
  showFooter = true,
}: JobViewRouterProps) {
  // Parse job at top level (hooks must be called unconditionally)
  const parsed = useParsedJob(job?.id || null);

  // Handle empty state
  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
        {emptyStateMessage}
      </div>
    );
  }

  const status = job.applicationStatus || defaults.status;

  // Extract job metadata for header
  const jobTitle = parsed
    ? getJobTitle(parsed) || 'Untitled Position'
    : 'Untitled Position';
  const company = parsed
    ? getCompanyName(parsed) || 'Unknown Company'
    : 'Unknown Company';

  // Navigation handler - updates applicationStatus field
  const handleNavigate = (targetStatus: string) => {
    onSaveField(job.id, 'applicationStatus', targetStatus);
  };

  // Helper to render the appropriate view content based on status
  const renderViewContent = () => {
    switch (status) {
      case 'Researching':
        return (
          <ResearchingView
            job={job}
            onDeleteJob={onDeleteJob}
            onSaveField={onSaveField}
          />
        );

      case 'Drafting':
        return (
          <DraftingView
            job={job}
            onDeleteJob={onDeleteJob}
            onSaveField={onSaveField}
            onSaveDocument={onSaveDocument}
            onDeleteDocument={onDeleteDocument}
          />
        );

      default: {
        // WIP view for unimplemented states
        return (
          <div className="flex flex-col items-center justify-center py-15 px-5 text-neutral-600 text-center min-h-[300px]">
            <div className="text-5xl mb-5">🚧</div>
            <div className="text-lg font-medium mb-2.5 text-neutral-800">
              {status} Panel - Work in Progress
            </div>
            <div className="text-sm mb-6">This panel is coming soon!</div>
            <div className="flex gap-3">
              <Button
                variant="link"
                onClick={() => window.open(job.url, '_blank')}
              >
                View Job Posting
              </Button>
              <Button variant="danger" onClick={() => onDeleteJob(job.id)}>
                Delete
              </Button>
            </div>
          </div>
        );
      }
    }
  };

  // Render layout based on header/footer visibility
  const isCompact = !showHeader;

  return (
    <div
      className={cn(
        'flex flex-col h-full relative',
        isCompact ? 'bg-transparent' : 'bg-neutral-50'
      )}
    >
      {showHeader && (
        <JobHeader
          jobTitle={jobTitle}
          company={company}
          url={job.url}
          status={status}
        />
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {renderViewContent()}
      </div>

      {showFooter && (
        <JobFooter
          status={status}
          checklist={job.checklist}
          jobId={job.id}
          isChecklistExpanded={isChecklistExpanded}
          onNavigate={handleNavigate}
          onToggleChecklist={onToggleChecklistExpand}
          onToggleChecklistItem={onToggleChecklistItem}
        />
      )}
    </div>
  );
}
