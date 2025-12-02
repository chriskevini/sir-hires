import React, { useCallback } from 'react';
import { useJobValidation, ChecklistItem } from '../hooks';
import { useImmediateSave } from '@/hooks/useImmediateSave';
import { StreamingTextarea } from '@/components/ui/StreamingTextarea';
import { ExtractionLoadingView } from '../components/ExtractionLoadingView';
import { ExtractionErrorView } from '../components/ExtractionErrorView';
import { MigrationPromptView } from '../components/MigrationPromptView';
import { cn } from '@/lib/utils';
import type { ValidationFix } from '@/utils/validation-types';

interface Job {
  id: string;
  url: string;
  content?: string;
  isExtracting?: boolean;
  extractionError?: string;
  checklist?: Record<string, ChecklistItem[]>;
  applicationStatus: string;
}

interface ResearchingViewProps {
  job: Job;
  onDeleteJob: (jobId: string) => void;
  onSaveField: (jobId: string, fieldName: string, value: string) => void;
}

/**
 * ResearchingView - Content-only view for job research phase
 *
 * Renders the markdown editor and validation panel.
 * Header and footer are handled by JobViewRouter.
 */
export const ResearchingView: React.FC<ResearchingViewProps> = ({
  job,
  onDeleteJob,
  onSaveField,
}) => {
  // Immediate-save hook: saves to storage on every change
  // Uses resetKey to re-initialize only when switching jobs (not on storage reload)
  const { value: editorContent, setValue: setEditorContent } = useImmediateSave(
    {
      initialValue: job.content || '',
      onSave: (value) => onSaveField(job.id, 'content', value),
      disabled: job.isExtracting || !!job.extractionError,
      resetKey: job.id, // Re-initialize when switching jobs
    }
  );

  // Handler for ExtractionErrorView (event-based onChange)
  const handleEditorChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditorContent(e.target.value);
    },
    [setEditorContent]
  );

  // Use validation hook
  const validation = useJobValidation({
    content: editorContent,
    isExtracting: job.isExtracting,
    hasError: !!job.extractionError,
  });

  const handleDelete = () => {
    onDeleteJob(job.id);
  };

  // Handle fix button clicks (must be before early returns)
  const handleApplyFix = useCallback(
    (fix: ValidationFix) => {
      if (fix.type === 'delete_section' && fix.section) {
        // Delete section from content
        // Match both formats: "# SECTION_NAME" and "# SECTION NAME"
        const sectionPattern = new RegExp(
          `\\n?# ${fix.section.replace(/_/g, '[_ ]')}\\n[\\s\\S]*?(?=\\n# |$)`,
          'g'
        );
        const newContent = editorContent.replace(sectionPattern, '');
        setEditorContent(newContent.trim());
      }
    },
    [editorContent, setEditorContent]
  );

  // Render extraction state (streaming)
  if (job.isExtracting) {
    return (
      <ExtractionLoadingView
        content={job.content || ''}
        jobId={job.id}
        onDelete={handleDelete}
      />
    );
  }

  // Render extraction error state
  if (job.extractionError) {
    return (
      <ExtractionErrorView
        errorMessage={job.extractionError}
        jobUrl={job.url}
        partialContent={job.content}
        editorContent={editorContent}
        jobId={job.id}
        onEditorChange={handleEditorChange}
        onDelete={handleDelete}
      />
    );
  }

  // Render migration prompt (old jobs without content)
  const hasContent = job.content && job.content.trim().length > 0;
  if (!hasContent) {
    return <MigrationPromptView jobUrl={job.url} onDelete={handleDelete} />;
  }

  // Render normal editing state
  // Build validation messages for StreamingTextarea (with fix support)
  const validationMessages = [
    ...(validation?.errors.map((e) => ({
      type: 'error' as const,
      message: e.message,
      fix: e.fix,
    })) || []),
    ...(validation?.warnings.map((w) => ({
      type: 'warning' as const,
      message: w.message,
      fix: w.fix,
    })) || []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Editor with inline validation */}
      <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-lg bg-background">
        <div className="flex-1 flex flex-col p-4">
          <StreamingTextarea
            id="jobEditor"
            data-job-id={job.id}
            value={editorContent}
            onChange={setEditorContent}
            validationMessages={validationMessages}
            onApplyFix={handleApplyFix}
            className={cn(
              'flex-1 border-l-4',
              validation?.valid
                ? 'border-l-success'
                : validation?.errors?.length
                  ? 'border-l-destructive'
                  : 'border-l-border'
            )}
          />
        </div>
      </div>
    </div>
  );
};
