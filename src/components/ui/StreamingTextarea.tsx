import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const streamingTextareaVariants = cva(
  'w-full p-4 font-mono text-sm leading-relaxed border rounded resize-none transition-all duration-200 focus:outline-none focus:ring-2',
  {
    variants: {
      state: {
        default:
          'bg-background border-border focus:border-primary focus:ring-primary/10',
        streaming:
          'bg-primary/5 border-primary ring-2 ring-primary/20 animate-pulse',
        error:
          'bg-destructive/10 border-destructive/50 focus:border-destructive focus:ring-destructive/10',
        disabled: 'bg-muted text-muted-foreground cursor-not-allowed',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface StreamingTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>,
    VariantProps<typeof streamingTextareaVariants> {
  /** Whether content is actively streaming from LLM */
  isStreaming?: boolean;
  /** Validation messages to display below textarea */
  validationMessages?: ValidationMessage[];
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Callback when validation should run */
  onValidate?: (content: string) => void;
  /** Minimum height for the textarea */
  minHeight?: string;
}

const StreamingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  StreamingTextareaProps
>(
  (
    {
      className,
      state,
      isStreaming,
      validationMessages,
      onChange,
      onValidate,
      onBlur,
      disabled,
      minHeight = '450px',
      value,
      ...props
    },
    ref
  ) => {
    // Determine state from props
    const computedState = React.useMemo(() => {
      if (disabled) return 'disabled';
      if (isStreaming) return 'streaming';
      if (validationMessages?.some((m) => m.type === 'error')) return 'error';
      return state || 'default';
    }, [disabled, isStreaming, validationMessages, state]);

    // Handle change with validation
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange?.(newValue);
      },
      [onChange]
    );

    // Handle blur with validation
    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLTextAreaElement>) => {
        onValidate?.(e.target.value);
        onBlur?.(e);
      },
      [onValidate, onBlur]
    );

    // Group messages by type
    const errors = validationMessages?.filter((m) => m.type === 'error') || [];
    const warnings =
      validationMessages?.filter((m) => m.type === 'warning') || [];

    return (
      <div className="relative flex-1 flex flex-col">
        <textarea
          ref={ref}
          className={cn(
            streamingTextareaVariants({ state: computedState }),
            'flex-1',
            className
          )}
          style={{ minHeight }}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled || isStreaming}
          value={value}
          {...props}
        />

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded">
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
            Streaming...
          </div>
        )}

        {/* Validation messages */}
        {(errors.length > 0 || warnings.length > 0) && (
          <div className="mt-2 space-y-1">
            {errors.map((err, i) => (
              <p
                key={`error-${i}`}
                className="text-sm text-destructive flex items-start gap-1.5"
              >
                <span className="text-destructive mt-0.5">●</span>
                {err.field && <span className="font-medium">{err.field}:</span>}
                {err.message}
              </p>
            ))}
            {warnings.map((warn, i) => (
              <p
                key={`warning-${i}`}
                className="text-sm text-warning flex items-start gap-1.5"
              >
                <span className="text-warning mt-0.5">●</span>
                {warn.field && (
                  <span className="font-medium">{warn.field}:</span>
                )}
                {warn.message}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
);
StreamingTextarea.displayName = 'StreamingTextarea';

export { StreamingTextarea, streamingTextareaVariants };
