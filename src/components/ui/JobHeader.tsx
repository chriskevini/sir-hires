import React from 'react';
import './JobHeader.css';

interface JobHeaderProps {
  jobTitle: string;
  company: string;
  url: string;
  status: string;
  progressConfig: Record<string, { fill: number; color: string }>;
  statusColors: Record<string, { bg: string; text: string }>;
  className?: string;
}

/**
 * JobHeader - Consolidated header for job views
 *
 * Displays:
 * - Progress bar (thin strip at top showing workflow progress)
 * - Job title and company
 * - Status badge (colored indicator of current status)
 * - Action link to view original job posting
 *
 * Replaces: EditorHeader, ProgressBar (merged functionality)
 */
export const JobHeader: React.FC<JobHeaderProps> = ({
  jobTitle,
  company,
  url,
  status,
  progressConfig,
  statusColors,
  className = '',
}) => {
  const progress = progressConfig[status] || progressConfig['Researching'];
  const statusColor = statusColors[status] || statusColors['Researching'];

  return (
    <div className={`job-header-container ${className}`}>
      {/* Progress bar strip at top */}
      <div className="job-header-progress">
        <div
          className="job-header-progress-fill"
          style={{
            width: `${progress.fill}%`,
            backgroundColor: progress.color,
          }}
        />
      </div>

      {/* Main header content */}
      <div className="job-header-content">
        <div className="job-header-info">
          <h1 className="job-header-title">
            {jobTitle || 'Untitled Position'}
          </h1>
          <p className="job-header-company">{company || 'Unknown Company'}</p>
          <span
            className="job-header-status-badge"
            style={{
              backgroundColor: statusColor.bg,
              color: statusColor.text,
            }}
          >
            {status}
          </span>
        </div>

        <div className="job-header-actions">
          <a
            href={url}
            className="job-header-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Original
          </a>
        </div>
      </div>
    </div>
  );
};
