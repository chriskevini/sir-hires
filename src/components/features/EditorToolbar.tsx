import React from 'react';
import { Save } from 'lucide-react';
import { TabBar } from '../ui/TabBar';
import { Dropdown } from '../ui/Dropdown';
import { Button } from '../ui/Button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditorToolbarProps {
  documentKeys: string[];
  documentLabels: Record<string, string>;
  activeTab: string;
  onTabChange: (key: string) => void;
  onAddDocument?: () => void;
  onDeleteDocument?: (documentKey: string) => void;
  onExport: (type: 'md' | 'pdf') => void;
  onSaveAsTemplate?: () => void;
  canSaveTemplate?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  documentKeys,
  documentLabels,
  activeTab,
  onTabChange,
  onAddDocument,
  onDeleteDocument,
  onExport,
  onSaveAsTemplate,
  canSaveTemplate = true,
}) => {
  return (
    <div className="flex justify-between items-end px-4 bg-card border-b border-border">
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
        {onSaveAsTemplate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSaveAsTemplate}
                disabled={!canSaveTemplate}
              >
                <Save className="w-4 h-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save as custom template</TooltipContent>
          </Tooltip>
        )}
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
