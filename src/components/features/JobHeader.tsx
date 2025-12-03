import React from 'react';
import { getStatusColor, getStatusFill } from '@/config';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

interface JobHeaderProps {
  jobTitle: string;
  company: string;
  url: string;
  status: string;
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
 */
export const JobHeader: React.FC<JobHeaderProps> = ({
  jobTitle,
  company,
  url,
  status,
  className = '',
}) => {
  const color = getStatusColor(status);
  const fill = getStatusFill(status);

  return (
    <div
      className={cn(
        'flex flex-col bg-background border-b border-border',
        className
      )}
    >
      {/* Progress bar strip at top */}
      <div className="h-1 bg-muted w-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${fill}%`,
            backgroundColor: color,
          }}
        />
      </div>

      {/* Main header content */}
      <div className="flex justify-between items-start py-4 px-6 gap-4 max-w-4xl mx-auto w-full max-[480px]:flex-col max-[480px]:gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-foreground m-0 leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-[480px]:text-base max-[480px]:whitespace-normal">
            {jobTitle || 'Untitled Position'}
          </h1>
          <p className="text-sm text-muted-foreground m-0 leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
            {company || 'Unknown Company'}
          </p>
          <StatusBadge status={status} className="mt-1.5 w-fit" />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 max-[480px]:w-full max-[480px]:justify-start">
          <a
            href={url}
            className="inline-flex items-center py-1.5 px-3 bg-muted text-primary no-underline rounded text-sm font-medium transition-all duration-200 hover:bg-primary/10 hover:shadow-sm"
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
