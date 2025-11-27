import React, { useMemo, useCallback } from 'react';
import { useParsedJob } from '@/components/features/ParsedJobProvider';
import { JobViewOverlay } from '@/components/features/JobViewOverlay';
import { escapeHtml } from '@/utils/shared-utils';
import { useToggleState, useJobValidation, ChecklistItem } from '../hooks';
import { useImmediateSave } from '@/hooks/useImmediateSave';
import { ValidationPanel } from '@/components/ui/ValidationPanel';
import { EditorHeader } from '@/components/ui/EditorHeader';
import { ExtractionLoadingView } from '../components/ExtractionLoadingView';
import { ExtractionErrorView } from '../components/ExtractionErrorView';
import { MigrationPromptView } from '../components/MigrationPromptView';
import './ResearchingView.css';

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
  isChecklistExpanded?: boolean;
  onDeleteJob: (jobId: string) => void;
  onSaveField: (jobId: string, fieldName: string, value: string) => void;
  onToggleChecklistExpand: (isExpanded: boolean) => void;
  onToggleChecklistItem: (jobId: string, itemId: string) => void;
  hideOverlay?: boolean;
}

export const ResearchingView: React.FC<ResearchingViewProps> = ({
  job,
  isChecklistExpanded = false,
  onDeleteJob,
  onSaveField,
  onToggleChecklistExpand,
  onToggleChecklistItem,
  hideOverlay = false,
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

  // Handle textarea change
  const handleEditorChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setEditorContent(e.target.value);
    },
    [setEditorContent]
  );

  // Parse job content on-read (MarkdownDB pattern) using cached provider
  const parsed = useParsedJob(job.id);
  const parsedJob = useMemo(() => {
    const fields = (parsed?.topLevelFields as Record<string, string>) || {};
    return {
      jobTitle: fields.TITLE || '',
      company: fields.COMPANY || '',
    };
  }, [parsed]);

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
        jobTitle={parsedJob.jobTitle || 'Untitled Position'}
        company={parsedJob.company || 'Unknown Company'}
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
  const editorClass = validation?.valid
    ? 'job-markdown-editor is-valid'
    : 'job-markdown-editor has-errors';

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
    <>
      <div className="researching-editor">
        <div className="editor-layout">
          {/* Editor Panel */}
          <div className="editor-panel">
            <EditorHeader
              title={escapeHtml(parsedJob.jobTitle || 'Untitled Position')}
              subtitle={`at ${escapeHtml(parsedJob.company || 'Unknown Company')}`}
              actions={
                <a
                  href={escapeHtml(job.url)}
                  className="btn-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Original ↗
                </a>
              }
            />
            <textarea
              id="jobEditor"
              className={editorClass}
              data-job-id={job.id}
              value={editorContent}
              onChange={handleEditorChange}
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

      {/* Overlay container for Checklist and Navigation */}
      <JobViewOverlay
        job={job}
        isChecklistExpanded={isChecklistExpanded}
        onSaveField={onSaveField}
        onToggleChecklistExpand={onToggleChecklistExpand}
        onToggleChecklistItem={onToggleChecklistItem}
        hidden={hideOverlay}
      />
    </>
  );
};
