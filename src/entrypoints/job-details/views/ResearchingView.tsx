import React, { useCallback } from 'react';
import { escapeHtml } from '@/utils/shared-utils';
import { useToggleState, useJobValidation, ChecklistItem } from '../hooks';
import { useImmediateSave } from '@/hooks/useImmediateSave';
import { ValidationPanel } from '@/components/features/ValidationPanel';
import { StreamingTextarea } from '@/components/ui/StreamingTextarea';
import { ExtractionLoadingView } from '../components/ExtractionLoadingView';
import { ExtractionErrorView } from '../components/ExtractionErrorView';
import { MigrationPromptView } from '../components/MigrationPromptView';
import { cn } from '@/lib/utils';

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
  const [isValidationCollapsed, toggleValidationCollapsed] =
    useToggleState(true);

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
  // Build validation messages for StreamingTextarea
  const validationMessages = [
    ...(validation?.errors.map((e) => ({
      type: 'error' as const,
      message: e.message,
    })) || []),
    ...(validation?.warnings.map((w) => ({
      type: 'warning' as const,
      message: w.message,
    })) || []),
  ];

  const errorCount = validation?.errors.length || 0;
  const warningCount = validation?.warnings.length || 0;
  const infoCount = validation?.info.length || 0;

  const messages = [
    ...(validation?.errors.map((e) => ({
      type: 'error' as const,
      message: e.message,
    })) || []),
    ...(validation?.warnings.map((w) => ({
      type: 'warning' as const,
      message: w.message,
    })) || []),
    ...(validation?.info.map((i) => ({
      type: 'info' as const,
      message: i.message,
    })) || []),
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-row flex-1 overflow-hidden">
        {/* Editor Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white p-2">
          <StreamingTextarea
            id="jobEditor"
            data-job-id={job.id}
            value={editorContent}
            onChange={setEditorContent}
            validationMessages={validationMessages}
            minHeight="100%"
            className={cn(
              'flex-1 border-l-4',
              validation?.valid
                ? 'border-l-green-600'
                : validation?.errors?.length
                  ? 'border-l-red-600'
                  : 'border-l-gray-200'
            )}
          />
        </div>
      </div>

      {/* Validation Panel */}
      <ValidationPanel
        isCollapsed={isValidationCollapsed}
        onToggle={toggleValidationCollapsed}
        isValid={validation?.valid ?? null}
        errorCount={errorCount}
        warningCount={warningCount}
        infoCount={infoCount}
        messages={messages.map((m) => ({
          ...m,
          message: escapeHtml(m.message),
        }))}
      />
    </div>
  );
};
