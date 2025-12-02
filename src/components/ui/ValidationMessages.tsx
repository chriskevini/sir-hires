import * as React from 'react';
import { Button } from './Button';
import { cn } from '@/lib/utils';
import type { ValidationFix } from '@/utils/validation-types';

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  fix?: ValidationFix | null;
}

export interface ValidationMessagesProps {
  /** Validation messages to display */
  messages: ValidationMessage[];
  /** Callback when a fix button is clicked */
  onApplyFix?: (fix: ValidationFix, enumValue?: string) => void;
  /** Optional className for the container */
  className?: string;
}

/**
 * ValidationMessages - Renders a list of validation errors/warnings with fix buttons
 *
 * A simple, focused component for displaying validation feedback inline.
 * Does not handle collapsing/expanding - use ValidationPanel for that.
 *
 * @example
 * ```tsx
 * <ValidationMessages
 *   messages={[
 *     { type: 'error', message: 'Missing required field', fix: { type: 'insert', ... } },
 *     { type: 'warning', message: 'Consider adding more details' },
 *   ]}
 *   onApplyFix={handleApplyFix}
 * />
 * ```
 */
export const ValidationMessages: React.FC<ValidationMessagesProps> = ({
  messages,
  onApplyFix,
  className,
}) => {
  if (messages.length === 0) {
    return null;
  }

  const renderMessage = (m: ValidationMessage, index: number) => {
    const baseClasses =
      'px-3 py-1 text-sm leading-snug flex items-start gap-2 flex-wrap';
    const typeClasses =
      m.type === 'error'
        ? 'text-destructive'
        : m.type === 'warning'
          ? 'text-warning'
          : 'text-primary';

    // Handle multi-value enum fixes (show multiple buttons)
    if (
      m.fix &&
      m.fix.type === 'replace_enum_value_multi' &&
      m.fix.allowedValues &&
      onApplyFix
    ) {
      return (
        <div key={index} className={cn(baseClasses, typeClasses)}>
          <span className="flex-1">{m.message}. Allowed:</span>
          <div className="flex gap-1 flex-wrap">
            {m.fix.allowedValues.map((value) => (
              <Button
                key={value}
                variant="secondary"
                size="sm"
                onClick={() => onApplyFix(m.fix!, value)}
                title={`Replace with ${value}`}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
      );
    }

    // Handle single-action fixes
    return (
      <div key={index} className={cn(baseClasses, typeClasses)}>
        <span className="flex-1">{m.message}</span>
        {m.fix && onApplyFix && (
          <Button
            variant="secondary"
            size="sm"
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
    <div className={cn('flex flex-col', className)}>
      {messages.map((m, i) => renderMessage(m, i))}
    </div>
  );
};
