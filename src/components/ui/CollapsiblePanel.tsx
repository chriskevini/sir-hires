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
      className={`border-t-2 border-gray-200 bg-white shrink-0 overflow-hidden transition-[max-height] duration-300 ${isCollapsed ? 'max-h-11' : 'max-h-[250px]'} ${className}`}
    >
      <div
        className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer select-none hover:bg-gray-100"
        onClick={onToggle}
      >
        {header}
      </div>
      <div className="px-4 py-3 max-h-[190px] overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
        {children}
      </div>
    </div>
  );
};
