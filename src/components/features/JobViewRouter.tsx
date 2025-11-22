import React from 'react';
import { parseJobTemplate } from '../../utils/job-parser';
import type { Job } from '../../entrypoints/job-details/hooks/useJobState';
import { defaults } from '../../entrypoints/job-details/config';

/**
 * Common props for view components
 */
interface ViewComponentProps {
  job: Job;
  index: number;
  isChecklistExpanded: boolean;
  onDeleteJob: (index: number) => void;
  onToggleChecklistExpand: (index: number, isExpanded: boolean) => void;
  onToggleChecklistItem: (index: number, itemId: string) => void;
}

/**
 * Props for JobViewRouter component
 */
export interface JobViewRouterProps {
  job: Job | null;
  index: number;
  isChecklistExpanded: boolean;
  ResearchingView: React.ComponentType<
    ViewComponentProps & {
      onSaveField: (index: number, fieldName: string, value: string) => void;
    }
  >;
  DraftingView: React.ComponentType<
    ViewComponentProps & {
      onSaveDocument: (
        index: number,
        documentKey: string,
        documentData: { title: string; text: string }
      ) => void;
      onInitializeDocuments: (index: number) => void;
    }
  >;
  onDeleteJob: (index: number) => void;
  onSaveField: (index: number, fieldName: string, value: string) => void;
  onSaveDocument: (
    index: number,
    documentKey: string,
    documentData: { title: string; text: string }
  ) => void;
  onInitializeDocuments: (index: number) => void;
  onToggleChecklistExpand: (index: number, isExpanded: boolean) => void;
  onToggleChecklistItem: (index: number, itemId: string) => void;
  emptyStateMessage?: string;
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
  index,
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
}: JobViewRouterProps) {
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
          index={index}
          isChecklistExpanded={isChecklistExpanded}
          onDeleteJob={onDeleteJob}
          onSaveField={onSaveField}
          onToggleChecklistExpand={onToggleChecklistExpand}
          onToggleChecklistItem={onToggleChecklistItem}
        />
      );

    case 'Drafting':
      return (
        <DraftingView
          job={job}
          index={index}
          isChecklistExpanded={isChecklistExpanded}
          onDeleteJob={onDeleteJob}
          onSaveDocument={onSaveDocument}
          onInitializeDocuments={onInitializeDocuments}
          onToggleChecklistExpand={onToggleChecklistExpand}
          onToggleChecklistItem={onToggleChecklistItem}
        />
      );

    default: {
      // WIP view for unimplemented states
      // Parse content for job title and company
      const parsed = parseJobTemplate(job.content || '');

      return (
        <div className="job-card">
          <div className="detail-panel-content">
            <div className="job-header">
              <div>
                <div className="job-title">
                  {parsed.topLevelFields['TITLE'] || 'Untitled'}
                </div>
                <div className="company">
                  {parsed.topLevelFields['COMPANY'] || 'Unknown'}
                </div>
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
              <div style={{ fontSize: '14px' }}>This panel is coming soon!</div>
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
                onClick={() => onDeleteJob(index)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      );
    }
  }
}
