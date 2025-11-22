import React from 'react';
import { TabBar } from './TabBar';
import { Dropdown } from './Dropdown';

interface EditorToolbarProps {
  documentKeys: string[];
  documentLabels: Record<string, string>;
  activeTab: string;
  exportDropdownOpen: boolean;
  onTabChange: (key: string) => void;
  onToggleExportDropdown: () => void;
  onCloseExportDropdown: () => void;
  onExport: (type: 'md' | 'pdf') => void;
  onSynthesizeClick: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  documentKeys,
  documentLabels,
  activeTab,
  exportDropdownOpen,
  onTabChange,
  onToggleExportDropdown,
  onCloseExportDropdown,
  onExport,
  onSynthesizeClick,
}) => {
  return (
    <div className="editor-topbar">
      <TabBar
        tabs={documentKeys.map((key) => ({
          key,
          label: documentLabels[key] || key,
        }))}
        activeTab={activeTab}
        onTabChange={onTabChange}
      />
      <div className="editor-actions">
        <button
          className="btn-synthesize"
          id="synthesizeBtn"
          onClick={onSynthesizeClick}
        >
          ✨ Synthesize with LLM
        </button>
        <Dropdown
          isOpen={exportDropdownOpen}
          onToggle={onToggleExportDropdown}
          onClose={onCloseExportDropdown}
          buttonLabel="Export"
          buttonIcon="📥"
          items={[
            {
              label: 'Export as Markdown (.md)',
              icon: '📄',
              onClick: () => onExport('md'),
            },
            {
              label: 'Export as PDF (.pdf)',
              icon: '📑',
              onClick: () => onExport('pdf'),
            },
          ]}
          className="export-dropdown"
        />
      </div>
    </div>
  );
};
