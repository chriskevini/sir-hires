import React, { useEffect, useRef, useState } from 'react';
import { statusOrder, progressConfig } from '@/config';
import type { ChecklistItem } from '../hooks';
import './checklist.css';

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
  const [_isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevExpandedRef = useRef(isExpanded);

  // Handle expand/collapse animations
  useEffect(() => {
    const wasExpanded = prevExpandedRef.current;
    const dropdown = dropdownRef.current;

    if (animate && dropdown) {
      if (wasExpanded && !isExpanded) {
        // Collapsing
        setIsAnimating(true);
        dropdown.classList.add('collapsing');
        dropdown.classList.remove('expanded');

        const timeout = setTimeout(() => {
          setIsAnimating(false);
          dropdown.classList.remove('collapsing');
        }, 300);

        return () => clearTimeout(timeout);
      } else if (!wasExpanded && isExpanded) {
        // Expanding
        setIsAnimating(true);
        dropdown.style.transform = 'scaleY(0)';
        dropdown.style.opacity = '0';

        requestAnimationFrame(() => {
          dropdown.classList.add('expanding');
          dropdown.style.transform = '';
          dropdown.style.opacity = '';

          const timeout = setTimeout(() => {
            setIsAnimating(false);
            dropdown.classList.remove('expanding');
          }, 300);

          return () => clearTimeout(timeout);
        });
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
  const nextColor =
    nextStatus && progressConfig[nextStatus as keyof typeof progressConfig]
      ? progressConfig[nextStatus as keyof typeof progressConfig].color
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

  const renderExpander = () => (
    <div className="checklist-expander" onClick={handleExpanderClick}>
      <div className="checklist-dots">
        <span className="checklist-dot" style={{ color: nextColor }}>
          •
        </span>
        <span className="checklist-dot" style={{ color: nextColor }}>
          •
        </span>
        <span className="checklist-dot" style={{ color: nextColor }}>
          •
        </span>
      </div>
    </div>
  );

  const renderExpandedDropdown = () => {
    if (!items || items.length === 0) {
      return (
        <div
          ref={dropdownRef}
          className="checklist-dropdown expanded"
          data-job-id={jobId}
        >
          <div className="checklist-items">
            <div
              className="checklist-empty"
              style={{
                padding: '12px',
                textAlign: 'center',
                color: '#666',
                fontSize: '13px',
              }}
            >
              No checklist items yet
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={dropdownRef}
        className="checklist-dropdown expanded"
        data-job-id={jobId}
      >
        <div className="checklist-items">
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="checklist-item"
              data-item-id={item.id}
              data-job-id={jobId}
              onClick={(e) => handleItemClick(e, item.id)}
            >
              <span className="checklist-text">{item.text}</span>
              <span
                className={`checklist-bullet ${item.checked ? 'checked' : ''}`}
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
    <div className="checklist-wrapper">
      {isExpanded && renderExpandedDropdown()}
      {renderExpander()}
    </div>
  );
};
