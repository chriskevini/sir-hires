import React, { useCallback, useRef } from 'react';
import { useJobValidation, ChecklistItem } from '../hooks';
import { useImmediateSave } from '@/hooks/useImmediateSave';
import { ValidatedEditor } from '@/components/ui/ValidatedEditor';
import { ExtractionLoadingView } from '../components/ExtractionLoadingView';
import { ExtractionErrorView } from '../components/ExtractionErrorView';
import { MigrationPromptView } from '../components/MigrationPromptView';
import type { ValidationFix } from '@/utils/validation-types';
import { applyFix, setCursorAndScroll } from '@/utils/profile-utils';

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

  // Ref for the textarea element (for cursor positioning after fix)
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle fix button clicks (must be before early returns)
  const handleApplyFix = useCallback(
    (fix: ValidationFix) => {
      const result = applyFix(fix, editorContent, undefined, 'JOB');
      if (result) {
        setEditorContent(result.newContent);
        // Set cursor position after React re-renders
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            setCursorAndScroll(
              textareaRef.current,
              result.newContent,
              result.cursorPosition
            );
          }
        });
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
  // Build validation messages for ValidatedEditor (with fix support)
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
    <div className="flex flex-col h-full p-4">
      <ValidatedEditor
        ref={textareaRef}
        id="jobEditor"
        data-job-id={job.id}
        value={editorContent}
        onChange={setEditorContent}
        isValid={validation?.valid}
        hasErrors={(validation?.errors?.length ?? 0) > 0}
        validationMessages={validationMessages}
        onApplyFix={handleApplyFix}
      />
    </div>
  );
};
