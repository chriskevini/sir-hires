import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExtractIcon,
  SpinnerIcon,
  TrashIcon,
  MaximizeIcon,
} from '../ui/icons';
import { Button } from '../ui/Button';

interface SidepanelHeaderProps {
  /** Toggle job selector panel visibility */
  onToggleSelector: () => void;
  /** Extract job from current tab */
  onExtract: () => void;
  /** Delete the current job */
  onDelete: () => void;
  /** Open full job details page */
  onMaximize: () => void;
  /** Whether extraction is in progress */
  extracting: boolean;
  /** Whether there is a current job to delete */
  hasJob: boolean;
  /** Whether the job selector is open */
  selectorOpen: boolean;
  /** Job title to display */
  jobTitle?: string;
  /** Company name to display */
  company?: string;
}

/**
 * SidepanelHeader - Compact header with toggle and action icons
 *
 * Layout: [chevron toggle] [Job Title - Company] [Extract] [Delete] [Maximize]
 *
 * Features:
 * - Toggle arrow to open/close JobSelector overlay
 * - Job title and company display in center
 * - SVG icon buttons for common actions (consistent with SortIconButtons)
 * - Disabled states for context-appropriate actions
 */
export function SidepanelHeader({
  onToggleSelector,
  onExtract,
  onDelete,
  onMaximize,
  extracting,
  hasJob,
  selectorOpen,
  jobTitle,
  company,
}: SidepanelHeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200 shrink-0 gap-2">
      {/* Left: Toggle button */}
      <Button
        variant="ghost"
        className="border border-gray-300 rounded px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:border-gray-400 hover:text-gray-700 active:bg-gray-200 flex items-center justify-center min-w-[36px] min-h-[32px] shrink-0 transition-all duration-200 [&_.icon-svg]:w-4 [&_.icon-svg]:h-4"
        onClick={onToggleSelector}
        title={selectorOpen ? 'Close job list' : 'Open job list'}
        aria-label={selectorOpen ? 'Close job list' : 'Open job list'}
      >
        {selectorOpen ? ChevronLeftIcon : ChevronRightIcon}
      </Button>

      {/* Center: Job info */}
      {hasJob && (jobTitle || company) && (
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          {jobTitle && (
            <span className="text-[13px] font-semibold text-gray-700 whitespace-nowrap overflow-hidden text-ellipsis">
              {jobTitle}
            </span>
          )}
          {jobTitle && company && (
            <span className="text-gray-400 shrink-0">|</span>
          )}
          {company && (
            <span className="text-[13px] text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis">
              {company}
            </span>
          )}
        </div>
      )}

      {/* Right: Action buttons */}
      <div className="flex gap-1 items-center">
        <Button
          variant="ghost"
          className="rounded p-1.5 text-base text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[32px] min-h-[32px] transition-all duration-200"
          onClick={onExtract}
          disabled={extracting}
          title={extracting ? 'Extracting...' : 'Extract job from current tab'}
          aria-label="Extract job"
        >
          {extracting ? (
            <span className="inline-flex items-center justify-center animate-spin">
              {SpinnerIcon}
            </span>
          ) : (
            ExtractIcon
          )}
        </Button>

        <Button
          variant="ghost"
          className="rounded p-1.5 text-base text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[32px] min-h-[32px] transition-all duration-200"
          onClick={onDelete}
          disabled={!hasJob}
          title={hasJob ? 'Delete this job' : 'No job to delete'}
          aria-label="Delete job"
        >
          {TrashIcon}
        </Button>

        <Button
          variant="ghost"
          className="rounded p-1.5 text-base text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-[32px] min-h-[32px] transition-all duration-200"
          onClick={onMaximize}
          title="Open full job details"
          aria-label="Open full view"
        >
          {MaximizeIcon}
        </Button>
      </div>
    </header>
  );
}
