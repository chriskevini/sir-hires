import React from 'react';
import { getNavigationButtons, getStatusColor } from '@/config';
import { Button } from '../ui/Button';
import type { ChecklistItem } from '@/entrypoints/job-details/hooks';
import { cn } from '@/lib/utils';

interface JobFooterProps {
  status: string;
  checklist?: Record<string, ChecklistItem[]>;
  jobId: string;
  isChecklistExpanded: boolean;
  onNavigate: (targetStatus: string) => void;
  onToggleChecklist: (isExpanded: boolean) => void;
  onToggleChecklistItem: (jobId: string, itemId: string) => void;
  className?: string;
}

/**
 * JobFooter - Compact footer with navigation and checklist drawer
 *
 * Layout:
 * - Left: Back button (if available)
 * - Center: Checklist summary with toggle (expands upward)
 * - Right: Forward button(s) (if available)
 *
 * Replaces: NavigationButtons, JobViewOverlay (merged functionality)
 */
export const JobFooter: React.FC<JobFooterProps> = ({
  status,
  checklist,
  jobId,
  isChecklistExpanded,
  onNavigate,
  onToggleChecklist,
  onToggleChecklistItem,
  className = '',
}) => {
  const navButtons = getNavigationButtons(status);

  // Get checklist items for current status
  const items = checklist?.[status] || [];
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Get colors for current and next status
  const currentColor = getStatusColor(status);
  const leftTargetColor = navButtons.left
    ? getStatusColor(navButtons.left.target)
    : currentColor;

  const handleChecklistToggle = () => {
    onToggleChecklist(!isChecklistExpanded);
  };

  const handleItemClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    onToggleChecklistItem(jobId, itemId);
  };

  return (
    <div
      className={cn(
        'flex flex-col bg-background border-t border-border relative',
        className
      )}
    >
      {/* Checklist drawer (expands upward) */}
      {isChecklistExpanded && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2',
            'bg-background border border-border rounded-lg',
            'shadow-[0_-4px_16px_rgba(0,0,0,0.12)]',
            'max-w-sm min-w-72 w-max mb-2',
            'overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-200',
            // Arrow pointing down
            'after:content-[""] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2',
            'after:border-l-[6px] after:border-l-transparent',
            'after:border-r-[6px] after:border-r-transparent',
            'after:border-t-[6px] after:border-t-background',
            'after:drop-shadow-[0_2px_1px_rgba(0,0,0,0.06)]'
          )}
        >
          {sortedItems.length > 0 ? (
            <div className="py-2">
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-start gap-2.5 py-2.5 px-4 cursor-pointer',
                    'transition-colors duration-150 select-none',
                    'hover:bg-muted'
                  )}
                  onClick={(e) => handleItemClick(e, item.id)}
                >
                  <span
                    className="text-sm text-muted-foreground/60 flex-shrink-0 leading-relaxed transition-colors duration-150"
                    style={item.checked ? { color: currentColor } : undefined}
                  >
                    {item.checked ? '●' : '○'}
                  </span>
                  <span
                    className={cn(
                      'text-sm text-foreground leading-relaxed flex-1',
                      item.checked && 'text-muted-foreground line-through'
                    )}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No checklist items for this status
            </div>
          )}
        </div>
      )}

      {/* Main footer bar */}
      <div className="flex items-center justify-between py-3 px-4 gap-3 min-h-14 max-[480px]:py-2.5 max-[480px]:px-3">
        {/* Left: Back button */}
        <div className="flex-1 flex justify-start">
          {navButtons.left && (
            <Button
              variant="ghost"
              className={cn(
                'inline-flex items-center gap-1.5 py-2 px-3.5',
                'bg-transparent rounded-md cursor-pointer',
                'transition-all duration-200',
                'text-sm font-medium whitespace-nowrap',
                'border border-[var(--nav-color,var(--status-researching))] text-[var(--nav-color,var(--status-researching))]',
                'hover:bg-[color-mix(in_srgb,var(--nav-color,var(--status-researching))_10%,transparent)]',
                'active:scale-[0.98]',
                'max-[480px]:py-1.5 max-[480px]:px-2.5 max-[480px]:text-sm'
              )}
              onClick={() => onNavigate(navButtons.left!.target)}
              style={{ '--nav-color': leftTargetColor } as React.CSSProperties}
              title={navButtons.left.label}
            >
              <span className="text-sm leading-none">←</span>
              <span className="max-w-36 overflow-hidden text-ellipsis max-[480px]:max-w-20 max-[360px]:hidden">
                {navButtons.left.label}
              </span>
            </Button>
          )}
        </div>

        {/* Center: Checklist toggle */}
        <div className="flex-none flex justify-center">
          <Button
            variant="ghost"
            className={cn(
              'inline-flex items-center gap-1.5 py-2 px-3.5',
              'bg-muted border border-border rounded-md',
              'cursor-pointer transition-all duration-200',
              'text-sm font-medium text-foreground',
              'hover:bg-muted hover:border-border',
              isChecklistExpanded && 'bg-primary/10 border-primary text-primary'
            )}
            onClick={handleChecklistToggle}
            title={isChecklistExpanded ? 'Hide checklist' : 'Show checklist'}
          >
            <span className="flex items-center gap-1">
              {sortedItems.map((item, index) => (
                <span
                  key={index}
                  className="w-2 h-2 rounded-full bg-muted-foreground/40 transition-colors duration-150"
                  style={
                    item.checked ? { backgroundColor: currentColor } : undefined
                  }
                />
              ))}
            </span>
          </Button>
        </div>

        {/* Right: Forward button(s) */}
        <div className="flex-1 flex justify-end gap-2">
          {navButtons.right.map((button, index) => {
            const targetColor = getStatusColor(button.target);
            return (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  'inline-flex items-center gap-1.5 py-2 px-3.5',
                  'bg-transparent rounded-md cursor-pointer',
                  'transition-all duration-200',
                  'text-sm font-medium whitespace-nowrap',
                  'border border-[var(--nav-color,var(--status-researching))] text-[var(--nav-color,var(--status-researching))]',
                  'hover:bg-[color-mix(in_srgb,var(--nav-color,var(--status-researching))_10%,transparent)]',
                  'active:scale-[0.98]',
                  'max-[480px]:py-1.5 max-[480px]:px-2.5 max-[480px]:text-sm'
                )}
                onClick={() => onNavigate(button.target)}
                style={{ '--nav-color': targetColor } as React.CSSProperties}
                title={button.label}
              >
                <span className="max-w-36 overflow-hidden text-ellipsis max-[480px]:max-w-20 max-[360px]:hidden">
                  {button.label}
                </span>
                <span className="text-sm leading-none">→</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
