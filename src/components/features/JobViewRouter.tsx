import React from 'react';
import { useParsedJob } from './ParsedJobProvider';
import { getJobTitle, getCompanyName } from '../../utils/job-parser';
import type { Job } from '../../entrypoints/job-details/hooks';
import { defaults } from '@/config';
import { JobHeader } from '../ui/JobHeader';
import { JobFooter } from '../ui/JobFooter';
import './JobViewRouter.css';

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
  /** Hide header/footer chrome (for sidepanel compact mode) */
  hideChrome?: boolean;
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
  hideChrome = false,
}: JobViewRouterProps) {
  // Parse job at top level (hooks must be called unconditionally)
  const parsed = useParsedJob(job?.id || null);

  // Handle empty state
  if (!job) {
    return <div className="detail-panel-empty">{emptyStateMessage}</div>;
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
          <div className="job-view-wip">
            <div className="job-view-wip-icon">🚧</div>
            <div className="job-view-wip-title">
              {status} Panel - Work in Progress
            </div>
            <div className="job-view-wip-subtitle">
              This panel is coming soon!
            </div>
            <div className="job-view-wip-actions">
              <button
                className="btn btn-link"
                onClick={() => window.open(job.url, '_blank')}
              >
                View Job Posting
              </button>
              <button
                className="btn btn-delete"
                onClick={() => onDeleteJob(job.id)}
              >
                Delete
              </button>
            </div>
          </div>
        );
      }
    }
  };

  // Compact mode (hideChrome) - just render view content
  if (hideChrome) {
    return (
      <div className="job-view-container compact">
        <div className="job-view-content">{renderViewContent()}</div>
      </div>
    );
  }

  // Full layout with header and footer
  return (
    <div className="job-view-container">
      <JobHeader
        jobTitle={jobTitle}
        company={company}
        url={job.url}
        status={status}
      />

      <div className="job-view-content">{renderViewContent()}</div>

      <JobFooter
        status={status}
        checklist={job.checklist}
        jobId={job.id}
        isChecklistExpanded={isChecklistExpanded}
        onNavigate={handleNavigate}
        onToggleChecklist={onToggleChecklistExpand}
        onToggleChecklistItem={onToggleChecklistItem}
      />
    </div>
  );
}
