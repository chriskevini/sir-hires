import React from 'react';
import { CollapsiblePanel } from './CollapsiblePanel';
import './ValidationPanel.css';

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
      <div className="validation-header-left">
        <div className="validation-status">
          <span className="status-icon">{statusIcon}</span>
          <span>{statusText}</span>
        </div>
        <div className="validation-counts">
          {errorCount > 0 && (
            <span className="count-errors">
              {errorCount} error{errorCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="count-warnings">
              {warningCount} warning{warningCount > 1 ? 's' : ''}
            </span>
          )}
          {infoCount > 0 && (
            <span className="count-info">{infoCount} custom</span>
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
      className={`validation-panel ${className}`}
    >
      {messages.length === 0 ? (
        <div className="validation-empty">No validation messages</div>
      ) : (
        messages.map((m, i) => (
          <div key={i} className={`validation-message validation-${m.type}`}>
            {m.message}
          </div>
        ))
      )}
    </CollapsiblePanel>
  );
};
