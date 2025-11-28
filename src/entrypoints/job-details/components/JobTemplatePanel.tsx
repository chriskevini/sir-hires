import { Button } from '@/components/ui/Button';
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel';
import { X } from 'lucide-react';
import { escapeHtml } from '@/utils/shared-utils';
import { JOB_TEMPLATE } from '@/tasks';

interface JobTemplatePanelProps {
  isVisible: boolean;
  onClose: () => void;
}

/**
 * Collapsible template reference panel showing MarkdownDB job format
 * Used in ResearchingView to provide editing guidance
 */
export function JobTemplatePanel({
  isVisible,
  onClose,
}: JobTemplatePanelProps) {
  if (!isVisible) return null;

  return (
    <CollapsiblePanel
      isCollapsed={false}
      onToggle={onClose}
      header={
        <>
          <h3 className="text-sm font-semibold text-gray-700">
            📖 Job Template
          </h3>
          <Button
            variant="ghost"
            className="p-1 text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      }
      className="w-72 border-l border-gray-200 bg-gray-50 flex-shrink-0 overflow-y-auto"
    >
      <div className="p-3 font-mono text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
        {escapeHtml(JOB_TEMPLATE)}
      </div>
    </CollapsiblePanel>
  );
}
