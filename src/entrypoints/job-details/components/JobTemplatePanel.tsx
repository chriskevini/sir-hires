import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel';
import { CloseIcon } from '@/components/ui/icons';
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
          <h3>📖 Job Template</h3>
          <button className="template-panel-close" onClick={onClose}>
            {CloseIcon}
          </button>
        </>
      }
      className="template-panel"
    >
      <div className="template-content">{escapeHtml(JOB_TEMPLATE)}</div>
    </CollapsiblePanel>
  );
}
