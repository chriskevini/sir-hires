import React from 'react';
import { cn } from '@/lib/utils';

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
    <div className={cn('flex gap-0.5 items-end pl-2', className)}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            className={cn(
              'relative flex items-center justify-center px-5 py-2.5',
              'border border-b-0 rounded-t-lg cursor-pointer',
              'text-sm font-medium transition-all duration-150',
              'min-w-[120px] -mb-px',
              isActive
                ? 'bg-white text-[#202124] border-[#d0d0d0] z-[1] shadow-[0_-2px_4px_rgba(0,0,0,0.05)]'
                : 'bg-[#e8e8e8] text-[#5f6368] border-[#d0d0d0] hover:bg-[#f1f3f4] hover:text-[#202124]'
            )}
            onClick={() => onTabChange(tab.key)}
          >
            <span className="text-center">{tab.label}</span>
            {isActive && onDeleteTab && (
              <span
                className={cn(
                  'absolute right-1.5 top-1/2 -translate-y-1/2',
                  'inline-flex items-center justify-center',
                  'w-4 h-4 rounded-full text-sm leading-none',
                  'text-[#5f6368] bg-transparent cursor-pointer',
                  'transition-all duration-150',
                  'hover:bg-black/10 hover:text-[#d93025]'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTab(tab.key);
                }}
                title="Delete document"
              >
                ×
              </span>
            )}
          </button>
        );
      })}
      {onAddTab && (
        <button
          className={cn(
            'relative flex items-center justify-center px-3.5 py-2',
            'border border-dashed border-[#d0d0d0] rounded-t-lg cursor-pointer',
            'text-lg font-normal leading-none text-[#5f6368]',
            'bg-transparent transition-all duration-150',
            'hover:bg-[#f1f3f4] hover:border-[#2196f3] hover:text-[#2196f3]'
          )}
          onClick={onAddTab}
          title="Add new document"
        >
          +
        </button>
      )}
    </div>
  );
};
