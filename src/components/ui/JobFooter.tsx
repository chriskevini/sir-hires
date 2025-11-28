import React from 'react';
import { getNavigationButtons, statusStyles } from '@/config';
import type { ChecklistItem } from '@/entrypoints/job-details/hooks';
import './JobFooter.css';

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
    <div className={`job-footer-container ${className}`}>
      {/* Checklist drawer (expands upward) */}
      {isChecklistExpanded && (
        <div className="job-footer-checklist-drawer">
          {sortedItems.length > 0 ? (
            <div className="job-footer-checklist-items">
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className={`job-footer-checklist-item ${item.checked ? 'checked' : ''}`}
                  onClick={(e) => handleItemClick(e, item.id)}
                >
                  <span
                    className="job-footer-checklist-bullet"
                    style={item.checked ? { color: currentColor } : undefined}
                  >
                    {item.checked ? '●' : '○'}
                  </span>
                  <span className="job-footer-checklist-text">{item.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="job-footer-checklist-empty">
              No checklist items for this status
            </div>
          )}
        </div>
      )}

      {/* Main footer bar */}
      <div className="job-footer-bar">
        {/* Left: Back button */}
        <div className="job-footer-left">
          {navButtons.left && (
            <button
              className="job-footer-nav-btn back"
              onClick={() => onNavigate(navButtons.left!.target)}
              style={{ '--nav-color': leftTargetColor } as React.CSSProperties}
              title={navButtons.left.label}
            >
              <span className="job-footer-nav-arrow">←</span>
              <span className="job-footer-nav-label">
                {navButtons.left.label}
              </span>
            </button>
          )}
        </div>

        {/* Center: Checklist toggle */}
        <div className="job-footer-center">
          <button
            className={`job-footer-checklist-toggle ${isChecklistExpanded ? 'expanded' : ''}`}
            onClick={handleChecklistToggle}
            title={isChecklistExpanded ? 'Hide checklist' : 'Show checklist'}
          >
            <span className="job-footer-checklist-dots">
              {sortedItems.map((item, index) => (
                <span
                  key={index}
                  className={`job-footer-dot ${item.checked ? 'filled' : ''}`}
                  style={
                    item.checked ? { backgroundColor: currentColor } : undefined
                  }
                />
              ))}
            </span>
          </button>
        </div>

        {/* Right: Forward button(s) */}
        <div className="job-footer-right">
          {navButtons.right.map((button, index) => {
            const targetColor = statusStyles[button.target]?.color || '#757575';
            return (
              <button
                key={index}
                className="job-footer-nav-btn forward"
                onClick={() => onNavigate(button.target)}
                style={{ '--nav-color': targetColor } as React.CSSProperties}
                title={button.label}
              >
                <span className="job-footer-nav-label">{button.label}</span>
                <span className="job-footer-nav-arrow">→</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
