import { statusStyles, defaults } from '@/config';
import {
  getJobTitle,
  getCompanyName,
  type JobTemplateData,
} from '@/utils/job-parser';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '@/lib/utils';

interface JobCardProps {
  /** Job ID */
  jobId: string;
  /** Parsed job template data */
  parsed: JobTemplateData | null;
  /** Application status */
  status: string;
  /** Whether this job is currently selected */
  isSelected: boolean;
  /** Callback when the card is clicked */
  onClick: () => void;
  /** Callback when delete button is clicked */
  onDelete: () => void;
  /** Whether to show the delete button (default: only when selected) */
  showDeleteButton?: boolean;
}

/**
 * JobCard - Reusable job card component for job lists
 *
 * Used by:
 * - JobSelector (sidepanel overlay)
 * - job-details sidebar
 *
 * Features:
 * - Status-colored background
 * - Blue border when selected
 * - Delete button (shown when selected)
 * - Hover states
 */
export function JobCard({
  jobId,
  parsed,
  status,
  isSelected,
  onClick,
  onDelete,
  showDeleteButton = isSelected,
}: JobCardProps) {
  const normalizedStatus = status || defaults.status;
  const styles = statusStyles[normalizedStatus] || statusStyles['Researching'];

  const title = parsed ? getJobTitle(parsed) || 'Untitled' : 'Untitled';
  const company = parsed ? getCompanyName(parsed) || 'Unknown' : 'Unknown';

  return (
    <div
      data-job-id={jobId}
      className={cn(
        'border border-neutral-200 rounded-md p-3 mb-2 cursor-pointer',
        'transition-all duration-200',
        'hover:bg-blue-50 hover:border-blue-600',
        isSelected && 'border-blue-600 border-2'
      )}
      style={{
        backgroundColor: styles.cardBg,
      }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1 relative">
        <div className="text-sm font-semibold text-neutral-800 overflow-hidden text-ellipsis line-clamp-2 pr-6">
          {title}
        </div>
        <div className="text-xs text-neutral-600 mb-1">{company}</div>
        <span
          className="inline-block px-2 py-0.5 rounded-xl text-[10px] font-medium w-fit text-white"
          style={{ backgroundColor: styles.color }}
        >
          {normalizedStatus}
        </span>
        {showDeleteButton && (
          <Button
            variant="ghost"
            className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full',
              'bg-neutral-400 text-white text-xs leading-none',
              'flex items-center justify-center opacity-70',
              'hover:bg-red-600 hover:opacity-100',
              'active:scale-90',
              'transition-all duration-200'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete this job"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
