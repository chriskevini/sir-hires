import React, { useEffect, useRef, useState } from 'react';
import { statusOrder, statusStyles } from '@/config';
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

export const Checklist: React.FC<ChecklistProps> = ({
  checklist,
  status,
  jobId,
  isExpanded = false,
  animate = false,
  onToggleExpand,
  onToggleItem,
}) => {
  const [animationState, setAnimationState] = useState<
    'idle' | 'expanding' | 'collapsing'
  >('idle');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevExpandedRef = useRef(isExpanded);

  // Handle expand/collapse animations
  useEffect(() => {
    const wasExpanded = prevExpandedRef.current;
    const dropdown = dropdownRef.current;

    if (animate && dropdown) {
      if (wasExpanded && !isExpanded) {
        // Collapsing
        setAnimationState('collapsing');
        const timeout = setTimeout(() => {
          setAnimationState('idle');
        }, 300);
        return () => clearTimeout(timeout);
      } else if (!wasExpanded && isExpanded) {
        // Expanding
        setAnimationState('expanding');
        const timeout = setTimeout(() => {
          setAnimationState('idle');
        }, 300);
        return () => clearTimeout(timeout);
      }
    }

    prevExpandedRef.current = isExpanded;
  }, [isExpanded, animate]);

  // Calculate next status color for styling
  const currentIndex = statusOrder.indexOf(status);
  const nextStatus =
    currentIndex >= 0 && currentIndex < statusOrder.length - 1
      ? statusOrder[currentIndex + 1]
      : null;
  const nextColor = nextStatus
    ? statusStyles[nextStatus]?.color || '#666'
    : '#666';

  // Get items for current status
  const items = checklist && checklist[status] ? checklist[status] : [];
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  const handleExpanderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(!isExpanded);
  };

  const handleItemClick = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    onToggleItem(jobId, itemId);
  };

  // Animation classes based on state
  const getAnimationClass = () => {
    if (animationState === 'expanding') {
      return 'animate-[expandVertical_0.3s_cubic-bezier(0.4,0,0.2,1)_forwards]';
    }
    if (animationState === 'collapsing') {
      return 'animate-[collapseVertical_0.3s_cubic-bezier(0.4,0,0.2,1)_forwards]';
    }
    return '';
  };

  const renderExpander = () => (
    <div
      className="flex items-center justify-center w-10 h-10 bg-transparent border-none rounded-full cursor-pointer transition-all duration-200"
      onClick={handleExpanderClick}
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
    </div>
  );

  const renderExpandedDropdown = () => {
    const dropdownClasses = `min-w-[280px] max-w-[320px] bg-background border-none rounded-xl overflow-visible origin-bottom-right mb-3 ${getAnimationClass()}`;

    if (!items || items.length === 0) {
      return (
        <div ref={dropdownRef} className={dropdownClasses} data-job-id={jobId}>
          <div className="py-3 max-h-[300px] overflow-y-auto origin-bottom-right">
            <div className="p-3 text-center text-muted-foreground text-sm">
              No checklist items yet
            </div>
          </div>
        </div>
      );
    }

    return (
      <div ref={dropdownRef} className={dropdownClasses} data-job-id={jobId}>
        <div className="py-3 max-h-[300px] overflow-y-auto origin-bottom-right">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2.5 py-2.5 px-4 cursor-pointer transition-colors duration-150 select-none hover:bg-muted"
              data-item-id={item.id}
              data-job-id={jobId}
              onClick={(e) => handleItemClick(e, item.id)}
            >
              <span className="text-sm text-foreground leading-relaxed flex-1 text-right">
                {item.text}
              </span>
              <span
                className={`text-sm leading-relaxed shrink-0 transition-colors duration-150 ml-2 ${item.checked ? 'text-primary' : 'text-muted-foreground/60'}`}
                style={item.checked ? { color: nextColor } : undefined}
              >
                {item.checked ? '●' : '○'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-col items-end">
      {isExpanded && renderExpandedDropdown()}
      {renderExpander()}
    </div>
  );
};
