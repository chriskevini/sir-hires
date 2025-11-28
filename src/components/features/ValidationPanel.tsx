import React from 'react';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';

interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
}

interface ValidationPanelProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isValid: boolean | null;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  messages: ValidationMessage[];
  className?: string;
}

/**
 * Validation panel component displaying validation status and messages.
 * Shows errors, warnings, and info messages with counts.
 */
export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  isCollapsed,
  onToggle,
  isValid,
  errorCount,
  warningCount,
  infoCount,
  messages,
  className = '',
}) => {
  const statusIcon = isValid === null ? '⏳' : isValid ? '✓' : '✗';
  const statusText =
    isValid === null ? 'Validating...' : isValid ? 'Valid Job' : 'Invalid Job';

  const header = (
    <>
      <div className="flex items-center gap-3 text-[13px] font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{statusIcon}</span>
          <span>{statusText}</span>
        </div>
        <div className="flex gap-3 text-xs font-medium">
          {errorCount > 0 && (
            <span className="text-red-600">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-amber-600">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
          {infoCount > 0 && (
            <span className="text-blue-600">{infoCount} custom</span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <CollapsiblePanel
      isCollapsed={isCollapsed}
      onToggle={onToggle}
      header={header}
      className={className}
    >
      {messages.length === 0 ? (
        <div className="text-gray-500 text-[13px] text-center p-4">
          No validation messages
        </div>
      ) : (
        messages.map((m, i) => (
          <div
            key={i}
            className={`px-3 py-2 mb-2 last:mb-0 rounded text-[13px] leading-relaxed border-l-[3px] ${
              m.type === 'error'
                ? 'bg-red-50 border-l-red-600 text-red-900'
                : m.type === 'warning'
                  ? 'bg-amber-50 border-l-amber-500 text-amber-900'
                  : 'bg-blue-50 border-l-blue-600 text-blue-800'
            }`}
          >
            {m.message}
          </div>
        ))
      )}
    </CollapsiblePanel>
  );
};
