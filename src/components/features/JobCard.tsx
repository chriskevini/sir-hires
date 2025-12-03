import { defaults, getStatusBackground } from '@/config';
import {
  getJobTitle,
  getCompanyName,
  type JobTemplateData,
} from '@/utils/job-parser';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
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
 * - JobSelector (sidepanel and job-details page)
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
  const cardBackground = getStatusBackground(normalizedStatus);

  const title = parsed ? getJobTitle(parsed) || 'Untitled' : 'Untitled';
  const company = parsed ? getCompanyName(parsed) || 'Unknown' : 'Unknown';

  return (
    <div
      data-job-id={jobId}
      className={cn(
        'border border-border rounded-md p-3 mb-2 cursor-pointer',
        'transition-all duration-200',
        'hover:bg-primary/10 hover:border-primary',
        isSelected && 'border-primary border-2'
      )}
      style={{
        backgroundColor: cardBackground,
      }}
      onClick={onClick}
    >
      <div className="flex flex-col gap-1 relative">
        <div className="text-sm font-semibold text-foreground overflow-hidden text-ellipsis line-clamp-2 pr-6">
          {title}
        </div>
        <div className="text-xs text-card-muted-foreground mb-1">{company}</div>
        <StatusBadge status={normalizedStatus} size="sm" className="w-fit" />
        {showDeleteButton && (
          <Button
            variant="ghost"
            className={cn(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full',
              'bg-muted-foreground text-background text-xs leading-none',
              'flex items-center justify-center opacity-70',
              'hover:bg-destructive hover:opacity-100',
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
