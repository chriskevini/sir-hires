import React from 'react';
import { TabBar } from '../ui/TabBar';
import { Dropdown } from '../ui/Dropdown';

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
    <div className="flex justify-between items-end pr-4 bg-neutral-100 border-b border-neutral-300">
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
      <div className="flex gap-2 items-center">
        <Dropdown
          buttonLabel="Export"
          className="border-none"
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
        />
      </div>
    </div>
  );
};
