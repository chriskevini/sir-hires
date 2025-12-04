import {
  PanelLeft,
  PanelLeftClose,
  Download,
  Loader2,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { cn } from '@/lib/utils';

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
  /** Whether to show breathing animation on maximize button (profile creation funnel) */
  shouldAnimateMaximize?: boolean;
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
  shouldAnimateMaximize,
}: SidepanelHeaderProps) {
  return (
    <header className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border shrink-0 gap-2">
      {/* Left: Toggle button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className="border border-border rounded px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted/80 hover:border-border hover:text-foreground active:bg-muted flex items-center justify-center min-w-9 min-h-8 shrink-0 transition-all duration-200"
            onClick={onToggleSelector}
            aria-label={selectorOpen ? 'Close job list' : 'Open job list'}
          >
            {selectorOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {selectorOpen ? 'Close job list' : 'Open job list'}
        </TooltipContent>
      </Tooltip>

      {/* Center: Job info */}
      {hasJob && (jobTitle || company) && (
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
          {jobTitle && (
            <span className="text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              {jobTitle}
            </span>
          )}
          {jobTitle && company && (
            <span className="text-muted-foreground shrink-0">|</span>
          )}
          {company && (
            <span className="text-sm text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
              {company}
            </span>
          )}
        </div>
      )}

      {/* Right: Action buttons */}
      <div className="flex gap-1 items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="rounded p-1.5 text-base text-muted-foreground hover:bg-muted active:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-8 min-h-8 transition-all duration-200"
              onClick={onExtract}
              disabled={extracting}
              aria-label="Extract job"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {extracting ? 'Extracting...' : 'Extract job from current tab'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="rounded p-1.5 text-base text-muted-foreground hover:bg-muted active:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-8 min-h-8 transition-all duration-200"
              onClick={onDelete}
              disabled={!hasJob}
              aria-label="Delete job"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasJob ? 'Delete this job' : 'No job to delete'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="rounded p-1.5 text-base text-muted-foreground hover:bg-muted active:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center min-w-8 min-h-8 transition-all duration-200"
              onClick={onMaximize}
              aria-label="Open dashboard"
            >
              <Maximize2
                className={cn(
                  'h-4 w-4',
                  shouldAnimateMaximize && 'animate-breathing-icon'
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Open dashboard</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
