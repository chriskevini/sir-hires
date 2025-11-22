import React from 'react';

interface EditorFooterProps {
  saveStatus: string;
  wordCount: number;
}

export const EditorFooter: React.FC<EditorFooterProps> = ({
  saveStatus,
  wordCount,
}) => {
  return (
    <div className="editor-footer">
      <div className="editor-status">
        <span className="save-status-indicator visible saved" id="saveStatus">
          {saveStatus}
        </span>
      </div>
      <div className="editor-meta">
        <span className="word-count" id="wordCount">
          {wordCount} words
        </span>
      </div>
    </div>
  );
};
