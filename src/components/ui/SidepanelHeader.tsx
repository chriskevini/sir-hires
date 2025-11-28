import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExtractIcon,
  SpinnerIcon,
  TrashIcon,
  MaximizeIcon,
} from './icons';
import './SidepanelHeader.css';

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
    <header className="sidepanel-header">
      {/* Left: Toggle button */}
      <button
        className="sidepanel-header-toggle"
        onClick={onToggleSelector}
        title={selectorOpen ? 'Close job list' : 'Open job list'}
        aria-label={selectorOpen ? 'Close job list' : 'Open job list'}
      >
        {selectorOpen ? ChevronLeftIcon : ChevronRightIcon}
      </button>

      {/* Center: Job info */}
      {hasJob && (jobTitle || company) && (
        <div className="sidepanel-header-job-info">
          {jobTitle && (
            <span className="sidepanel-header-title">{jobTitle}</span>
          )}
          {jobTitle && company && (
            <span className="sidepanel-header-separator">|</span>
          )}
          {company && (
            <span className="sidepanel-header-company">{company}</span>
          )}
        </div>
      )}

      {/* Right: Action buttons */}
      <div className="sidepanel-header-actions">
        <button
          className="sidepanel-header-btn"
          onClick={onExtract}
          disabled={extracting}
          title={extracting ? 'Extracting...' : 'Extract job from current tab'}
          aria-label="Extract job"
        >
          {extracting ? (
            <span className="sidepanel-header-spinner">{SpinnerIcon}</span>
          ) : (
            ExtractIcon
          )}
        </button>

        <button
          className="sidepanel-header-btn"
          onClick={onDelete}
          disabled={!hasJob}
          title={hasJob ? 'Delete this job' : 'No job to delete'}
          aria-label="Delete job"
        >
          {TrashIcon}
        </button>

        <button
          className="sidepanel-header-btn"
          onClick={onMaximize}
          title="Open full job details"
          aria-label="Open full view"
        >
          {MaximizeIcon}
        </button>
      </div>
    </header>
  );
}
