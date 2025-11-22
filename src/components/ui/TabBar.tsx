import React from 'react';

interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
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
  className = '',
}) => {
  return (
    <div className={`tab-container ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`tab-btn ${tab.key === activeTab ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
