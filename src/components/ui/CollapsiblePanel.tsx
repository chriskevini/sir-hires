import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';
import { cn } from '@/lib/utils';

interface CollapsiblePanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Generic collapsible panel component with toggle functionality.
 * Built on shadcn/ui Collapsible primitives for accessibility.
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
    <Collapsible
      open={!isCollapsed}
      onOpenChange={() => onToggle()}
      className={cn(
        'border-t-2 border-border bg-background shrink-0',
        className
      )}
    >
      <CollapsibleTrigger asChild>
        <div className="flex w-full cursor-pointer select-none items-center justify-between border-b border-border bg-muted px-4 py-3 hover:bg-muted/80">
          {header}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="px-4 py-3">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
};
