import React from 'react';
import { escapeHtml } from '@/utils/shared-utils';
import { ChevronDownIcon } from './icons';
import { Button } from './Button';
import './EditorContentPanel.css';

interface EditorContentPanelProps {
  documentKey: string;
  isActive: boolean;
  value: string;
  placeholder: string;
  textareaRef: ((el: HTMLTextAreaElement | null) => void) | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  jobId: string;
  disabled?: boolean;
}

export const EditorContentPanel: React.FC<EditorContentPanelProps> = ({
  documentKey,
  isActive,
  value,
  placeholder,
  textareaRef,
  onChange,
  onBlur,
  jobId,
  disabled = false,
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
          <Button
            variant="ghost"
            className="thinking-toggle-btn"
            title="Collapse"
          >
            {ChevronDownIcon}
          </Button>
        </div>
        <textarea className="thinking-content" readOnly />
      </div>

      {/* Document editor */}
      <textarea
        ref={textareaRef}
        className="document-editor"
        data-field={`${documentKey}-text`}
        placeholder={escapeHtml(placeholder)}
        data-job-id={jobId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
      />
    </div>
  );
};
