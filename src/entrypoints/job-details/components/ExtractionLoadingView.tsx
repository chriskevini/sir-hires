import React from 'react';
import { Button } from '@/components/ui/Button';
import { getCompleteLines } from '@/utils/text-utils';

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
 * - Outer container with flex column layout
 * - Scrollable content area with 16px padding
 * - Footer actions bar (matches JobFooter height: 56px)
 */
export const ExtractionLoadingView: React.FC<ExtractionLoadingViewProps> = ({
  content,
  jobId,
  onDelete,
}) => {
  const partialContent = getCompleteLines(content);

  return (
    <div className="flex flex-col h-full relative bg-transparent">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4">
        {/* Researching editor container */}
        <div className="flex flex-col h-full gap-0">
          {/* Editor layout */}
          <div className="flex flex-row flex-1 overflow-hidden gap-0">
            {/* Editor panel */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <textarea
                id="jobEditor"
                className="flex-1 w-full p-4 border-none border-l-4 border-l-amber-400 text-sm font-mono leading-relaxed resize-none bg-neutral-50 overflow-y-auto cursor-wait opacity-95 focus:outline-none"
                readOnly
                data-job-id={jobId}
                placeholder="Waiting for LLM response..."
                value={partialContent}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Footer actions - matches JobFooter height: min-h-14 (56px) */}
      <div className="flex items-center px-4 py-3 border-t border-neutral-200 bg-white flex-shrink-0 min-h-14 box-border">
        <Button variant="danger" onClick={onDelete} className="w-full">
          Cancel Extraction
        </Button>
      </div>
    </div>
  );
};
