import React from 'react';
import './TabBar.css';

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
 * Generic tab bar component for switching between multiple tabs.
 * Used in drafting view for document navigation.
 */
export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  onAddTab,
  onDeleteTab,
  className = '',
}) => {
  return (
    <div className={`tab-container ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            className={`tab-btn ${isActive ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            <span className="tab-label">{tab.label}</span>
            {isActive && onDeleteTab && (
              <span
                className="tab-delete"
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
          className="tab-btn tab-btn-add"
          onClick={onAddTab}
          title="Add new document"
        >
          +
        </button>
      )}
    </div>
  );
};
