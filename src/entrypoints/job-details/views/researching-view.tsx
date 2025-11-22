import React, { useMemo } from 'react';
import { Checklist } from '../components/checklist';
import { parseJobTemplate } from '@/utils/job-parser';
import { escapeHtml } from '@/utils/shared-utils';
import {
  useToggleState,
  useEditorState,
  useJobValidation,
  useSimpleAutoSave,
} from '../hooks';
import { ValidationPanel } from '@/components/ui/ValidationPanel';
import { EditorHeader } from '@/components/ui/EditorHeader';
import { JobTemplatePanel } from '../components/JobTemplatePanel';
import { ExtractionLoadingView } from '../components/ExtractionLoadingView';
import { ExtractionErrorView } from '../components/ExtractionErrorView';
import { MigrationPromptView } from '../components/MigrationPromptView';

interface Job {
  url: string;
  content?: string;
  isExtracting?: boolean;
  extractionError?: string;
  checklist?: any;
  applicationStatus: string;
}

interface ResearchingViewProps {
  job: Job;
  index: number;
  isChecklistExpanded?: boolean;
  onDeleteJob: (index: number) => void;
  onSaveField: (index: number, fieldName: string, value: string) => void;
  onToggleChecklistExpand: (index: number, isExpanded: boolean) => void;
  onToggleChecklistItem: (index: number, itemId: string) => void;
}

export const ResearchingView: React.FC<ResearchingViewProps> = ({
  job,
  index,
  isChecklistExpanded = false,
  onDeleteJob,
  onSaveField,
  onToggleChecklistExpand,
  onToggleChecklistItem,
}) => {
  const [isTemplateVisible, toggleTemplateVisible, setTemplateVisible] =
    useToggleState(false);
  const [isValidationCollapsed, toggleValidationCollapsed] =
    useToggleState(true);

  const { content: editorContent, handleChange: handleEditorChange } =
    useEditorState({
      initialContent: job.content || '',
    });

  // Parse job content on-read (MarkdownDB pattern)
  const parsedJob = useMemo(() => {
    const parsed = parseJobTemplate(job.content || '');
    const fields = parsed.topLevelFields as Record<string, string>;
    return {
      jobTitle: fields.TITLE || '',
      company: fields.COMPANY || '',
    };
  }, [job.content]);

  // Use validation hook
  const validation = useJobValidation({
    content: editorContent,
    isExtracting: job.isExtracting,
    hasError: !!job.extractionError,
  });

  // Use auto-save hook
  useSimpleAutoSave({
    currentValue: editorContent,
    savedValue: job.content || '',
    isExtracting: job.isExtracting,
    hasError: !!job.extractionError,
    onSave: (value) => onSaveField(index, 'content', value),
  });

  const handleDelete = () => {
    onDeleteJob(index);
  };

  // Render extraction state (streaming)
  if (job.isExtracting) {
    return (
      <ExtractionLoadingView
        content={job.content || ''}
        jobTitle={parsedJob.jobTitle || 'Untitled Position'}
        company={parsedJob.company || 'Unknown Company'}
        index={index}
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
        index={index}
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
      <div className="job-card researching-editor">
        <div className="editor-layout">
          {/* Template Panel */}
          <JobTemplatePanel
            isVisible={isTemplateVisible}
            onClose={() => setTemplateVisible(false)}
          />

          {/* Editor Panel */}
          <div className="editor-panel">
            <EditorHeader
              title={escapeHtml(parsedJob.jobTitle || 'Untitled Position')}
              subtitle={`at ${escapeHtml(parsedJob.company || 'Unknown Company')}`}
              actions={
                <>
                  <button
                    className="btn-template-toggle"
                    onClick={toggleTemplateVisible}
                  >
                    {isTemplateVisible ? 'Hide' : 'Show'} Template
                  </button>
                  <a
                    href={escapeHtml(job.url)}
                    className="btn-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Original ↗
                  </a>
                </>
              }
            />
            <textarea
              id="jobEditor"
              className={editorClass}
              data-index={index}
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

        {/* Actions */}
        <div className="job-actions">
          <button className="btn btn-delete" onClick={handleDelete}>
            Delete Job
          </button>
        </div>
      </div>

      {/* Checklist in sidebar */}
      <Checklist
        checklist={job.checklist}
        status={job.applicationStatus || 'researching'}
        jobIndex={index}
        isExpanded={isChecklistExpanded}
        animate={false}
        onToggleExpand={onToggleChecklistExpand}
        onToggleItem={onToggleChecklistItem}
      />
    </>
  );
};
