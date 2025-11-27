import React from 'react';
import { escapeHtml } from '@/utils/shared-utils';
import './EditorContentPanel.css';

interface EditorContentPanelProps {
  documentKey: string;
  isActive: boolean;
  value: string;
  placeholder: string;
  textareaRef: ((el: HTMLTextAreaElement | null) => void) | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  index: number;
}

export const EditorContentPanel: React.FC<EditorContentPanelProps> = ({
  documentKey,
  isActive,
  value,
  placeholder,
  textareaRef,
  onChange,
  onBlur,
  index,
}) => {
  return (
    <div
      className={`editor-content ${isActive ? 'active' : ''}`}
      data-content={documentKey}
    >
      {/* Thinking panel (initially hidden) */}
      <div className="thinking-stream-panel hidden">
        <div className="thinking-header">
          <span className="thinking-title">🤔 AI Thinking Process</span>
          <button className="thinking-toggle-btn" title="Collapse">
            ▼
          </button>
        </div>
        <textarea className="thinking-content" readOnly />
      </div>

      {/* Document editor */}
      <textarea
        ref={textareaRef}
        className="document-editor"
        data-field={`${documentKey}-text`}
        placeholder={escapeHtml(placeholder)}
        data-index={index}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </div>
  );
};
