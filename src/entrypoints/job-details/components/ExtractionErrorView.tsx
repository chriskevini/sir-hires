import React from 'react';
import { Button } from '@/components/ui/Button';
import { escapeHtml } from '@/utils/shared-utils';

interface ExtractionErrorViewProps {
  errorMessage: string;
  jobUrl: string;
  partialContent?: string;
  editorContent: string;
  jobId: string;
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
  jobId,
  onEditorChange,
  onDelete,
}: ExtractionErrorViewProps) {
  const hasPartialContent = partialContent && partialContent.trim().length > 0;

  return (
    <div className="bg-background border border-border rounded-md p-6">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Extraction Failed
          </h3>
          <p className="text-red-600 text-sm">{escapeHtml(errorMessage)}</p>
        </div>

        {hasPartialContent && (
          <div className="w-full mt-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <strong className="text-sm text-foreground">
                📄 Partial Content
              </strong>
              <span className="text-xs text-muted-foreground">
                (You can edit this or re-extract)
              </span>
            </div>
            <textarea
              id="jobEditor"
              className="w-full min-h-[200px] p-3 font-mono text-sm border border-border rounded resize-y focus:outline-none focus:border-primary"
              data-job-id={jobId}
              value={editorContent}
              onChange={onEditorChange}
            />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <a
            href={escapeHtml(jobUrl)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded font-semibold text-sm hover:bg-purple-700 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            Retry Extraction ↗
          </a>
          <Button variant="danger" onClick={onDelete}>
            Delete Job
          </Button>
        </div>
      </div>
    </div>
  );
}
