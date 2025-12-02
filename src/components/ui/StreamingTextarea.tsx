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
        disabled: 'bg-background text-muted-foreground cursor-not-allowed',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface StreamingTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'>,
    VariantProps<typeof streamingTextareaVariants> {
  /** Whether content is actively streaming from LLM */
  isStreaming?: boolean;
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Whether there are validation errors (affects border state) */
  hasError?: boolean;
  /** Minimum height for the textarea */
  minHeight?: string;
}

/**
 * StreamingTextarea - A textarea with streaming state indicator
 *
 * Pure textarea component that shows a streaming indicator when content
 * is being streamed from an LLM. Does not handle validation - use
 * ValidatedEditor for that.
 */
const StreamingTextarea = React.forwardRef<
  HTMLTextAreaElement,
  StreamingTextareaProps
>(
  (
    {
      className,
      state,
      isStreaming,
      onChange,
      onBlur,
      disabled,
      hasError,
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
      if (hasError) return 'error';
      return state || 'default';
    }, [disabled, isStreaming, hasError, state]);

    // Handle change
    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e.target.value);
      },
      [onChange]
    );

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
          onBlur={onBlur}
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
      </div>
    );
  }
);
StreamingTextarea.displayName = 'StreamingTextarea';

export { StreamingTextarea };
