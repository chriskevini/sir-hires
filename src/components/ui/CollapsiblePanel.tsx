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
      className={`border-t-2 border-border bg-background shrink-0 overflow-hidden transition-[max-height] duration-300 ${isCollapsed ? 'max-h-11' : 'max-h-[500px]'} ${className}`}
    >
      <div
        className="flex justify-between items-center px-4 py-3 bg-muted border-b border-border cursor-pointer select-none hover:bg-muted/80"
        onClick={onToggle}
      >
        {header}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
};
