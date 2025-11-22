import React from 'react';
import { escapeHtml } from '@/utils/shared-utils';

interface JobHeaderProps {
  jobTitle: string;
  company: string;
  url: string;
  className?: string;
}

/**
 * JobHeader - Displays job title, company, and link to original posting
 * Used in both ResearchingView (drafting-editor style) and DraftingView (job-card style)
 */
export const JobHeader: React.FC<JobHeaderProps> = ({
  jobTitle,
  company,
  url,
  className = '',
}) => {
  return (
    <div className={`job-header ${className}`}>
      <div>
        <div className="job-title">{escapeHtml(jobTitle)}</div>
        <div className="company">{escapeHtml(company)}</div>
      </div>
      <div>
        <a
          href={escapeHtml(url)}
          className="badge badge-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          View Job Posting
        </a>
      </div>
    </div>
  );
};
