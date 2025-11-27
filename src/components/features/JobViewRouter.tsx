import React from 'react';
import { useParsedJob } from './ParsedJobProvider';
import { getJobTitle, getCompanyName } from '../../utils/job-parser';
import type { Job } from '../../entrypoints/job-details/hooks';
import { defaults } from '@/config';
import { JobViewOverlay } from './JobViewOverlay';

interface Document {
  title: string;
  text: string;
  lastEdited: string | null;
  order: number;
}

/**
 * Common props for view components (ID-based callbacks)
 */
interface ViewComponentProps {
  job: Job;
  isChecklistExpanded: boolean;
  onDeleteJob: (jobId: string) => void;
  onToggleChecklistExpand: (isExpanded: boolean) => void;
  onToggleChecklistItem: (jobId: string, itemId: string) => void;
  hideOverlay?: boolean;
}

/**
 * Props for JobViewRouter component (ID-based callbacks)
 */
export interface JobViewRouterProps {
  job: Job | null;
  isChecklistExpanded: boolean;
  ResearchingView: React.ComponentType<
    ViewComponentProps & {
      onSaveField: (jobId: string, fieldName: string, value: string) => void;
    }
  >;
  DraftingView: React.ComponentType<
    ViewComponentProps & {
      onSaveField: (jobId: string, fieldName: string, value: string) => void;
      onSaveDocument: (
        jobId: string,
        documentKey: string,
        documentData: { title: string; text: string }
      ) => void;
      onInitializeDocuments: (
        jobId: string,
        documents: Record<string, Document>
      ) => void;
    }
  >;
  onDeleteJob: (jobId: string) => void;
  onSaveField: (jobId: string, fieldName: string, value: string) => void;
  onSaveDocument: (
    jobId: string,
    documentKey: string,
    documentData: { title: string; text: string }
  ) => void;
  onInitializeDocuments: (
    jobId: string,
    documents: Record<string, Document>
  ) => void;
  onToggleChecklistExpand: (isExpanded: boolean) => void;
  onToggleChecklistItem: (jobId: string, itemId: string) => void;
  emptyStateMessage?: string;
  hideOverlay?: boolean;
}

/**
 * JobViewRouter - Routes to appropriate view based on job status
 *
 * Eliminates duplication between job-details and sidepanel App files.
 * Provides centralized view routing logic based on job application status.
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
  onInitializeDocuments,
  onToggleChecklistExpand,
  onToggleChecklistItem,
  emptyStateMessage = 'No job selected',
  hideOverlay = false,
}: JobViewRouterProps) {
  // Parse job at top level (hooks must be called unconditionally)
  const parsed = useParsedJob(job?.id || null);

  // Handle empty state
  if (!job) {
    return <div className="detail-panel-empty">{emptyStateMessage}</div>;
  }

  const status = job.applicationStatus || defaults.status;

  // Route to the appropriate view based on status
  switch (status) {
    case 'Researching':
      return (
        <ResearchingView
          job={job}
          isChecklistExpanded={isChecklistExpanded}
          onDeleteJob={onDeleteJob}
          onSaveField={onSaveField}
          onToggleChecklistExpand={onToggleChecklistExpand}
          onToggleChecklistItem={onToggleChecklistItem}
          hideOverlay={hideOverlay}
        />
      );

    case 'Drafting':
      return (
        <DraftingView
          job={job}
          isChecklistExpanded={isChecklistExpanded}
          onDeleteJob={onDeleteJob}
          onSaveField={onSaveField}
          onSaveDocument={onSaveDocument}
          onInitializeDocuments={onInitializeDocuments}
          onToggleChecklistExpand={onToggleChecklistExpand}
          onToggleChecklistItem={onToggleChecklistItem}
          hideOverlay={hideOverlay}
        />
      );

    default: {
      // WIP view for unimplemented states
      // Use parsed data from top-level hook call
      const jobTitle = parsed ? getJobTitle(parsed) || 'Untitled' : 'Untitled';
      const company = parsed ? getCompanyName(parsed) || 'Unknown' : 'Unknown';

      return (
        <>
          <div className="job-card">
            <div className="detail-panel-content">
              <div className="job-header">
                <div>
                  <div className="job-title">{jobTitle}</div>
                  <div className="company">{company}</div>
                </div>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#666',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 500,
                    marginBottom: '10px',
                  }}
                >
                  {status} Panel - Work in Progress
                </div>
                <div style={{ fontSize: '14px' }}>
                  This panel is coming soon!
                </div>
              </div>

              <div className="job-actions">
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
          </div>

          <JobViewOverlay
            job={job}
            isChecklistExpanded={isChecklistExpanded}
            onSaveField={onSaveField}
            onToggleChecklistExpand={onToggleChecklistExpand}
            onToggleChecklistItem={onToggleChecklistItem}
            hidden={hideOverlay}
          />
        </>
      );
    }
  }
}
