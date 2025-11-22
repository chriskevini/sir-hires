import React from 'react';
import { escapeHtml } from '@/utils/shared-utils';

interface ExtractionErrorViewProps {
  errorMessage: string;
  jobUrl: string;
  partialContent?: string;
  editorContent: string;
  index: number;
  onEditorChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onDelete: () => void;
}

/**
 * Displays extraction error state with optional partial content editor
 * Used in ResearchingView when job extraction fails but may have partial data
 */
export function ExtractionErrorView({
  errorMessage,
  jobUrl,
  partialContent,
  editorContent,
  index,
  onEditorChange,
  onDelete,
}: ExtractionErrorViewProps) {
  const hasPartialContent = partialContent && partialContent.trim().length > 0;

  return (
    <div className="job-card researching-editor">
      <div className="extraction-error-state">
        <div className="extraction-error-header">
          <div className="extraction-error-icon">⚠️</div>
          <h3>Extraction Failed</h3>
          <p className="error-message">{escapeHtml(errorMessage)}</p>
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
              onChange={onEditorChange}
            />
          </div>
        )}

        <div className="job-actions" style={{ marginTop: '24px' }}>
          <a
            href={escapeHtml(jobUrl)}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Retry Extraction ↗
          </a>
          <button className="btn btn-delete" onClick={onDelete}>
            Delete Job
          </button>
        </div>
      </div>
    </div>
  );
}
