import React from 'react';
import { getNavigationButtons, statusStyles } from '@/config';
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
  const currentColor = statusStyles[status]?.color || '#757575';
  const leftTargetColor = navButtons.left
    ? statusStyles[navButtons.left.target]?.color || '#757575'
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
        'flex flex-col bg-white border-t border-neutral-200 relative',
        className
      )}
    >
      {/* Checklist drawer (expands upward) */}
      {isChecklistExpanded && (
        <div
          className={cn(
            'absolute bottom-full left-1/2 -translate-x-1/2',
            'bg-white border border-neutral-200 rounded-lg',
            'shadow-[0_-4px_16px_rgba(0,0,0,0.12)]',
            'max-w-[400px] min-w-[280px] w-max mb-2',
            'overflow-visible animate-in fade-in slide-in-from-bottom-2 duration-200',
            // Arrow pointing down
            'after:content-[""] after:absolute after:-bottom-1.5 after:left-1/2 after:-translate-x-1/2',
            'after:border-l-[6px] after:border-l-transparent',
            'after:border-r-[6px] after:border-r-transparent',
            'after:border-t-[6px] after:border-t-white',
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
                    'hover:bg-neutral-100'
                  )}
                  onClick={(e) => handleItemClick(e, item.id)}
                >
                  <span
                    className="text-sm text-neutral-400 flex-shrink-0 leading-relaxed transition-colors duration-150"
                    style={item.checked ? { color: currentColor } : undefined}
                  >
                    {item.checked ? '●' : '○'}
                  </span>
                  <span
                    className={cn(
                      'text-[13px] text-neutral-800 leading-relaxed flex-1',
                      item.checked && 'text-neutral-500 line-through'
                    )}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-neutral-500 text-[13px]">
              No checklist items for this status
            </div>
          )}
        </div>
      )}

      {/* Main footer bar */}
      <div className="flex items-center justify-between py-3 px-4 gap-3 min-h-[56px] max-[480px]:py-2.5 max-[480px]:px-3">
        {/* Left: Back button */}
        <div className="flex-1 flex justify-start">
          {navButtons.left && (
            <Button
              variant="ghost"
              className={cn(
                'inline-flex items-center gap-1.5 py-2 px-3.5',
                'bg-transparent rounded-md cursor-pointer',
                'transition-all duration-200',
                'text-[13px] font-medium whitespace-nowrap',
                'border border-[var(--nav-color,#757575)] text-[var(--nav-color,#757575)]',
                'hover:bg-[color-mix(in_srgb,var(--nav-color,#757575)_10%,transparent)]',
                'active:scale-[0.98]',
                'max-[480px]:py-1.5 max-[480px]:px-2.5 max-[480px]:text-xs'
              )}
              onClick={() => onNavigate(navButtons.left!.target)}
              style={{ '--nav-color': leftTargetColor } as React.CSSProperties}
              title={navButtons.left.label}
            >
              <span className="text-sm leading-none">←</span>
              <span className="max-w-[140px] overflow-hidden text-ellipsis max-[480px]:max-w-[80px] max-[360px]:hidden">
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
              'bg-neutral-100 border border-neutral-200 rounded-md',
              'cursor-pointer transition-all duration-200',
              'text-[13px] font-medium text-neutral-800',
              'hover:bg-neutral-200 hover:border-neutral-300',
              isChecklistExpanded && 'bg-blue-50 border-blue-600 text-blue-600'
            )}
            onClick={handleChecklistToggle}
            title={isChecklistExpanded ? 'Hide checklist' : 'Show checklist'}
          >
            <span className="flex items-center gap-1">
              {sortedItems.map((item, index) => (
                <span
                  key={index}
                  className="w-2 h-2 rounded-full bg-neutral-300 transition-colors duration-150"
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
            const targetColor = statusStyles[button.target]?.color || '#757575';
            return (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  'inline-flex items-center gap-1.5 py-2 px-3.5',
                  'bg-transparent rounded-md cursor-pointer',
                  'transition-all duration-200',
                  'text-[13px] font-medium whitespace-nowrap',
                  'border border-[var(--nav-color,#757575)] text-[var(--nav-color,#757575)]',
                  'hover:bg-[color-mix(in_srgb,var(--nav-color,#757575)_10%,transparent)]',
                  'active:scale-[0.98]',
                  'max-[480px]:py-1.5 max-[480px]:px-2.5 max-[480px]:text-xs'
                )}
                onClick={() => onNavigate(button.target)}
                style={{ '--nav-color': targetColor } as React.CSSProperties}
                title={button.label}
              >
                <span className="max-w-[140px] overflow-hidden text-ellipsis max-[480px]:max-w-[80px] max-[360px]:hidden">
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
