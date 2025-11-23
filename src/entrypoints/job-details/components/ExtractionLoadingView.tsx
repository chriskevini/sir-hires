import React from 'react';
import { EditorHeader } from '@/components/ui/EditorHeader';
import { escapeHtml } from '@/utils/shared-utils';
import { getCompleteLines } from '@/utils/text-utils';
import '../views/researching-view.css';

interface ExtractionLoadingViewProps {
  content: string;
  jobTitle: string;
  company: string;
  index: number;
  onDelete: () => void;
}

/**
 * ExtractionLoadingView - Displays streaming extraction state
 * Shows partial content while LLM is extracting job details
 */
export const ExtractionLoadingView: React.FC<ExtractionLoadingViewProps> = ({
  content,
  jobTitle,
  company,
  index,
  onDelete,
}) => {
  const partialContent = getCompleteLines(content);

  return (
    <div className="job-card researching-editor">
      <div className="editor-layout">
        <div className="editor-panel">
          <EditorHeader
            title={escapeHtml(jobTitle || 'Untitled Position')}
            subtitle={`at ${escapeHtml(company || 'Unknown Company')}`}
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
        <button className="btn btn-delete" onClick={onDelete}>
          Cancel & Delete
        </button>
      </div>
    </div>
  );
};
