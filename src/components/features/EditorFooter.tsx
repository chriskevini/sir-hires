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
    <div className="flex justify-between items-center py-3 px-5 bg-neutral-100 border-t border-neutral-200 text-xs text-neutral-500">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'font-medium transition-opacity duration-200',
            isSaving && 'text-blue-600',
            isSaved && 'text-green-600'
          )}
          id="saveStatus"
        >
          {saveStatus}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-medium text-neutral-500" id="wordCount">
          {wordCount} words
        </span>
      </div>
    </div>
  );
};
