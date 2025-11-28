import React from 'react';
import { escapeHtml } from '@/utils/shared-utils';
import { ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { StreamingTextarea } from '../ui/StreamingTextarea';

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
  /** Whether content is actively streaming from LLM */
  isStreaming?: boolean;
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
  isStreaming = false,
}) => {
  return (
    <div
      className={`flex-col p-5 gap-3 ${isActive ? 'flex' : 'hidden'}`}
      data-content={documentKey}
    >
      {/* Thinking panel (initially hidden) */}
      <div className="hidden bg-gray-50 border border-gray-200 rounded-md mb-3 overflow-hidden transition-all duration-300">
        <div className="flex justify-between items-center px-3 py-2 bg-blue-50 border-b border-blue-100 cursor-pointer select-none">
          <span className="text-[13px] font-semibold text-blue-600">
            🤔 AI Thinking Process
          </span>
          <Button
            variant="ghost"
            className="bg-transparent border-none text-blue-600 text-sm cursor-pointer px-1.5 py-0.5 leading-none hover:bg-blue-600/10 hover:rounded transition-transform duration-200"
            title="Collapse"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
        <StreamingTextarea
          className="w-[calc(100%-24px)] m-3 text-gray-700 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400"
          readOnly
        />
      </div>

      {/* Document editor */}
      <StreamingTextarea
        ref={textareaRef}
        data-field={`${documentKey}-text`}
        placeholder={escapeHtml(placeholder)}
        data-job-id={jobId}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        isStreaming={isStreaming}
      />
    </div>
  );
};
