import React from 'react';
import { cn } from '@/lib/utils';

interface EditorFooterProps {
  saveStatus: string;
  wordCount: number;
}

export const EditorFooter: React.FC<EditorFooterProps> = ({
  saveStatus,
  wordCount,
}) => {
  // Determine save status styling
  const isSaving = saveStatus.toLowerCase().includes('saving');
  const isSaved = saveStatus.toLowerCase().includes('saved');

  return (
    <div className="flex justify-between items-center py-2 px-4 bg-card border-t border-border text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'font-medium transition-opacity duration-200',
            isSaving && 'text-primary',
            isSaved && 'text-success'
          )}
          id="saveStatus"
        >
          {saveStatus}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium text-muted-foreground" id="wordCount">
          {wordCount} words
        </span>
      </div>
    </div>
  );
};
