import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  onAddTab?: () => void;
  onDeleteTab?: (tabKey: string) => void;
  className?: string;
}

/**
 * Browser-style tab bar component for document navigation.
 * Built on Radix Tabs primitives for keyboard navigation and accessibility.
 * Features trapezoidal tabs with add/delete functionality.
 */
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onAddTab,
  onDeleteTab,
  className,
}) => {
  return (
    <TabsPrimitive.Root value={activeTab} onValueChange={onTabChange}>
      <TabsPrimitive.List className={cn('flex gap-0.5 items-end', className)}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TabsPrimitive.Trigger
              key={tab.key}
              value={tab.key}
              className={cn(
                'relative flex items-center justify-center px-4 py-2',
                'border border-b-0 rounded-t-lg cursor-pointer',
                'text-sm font-medium transition-all duration-150',
                'min-w-30 -mb-px',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-background text-foreground border-border z-[1] shadow-[0_-2px_4px_rgba(0,0,0,0.05)]'
                  : 'bg-muted-foreground/10 text-muted-foreground border-border hover:bg-muted-foreground/20 hover:text-foreground'
              )}
            >
              <span className="text-center">{tab.label}</span>
              {isActive && onDeleteTab && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        'absolute right-1.5 top-1/2 -translate-y-1/2',
                        'inline-flex items-center justify-center',
                        'w-4 h-4 rounded-full text-sm leading-none',
                        'text-muted-foreground bg-transparent cursor-pointer',
                        'transition-all duration-150',
                        'hover:bg-foreground/10 hover:text-destructive'
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTab(tab.key);
                      }}
                      role="button"
                      aria-label="Delete document"
                    >
                      ×
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete document</TooltipContent>
                </Tooltip>
              )}
            </TabsPrimitive.Trigger>
          );
        })}
        {onAddTab && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  'relative flex items-center justify-center px-3 py-1.5',
                  'border border-dashed border-border rounded-t-lg cursor-pointer',
                  'text-lg font-normal leading-none text-muted-foreground',
                  'bg-transparent transition-all duration-150',
                  'hover:bg-muted hover:border-primary hover:text-primary',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
                onClick={onAddTab}
                aria-label="Add new document"
              >
                +
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Add new document</TooltipContent>
          </Tooltip>
        )}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
};
