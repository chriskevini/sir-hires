import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
    <Card>
      <CardContent className="flex flex-col items-center text-center pt-6">
        <div className="mb-4">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Extraction Failed
          </h3>
          <p className="text-destructive text-sm">{escapeHtml(errorMessage)}</p>
        </div>

        {hasPartialContent && (
          <div className="w-full mt-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <strong className="text-sm text-foreground">
                📄 Partial Content
              </strong>
              <span className="text-sm text-muted-foreground">
                (You can edit this or re-extract)
              </span>
            </div>
            <Textarea
              id="jobEditor"
              className="w-full min-h-48 p-3 font-mono text-sm border border-border rounded resize-y"
              data-job-id={jobId}
              value={editorContent}
              onChange={onEditorChange}
            />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="primary" asChild>
            <a
              href={escapeHtml(jobUrl)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Retry Extraction ↗
            </a>
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Delete Job
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
