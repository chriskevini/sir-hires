import { Button } from '@/components/ui/Button';
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel';
import { X } from 'lucide-react';
import { escapeHtml } from '@/utils/shared-utils';
import { jobExtraction } from '@/tasks';

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
          <h3 className="text-sm font-semibold text-foreground">
            📖 Job Template
          </h3>
          <Button
            variant="ghost"
            className="p-1 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      }
      className="w-72 border-l border-border bg-muted flex-shrink-0 overflow-y-auto"
    >
      <div className="p-3 font-mono text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {escapeHtml(jobExtraction.template)}
      </div>
    </CollapsiblePanel>
  );
}
