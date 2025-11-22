import React, { useEffect, useMemo } from 'react';
import { Checklist } from '../components/checklist';
import { parseJobTemplate } from '@/utils/job-parser';
import { validateJobTemplate } from '@/utils/job-validator';
import { escapeHtml } from '@/utils/shared-utils';
import { useDebounce } from '../hooks/useDebounce';
import { useToggleState } from '../hooks/useToggleState';
import { useEditorState } from '../hooks/useEditorState';
import { ValidationPanel } from '@/components/ui/ValidationPanel';
import { EditorHeader } from '@/components/ui/EditorHeader';
import { CollapsiblePanel } from '@/components/ui/CollapsiblePanel';

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

interface ValidationResult {
  valid: boolean;
  errors: Array<{ message: string }>;
  warnings: Array<{ message: string }>;
  info: Array<{ message: string }>;
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
  const [validation, setValidation] = React.useState<ValidationResult | null>(
    null
  );

  const { content: editorContent, handleChange: handleEditorChange } =
    useEditorState({
      initialContent: job.content || '',
    });

  // Parse job content on-read (MarkdownDB pattern)
  const parsedJob = useMemo(
    () => parseJobTemplate(job.content || ''),
    [job.content]
  );

  // Get job template
  const getJobTemplate = (): string => {
    return `<JOB>
TITLE: Senior Cloud Infrastructure Engineer // required
COMPANY: Stellar Innovations Inc. // required
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID // [ONSITE|REMOTE|HYBRID]
SALARY_RANGE_MIN: 100,000
SALARY_RANGE_MAX: 150,000
EMPLOYMENT_TYPE: FULL-TIME // [FULL-TIME|PART-TIME|CONTRACT|INTERNSHIP|COOP]
EXPERIENCE_LEVEL: SENIOR // [ENTRY|MID|SENIOR|LEAD]
POSTED_DATE: 2025-11-15
CLOSING_DATE: 2025-12-31
# DESCRIPTION:
- Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.
- Develop and manage CI/CD pipelines using GitLab or Jenkins.
- Provide subject matter expertise on security, reliability, and cost optimization.
# REQUIRED_SKILLS: // required
- 7+ years of experience in DevOps or SRE roles.
- Expert-level proficiency with Terraform and Kubernetes.
- Strong knowledge of Python or Go for scripting.
# PREFERRED_SKILLS:
- Experience with FinOps principles and tooling.
- AWS Certified DevOps Engineer - Professional.
- Background in the FinTech industry.
# ABOUT_COMPANY:
- Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.
- **Culture:** We emphasize radical ownership, transparency, and continuous learning.
- **Team Structure:** Teams are cross-functional, highly autonomous, and empowered to make core product decisions.
- **Benefits:** We offer unlimited PTO, 1000% 401(k) matching and excellent health coverage.
- **Values:** We are committed to fostering diversity, equity, and inclusion in the workplace.`;
  };

  // Get complete lines (for streaming extraction state)
  const getCompleteLines = (content: string): string => {
    if (!content) return '';
    const lines = content.split('\n');
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.pop();
    }
    return lines.join('\n') + (lines.length > 0 ? '\n' : '');
  };

  // Debounced validation (500ms)
  useDebounce(
    () => {
      if (!job.content || job.isExtracting || job.extractionError) {
        return;
      }
      const parsed = parseJobTemplate(editorContent);
      const validationResult = validateJobTemplate(parsed);
      setValidation(validationResult);
    },
    500,
    [editorContent, job.content, job.isExtracting, job.extractionError]
  );

  // Debounced auto-save (2000ms)
  useDebounce(
    () => {
      if (!job.content || job.isExtracting || job.extractionError) {
        return;
      }
      if (editorContent !== job.content) {
        onSaveField(index, 'content', editorContent);
      }
    },
    2000,
    [editorContent, job.content, job.isExtracting, job.extractionError, index]
  );

  // Initialize validation on mount
  useEffect(() => {
    if (job.content && !job.isExtracting && !job.extractionError) {
      const parsed = parseJobTemplate(job.content);
      const validationResult = validateJobTemplate(parsed);
      setValidation(validationResult);
    }
  }, []);

  const handleDelete = () => {
    onDeleteJob(index);
  };

  // Render extraction state (streaming)
  if (job.isExtracting) {
    const partialContent = getCompleteLines(job.content || '');

    return (
      <div className="job-card researching-editor">
        <div className="editor-layout">
          <div className="editor-panel">
            <EditorHeader
              title={escapeHtml(parsedJob.jobTitle || 'Untitled Position')}
              subtitle={`at ${escapeHtml(parsedJob.company || 'Unknown Company')}`}
              actions={
                <div className="editor-status">
                  <span className="status-badge extracting">Extracting...</span>
                </div>
              }
            />
            <textarea
              id="jobEditor"
              className="job-markdown-editor extracting"
              readOnly
              data-index={index}
              placeholder="Waiting for LLM response..."
              value={partialContent}
            />
          </div>
        </div>
        <div className="job-actions">
          <button className="btn btn-delete" onClick={handleDelete}>
            Cancel & Delete
          </button>
        </div>
      </div>
    );
  }

  // Render extraction error state
  if (job.extractionError) {
    const partialContent = job.content || '';
    const hasPartialContent = partialContent.trim().length > 0;

    return (
      <div className="job-card researching-editor">
        <div className="extraction-error-state">
          <div className="extraction-error-header">
            <div className="extraction-error-icon">⚠️</div>
            <h3>Extraction Failed</h3>
            <p className="error-message">{escapeHtml(job.extractionError)}</p>
          </div>

          {hasPartialContent && (
            <div className="extraction-partial">
              <div className="extraction-partial-header">
                <strong>📄 Partial Content</strong>
                <span className="extraction-partial-hint">
                  (You can edit this or re-extract)
                </span>
              </div>
              <textarea
                id="jobEditor"
                className="job-markdown-editor"
                data-index={index}
                value={editorContent}
                onChange={handleEditorChange}
              />
            </div>
          )}

          <div className="job-actions" style={{ marginTop: '24px' }}>
            <a
              href={escapeHtml(job.url)}
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Retry Extraction ↗
            </a>
            <button className="btn btn-delete" onClick={handleDelete}>
              Delete Job
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render migration prompt (old jobs without content)
  const hasContent = job.content && job.content.trim().length > 0;
  if (!hasContent) {
    return (
      <div className="job-card">
        <div className="migration-prompt">
          <div className="migration-icon">⚠️</div>
          <h3>Job Needs Re-Extraction</h3>
          <p>
            This job was saved in an old format and needs to be re-extracted
            from the job posting.
          </p>
          <div className="migration-actions">
            <a
              href={escapeHtml(job.url)}
              className="btn btn-primary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Re-Extract from Original Posting ↗
            </a>
          </div>
          <div className="job-actions" style={{ marginTop: '24px' }}>
            <button className="btn btn-delete" onClick={handleDelete}>
              Delete This Job
            </button>
          </div>
        </div>
      </div>
    );
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
          {isTemplateVisible && (
            <CollapsiblePanel
              isCollapsed={false}
              onToggle={() => setTemplateVisible(false)}
              header={
                <>
                  <h3>📖 Job Template</h3>
                  <button
                    className="template-panel-close"
                    onClick={() => setTemplateVisible(false)}
                  >
                    ✕
                  </button>
                </>
              }
              className="template-panel"
            >
              <div className="template-content">
                {escapeHtml(getJobTemplate())}
              </div>
            </CollapsiblePanel>
          )}

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
