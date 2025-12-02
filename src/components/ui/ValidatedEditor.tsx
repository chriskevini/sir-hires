import * as React from 'react';
import {
  StreamingTextarea,
  type StreamingTextareaProps,
} from './StreamingTextarea';
import {
  ValidationMessages,
  type ValidationMessage,
} from './ValidationMessages';
import { cn } from '@/lib/utils';
import type { ValidationFix } from '@/utils/validation-types';

export interface ValidatedEditorProps
  extends Omit<StreamingTextareaProps, 'hasError' | 'className'> {
  /** Validation messages to display below the textarea */
  validationMessages?: ValidationMessage[];
  /** Callback when a fix button is clicked */
  onApplyFix?: (fix: ValidationFix, enumValue?: string) => void;
  /** Whether validation is passing (controls left border color) */
  isValid?: boolean;
  /** Whether there are errors (distinct from warnings) */
  hasErrors?: boolean;
  /** Optional className for the textarea */
  textareaClassName?: string;
  /** Optional className for the container */
  className?: string;
}

/**
 * ValidatedEditor - A textarea with inline validation messages
 *
 * Composes StreamingTextarea with ValidationMessages for a unified editing experience.
 * Features:
 * - No outer border (border is on the textarea itself)
 * - Left border color indicator (success/destructive/default)
 * - Validation messages displayed below textarea with fix buttons
 *
 * @example
 * ```tsx
 * <ValidatedEditor
 *   ref={textareaRef}
 *   value={content}
 *   onChange={setContent}
 *   isValid={validation.valid}
 *   hasErrors={validation.errors.length > 0}
 *   validationMessages={messages}
 *   onApplyFix={handleApplyFix}
 * />
 * ```
 */
export const ValidatedEditor = React.forwardRef<
  HTMLTextAreaElement,
  ValidatedEditorProps
>(
  (
    {
      validationMessages = [],
      onApplyFix,
      isValid,
      hasErrors,
      textareaClassName,
      className,
      ...textareaProps
    },
    ref
  ) => {
    // Compute left border color based on validation state
    const borderColorClass = React.useMemo(() => {
      if (hasErrors) return 'border-l-destructive';
      if (isValid) return 'border-l-success';
      return 'border-l-border';
    }, [hasErrors, isValid]);

    return (
      <div className={cn('flex flex-col flex-1', className)}>
        <StreamingTextarea
          ref={ref}
          hasError={hasErrors}
          className={cn('border-l-4 pl-3', borderColorClass, textareaClassName)}
          {...textareaProps}
        />

        {/* Validation messages below textarea */}
        {validationMessages.length > 0 && (
          <ValidationMessages
            messages={validationMessages}
            onApplyFix={onApplyFix}
            className="mt-2"
          />
        )}
      </div>
    );
  }
);
ValidatedEditor.displayName = 'ValidatedEditor';

export { type ValidationMessage };
