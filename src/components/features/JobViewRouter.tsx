import React from 'react';
import { useParsedJob } from './ParsedJobProvider';
import { getJobTitle, getCompanyName } from '../../utils/job-parser';
import type { Job } from '../../entrypoints/job-details/hooks';
import { defaults } from '@/config';
import { JobHeader } from './JobHeader';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

/**
 * Common props for view components (ID-based callbacks)
 * Views now only render content - header/footer handled by parent
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
  emptyStateMessage?: string;
  /** Show the JobHeader component (default: true) */
  showHeader?: boolean;
}

/**
 * JobViewRouter - Routes to appropriate view based on job status
 *
 * Architecture (v3):
 * ┌─────────────────────────────────┐
 * │ JobHeader                       │ - Progress bar, title, status, link
 * ├─────────────────────────────────┤
 * │ View Content (scrollable)       │ - ResearchingView / DraftingView
 * │                                 │
 * └─────────────────────────────────┘
 *
 * Footer is now rendered by the parent, allowing flexible composition
 * (e.g., inserting banners between content and footer).
 *
 * @param props - Router configuration and handlers
 * @returns Appropriate view component for the job's status
 */
export function JobViewRouter({
  job,
  ResearchingView,
  DraftingView,
  onDeleteJob,
  onSaveField,
  onSaveDocument,
  onDeleteDocument,
  emptyStateMessage = 'No job selected',
  showHeader = true,
}: JobViewRouterProps) {
  // Parse job at top level (hooks must be called unconditionally)
  const parsed = useParsedJob(job?.id || null);

  // Handle empty state
  if (!job) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
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
          <div className="flex flex-col items-center justify-center py-15 px-5 text-muted-foreground text-center min-h-72">
            <div className="text-5xl mb-5">🚧</div>
            <div className="text-lg font-medium mb-2.5 text-foreground">
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
        'flex flex-col flex-1 min-h-0 relative',
        isCompact ? 'bg-transparent' : 'bg-muted'
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className={cn(
            'flex-1 flex flex-col overflow-hidden',
            isCompact ? 'p-2' : 'px-6 py-4 max-w-4xl mx-auto w-full'
          )}
        >
          {renderViewContent()}
        </div>
      </div>
    </div>
  );
}
