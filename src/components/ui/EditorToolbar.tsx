import React from 'react';
import { TabBar } from './TabBar';
import { Dropdown } from './Dropdown';
import './EditorToolbar.css';

interface EditorToolbarProps {
  documentKeys: string[];
  documentLabels: Record<string, string>;
  activeTab: string;
  onTabChange: (key: string) => void;
  onAddDocument?: () => void;
  onDeleteDocument?: (documentKey: string) => void;
  onExport: (type: 'md' | 'pdf') => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  documentKeys,
  documentLabels,
  activeTab,
  onTabChange,
  onAddDocument,
  onDeleteDocument,
  onExport,
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
        onAddTab={onAddDocument}
        onDeleteTab={onDeleteDocument}
      />
      <div className="editor-actions">
        <Dropdown
          buttonLabel="Export"
          items={[
            {
              label: 'Export as Markdown (.md)',
              onClick: () => onExport('md'),
            },
            {
              label: 'Export as PDF (.pdf)',
              onClick: () => onExport('pdf'),
            },
          ]}
          className="export-dropdown"
        />
      </div>
    </div>
  );
};
