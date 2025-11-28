import React from 'react';
import { statusStyles } from '@/config';
import { StatusBadge, getStatusColor } from '@/components/ui/StatusBadge';
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
  const styles = statusStyles[status] || statusStyles['Researching'];

  return (
    <div
      className={cn(
        'flex flex-col bg-white border-b border-neutral-200',
        className
      )}
    >
      {/* Progress bar strip at top */}
      <div className="h-1 bg-neutral-200 w-full overflow-hidden">
        <div
          className="h-full transition-all duration-300 ease-out"
          style={{
            width: `${styles.fill}%`,
            backgroundColor: styles.color,
          }}
        />
      </div>

      {/* Main header content */}
      <div className="flex justify-between items-start py-4 px-5 gap-4 max-[480px]:flex-col max-[480px]:gap-3">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <h1 className="text-lg font-semibold text-neutral-800 m-0 leading-tight overflow-hidden text-ellipsis whitespace-nowrap max-[480px]:text-base max-[480px]:whitespace-normal">
            {jobTitle || 'Untitled Position'}
          </h1>
          <p className="text-sm text-neutral-500 m-0 leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
            {company || 'Unknown Company'}
          </p>
          <StatusBadge status={status} className="mt-1.5 w-fit" />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 max-[480px]:w-full max-[480px]:justify-start">
          <a
            href={url}
            className="inline-flex items-center py-1.5 px-3 bg-neutral-100 text-blue-600 no-underline rounded text-[13px] font-medium transition-all duration-200 hover:bg-blue-50 hover:shadow-sm"
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
