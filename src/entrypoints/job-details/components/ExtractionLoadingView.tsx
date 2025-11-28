import React from 'react';
import { Button } from '@/components/ui/Button';
import { getCompleteLines } from '@/utils/text-utils';
import '@/components/features/JobViewRouter.css';
import '../views/ResearchingView.css';

interface ExtractionLoadingViewProps {
  content: string;
  jobId: string;
  onDelete: () => void;
}

/**
 * ExtractionLoadingView - Displays streaming extraction state
 * Shows partial content while LLM is extracting job details
 *
 * Structure matches JobViewRouter for seamless transitions:
 * - .job-view-container wrapper (same as JobViewRouter)
 * - .job-view-content with 16px padding (scrollable content area)
 * - .extraction-actions footer (matches JobFooter height: 56px)
 */
export const ExtractionLoadingView: React.FC<ExtractionLoadingViewProps> = ({
  content,
  jobId,
  onDelete,
}) => {
  const partialContent = getCompleteLines(content);

  return (
    <div className="job-view-container compact">
      <div className="job-view-content">
        <div className="researching-editor">
          <div className="editor-layout">
            <div className="editor-panel">
              <textarea
                id="jobEditor"
                className="job-markdown-editor extracting"
                readOnly
                data-job-id={jobId}
                placeholder="Waiting for LLM response..."
                value={partialContent}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="extraction-actions">
        <Button variant="secondary" onClick={onDelete}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
