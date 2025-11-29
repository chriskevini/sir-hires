import React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { statusOrder, getStatusColor } from '@/config';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from '../hooks';

interface ChecklistProps {
  checklist: Record<string, ChecklistItem[]>;
  status: string;
  jobId: string;
  isExpanded?: boolean;
  animate?: boolean;
  onToggleExpand: (_isExpanded: boolean) => void;
  onToggleItem: (_jobId: string, _itemId: string) => void;
}

/**
 * Collapsible checklist component for job status progression.
 * Built on Radix Collapsible for keyboard navigation and accessibility.
 * Features animated expand/collapse with status-colored indicators.
 */
export const Checklist: React.FC<ChecklistProps> = ({
  checklist,
  status,
  jobId,
  isExpanded = false,
  animate = false,
  onToggleExpand,
  onToggleItem,
}) => {
  // Calculate next status color for styling
  const currentIndex = statusOrder.indexOf(status);
  const nextStatus =
    currentIndex >= 0 && currentIndex < statusOrder.length - 1
      ? statusOrder[currentIndex + 1]
      : null;
  const nextColor = nextStatus
    ? getStatusColor(nextStatus)
    : 'var(--status-researching)';

  // Get items for current status
  const items = checklist && checklist[status] ? checklist[status] : [];
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  const handleItemClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    onToggleItem(jobId, itemId);
  };

  const renderExpander = () => (
    <CollapsiblePrimitive.Trigger
      className={cn(
        'flex items-center justify-center w-10 h-10',
        'bg-transparent border-none rounded-full cursor-pointer',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
    >
      <div className="flex flex-col gap-0.5 items-center">
        <span className="text-sm leading-none" style={{ color: nextColor }}>
          •
        </span>
        <span className="text-sm leading-none" style={{ color: nextColor }}>
          •
        </span>
        <span className="text-sm leading-none" style={{ color: nextColor }}>
          •
        </span>
      </div>
    </CollapsiblePrimitive.Trigger>
  );

  const renderContent = () => {
    if (!items || items.length === 0) {
      return (
        <div className="p-3 text-center text-muted-foreground text-sm">
          No checklist items yet
        </div>
      );
    }

    return sortedItems.map((item) => (
      <div
        key={item.id}
        role="checkbox"
        aria-checked={item.checked}
        tabIndex={0}
        className={cn(
          'flex items-start justify-between gap-2.5 py-2.5 px-4',
          'cursor-pointer transition-colors duration-150 select-none',
          'hover:bg-muted',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
        )}
        data-item-id={item.id}
        data-job-id={jobId}
        onClick={(e) => handleItemClick(e, item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleItemClick(e as unknown as React.MouseEvent, item.id);
          }
        }}
      >
        <span className="text-sm text-foreground leading-relaxed flex-1 text-right">
          {item.text}
        </span>
        <span
          className={cn(
            'text-sm leading-relaxed shrink-0 transition-colors duration-150 ml-2',
            item.checked ? 'text-primary' : 'text-muted-foreground/60'
          )}
          style={item.checked ? { color: nextColor } : undefined}
          aria-hidden="true"
        >
          {item.checked ? '●' : '○'}
        </span>
      </div>
    ));
  };

  return (
    <CollapsiblePrimitive.Root
      open={isExpanded}
      onOpenChange={onToggleExpand}
      className="relative flex flex-col items-end"
    >
      <CollapsiblePrimitive.Content
        className={cn(
          'min-w-72 max-w-xs bg-background border-none rounded-xl',
          'overflow-hidden origin-bottom-right mb-3',
          animate &&
            'data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up'
        )}
        data-job-id={jobId}
      >
        <div className="py-3 max-h-72 overflow-y-auto origin-bottom-right">
          {renderContent()}
        </div>
      </CollapsiblePrimitive.Content>
      {renderExpander()}
    </CollapsiblePrimitive.Root>
  );
};
