import React from 'react';

interface CollapsiblePanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Generic collapsible panel component with toggle functionality.
 * Used for validation panels, template panels, and other collapsible sections.
 * Click the header to toggle collapsed state.
 */
export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  isCollapsed,
  onToggle,
  header,
  children,
  className = '',
}) => {
  return (
    <div
      className={`collapsible-panel ${isCollapsed ? 'collapsed' : ''} ${className}`}
    >
      <div className="collapsible-header" onClick={onToggle}>
        {header}
      </div>
      <div className="collapsible-content">{children}</div>
    </div>
  );
};
