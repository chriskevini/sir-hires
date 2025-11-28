import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CollapsiblePanel } from '../ui/CollapsiblePanel';
import { Button } from '../ui/Button';
import type { ValidationFix } from '@/utils/validation-types';

interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: ValidationFix | null;
}

interface QuickAction {
  label: string;
  onClick: () => void;
  title?: string;
}

interface ValidationPanelProps {
  /** Controlled collapsed state */
  isCollapsed?: boolean;
  /** Callback when toggle is clicked (for controlled mode) */
  onToggle?: () => void;
  /** Initial collapsed state (for uncontrolled mode) */
  initialCollapsed?: boolean;
  /** Overall validity status: true = valid, false = invalid, null = validating */
  isValid: boolean | null;
  /** Number of errors */
  errorCount: number;
  /** Number of warnings */
  warningCount: number;
  /** Number of info/custom messages */
  infoCount: number;
  /** Validation messages to display */
  messages: ValidationMessage[];
  /** Optional className for the container */
  className?: string;
  /** Label for valid state (default: "Valid") */
  validLabel?: string;
  /** Label for invalid state (default: "Invalid") */
  invalidLabel?: string;
  /** Callback when a fix button is clicked */
  onApplyFix?: (fix: ValidationFix, enumValue?: string) => void;
  /** Optional quick actions to display in a bar below the header */
  quickActions?: QuickAction[];
}

/**
 * Unified validation panel component displaying validation status and messages.
 * Supports both simple display mode and advanced mode with fix buttons and quick actions.
 *
 * Simple usage (job validation):
 * ```tsx
 * <ValidationPanel
 *   isCollapsed={isCollapsed}
 *   onToggle={toggleCollapsed}
 *   isValid={validation.valid}
 *   errorCount={errors.length}
 *   warningCount={warnings.length}
 *   infoCount={info.length}
 *   messages={messages}
 * />
 * ```
 *
 * Advanced usage (profile validation with fixes):
 * ```tsx
 * <ValidationPanel
 *   initialCollapsed={true}
 *   isValid={!hasErrors}
 *   errorCount={errors.length}
 *   warningCount={warnings.length}
 *   infoCount={customCount}
 *   messages={messagesWithFixes}
 *   onApplyFix={handleApplyFix}
 *   quickActions={[
 *     { label: '+ Education', onClick: insertEducation },
 *     { label: '+ Experience', onClick: insertExperience },
 *   ]}
 *   validLabel="Valid Profile"
 *   invalidLabel="Validation Errors"
 * />
 * ```
 */
export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  isCollapsed: controlledCollapsed,
  onToggle,
  initialCollapsed = true,
  isValid,
  errorCount,
  warningCount,
  infoCount,
  messages,
  className = '',
  validLabel = 'Valid',
  invalidLabel = 'Invalid',
  onApplyFix,
  quickActions,
}) => {
  // Support both controlled and uncontrolled modes
  const [internalCollapsed, setInternalCollapsed] = useState(initialCollapsed);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;
  const handleToggle =
    onToggle ?? (() => setInternalCollapsed((prev) => !prev));

  // Compute status display
  const getStatusDisplay = () => {
    if (isValid === null) {
      return { icon: '⏳', text: 'Validating...', color: 'text-gray-500' };
    }
    if (errorCount > 0) {
      return { icon: '✗', text: invalidLabel, color: 'text-red-600' };
    }
    if (warningCount > 0) {
      return {
        icon: '⚠',
        text: 'Warnings',
        color: 'text-amber-600',
      };
    }
    if (isValid) {
      return { icon: '✓', text: validLabel, color: 'text-green-600' };
    }
    return { icon: '○', text: 'No Content', color: 'text-gray-500' };
  };

  const status = getStatusDisplay();

  const header = (
    <>
      <div className="flex items-center gap-3 text-sm font-semibold">
        <div className="flex items-center gap-1.5">
          <span className={`text-base ${status.color}`}>{status.icon}</span>
          <span className={status.color}>{status.text}</span>
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
      <span className="text-xs text-gray-500">
        {isCollapsed ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </span>
    </>
  );

  const renderMessage = (m: ValidationMessage, index: number) => {
    const baseClasses =
      'px-3 py-2 mb-2 last:mb-0 rounded text-sm leading-relaxed border-l-[3px]';
    const typeClasses =
      m.type === 'error'
        ? 'bg-red-50 border-l-red-600 text-red-900'
        : m.type === 'warning'
          ? 'bg-amber-50 border-l-amber-500 text-amber-900'
          : 'bg-blue-50 border-l-blue-600 text-blue-800';

    // Handle multi-value enum fixes (show multiple buttons)
    if (
      m.fix &&
      m.fix.type === 'replace_enum_value_multi' &&
      m.fix.allowedValues &&
      onApplyFix
    ) {
      return (
        <div key={index} className={`${baseClasses} ${typeClasses}`}>
          {m.message}. Allowed:
          {m.fix.allowedValues.map((value) => (
            <Button
              key={value}
              variant="link"
              onClick={() => onApplyFix(m.fix!, value)}
              title={`Replace with ${value}`}
            >
              {value}
            </Button>
          ))}
        </div>
      );
    }

    // Handle single-action fixes
    return (
      <div key={index} className={`${baseClasses} ${typeClasses}`}>
        {m.message}
        {m.fix && onApplyFix && (
          <Button
            variant="link"
            onClick={() => onApplyFix(m.fix!)}
            title={m.fix.description}
          >
            {m.fix.buttonLabel}
          </Button>
        )}
      </div>
    );
  };

  return (
    <CollapsiblePanel
      isCollapsed={isCollapsed}
      onToggle={handleToggle}
      header={header}
      className={className}
    >
      {/* Quick Actions Bar */}
      {quickActions && quickActions.length > 0 && (
        <div className="flex gap-2 border-b border-gray-300 bg-gray-100 px-3 py-2 text-xs -mx-4 -mt-3 mb-3">
          <span className="self-center font-semibold text-gray-600">
            Quick Actions:
          </span>
          {quickActions.map((action, i) => (
            <Button
              key={i}
              variant="link"
              onClick={action.onClick}
              title={action.title}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="text-gray-500 text-sm text-center p-4">
          No validation messages
        </div>
      ) : (
        messages.map((m, i) => renderMessage(m, i))
      )}
    </CollapsiblePanel>
  );
};

/**
 * Utility function to compute editor className based on validation state.
 * Returns Tailwind classes for left border coloring.
 */
export function getValidationEditorClass(
  hasErrors: boolean,
  hasWarnings: boolean,
  hasContent: boolean
): string {
  if (hasErrors) {
    return 'border-l-4 border-l-red-600';
  } else if (hasWarnings) {
    return 'border-l-4 border-l-amber-500';
  } else if (hasContent) {
    return 'border-l-4 border-l-green-600';
  }
  return '';
}
