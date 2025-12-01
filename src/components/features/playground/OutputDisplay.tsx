/**
 * Output Display Components
 *
 * Reusable components for displaying task execution results in the playground.
 * Includes error display, stats display, and output (thinking + content) display.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { RunStats } from './types';

// =============================================================================
// ERROR DISPLAY
// =============================================================================

export interface TaskErrorDisplayProps {
  /** Error message to display */
  error: string | null;
  /** Optional additional class name */
  className?: string;
}

/**
 * Displays task execution errors with consistent styling.
 * Returns null if no error is present.
 */
export const TaskErrorDisplay: React.FC<TaskErrorDisplayProps> = React.memo(
  ({ error, className }) => {
    if (!error) return null;

    return (
      <div
        className={cn(
          'p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive',
          className
        )}
      >
        <p className="text-sm font-medium">Error</p>
        <p className="text-sm mt-1 whitespace-pre-wrap">{error}</p>
      </div>
    );
  }
);

TaskErrorDisplay.displayName = 'TaskErrorDisplay';

// =============================================================================
// STATS DISPLAY
// =============================================================================

export interface TaskStatsDisplayProps {
  /** Task execution stats (null before first run) */
  stats: RunStats | null;
  /** Optional additional class name */
  className?: string;
}

/**
 * Displays task execution statistics: duration, TTFT, first output time, and tokens.
 * Shows placeholder text when no stats are available.
 */
export const TaskStatsDisplay: React.FC<TaskStatsDisplayProps> = React.memo(
  ({ stats, className }) => {
    return (
      <div className={cn('p-3 rounded-lg border bg-card min-h-11', className)}>
        {stats ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div>
              <span className="text-muted-foreground">Duration:</span>{' '}
              <span className="font-mono">
                {(stats.duration / 1000).toFixed(2)}s
              </span>
            </div>
            {stats.ttft !== null && (
              <div>
                <span className="text-muted-foreground">TTFT:</span>{' '}
                <span className="font-mono">
                  {(stats.ttft / 1000).toFixed(2)}s
                </span>
              </div>
            )}
            {stats.ttFirstDocument !== null && (
              <div>
                <span className="text-muted-foreground">First output:</span>{' '}
                <span className="font-mono">
                  {(stats.ttFirstDocument / 1000).toFixed(2)}s
                </span>
              </div>
            )}
            {(stats.promptTokens !== null ||
              stats.completionTokens !== null) && (
              <div>
                <span className="text-muted-foreground">Tokens:</span>{' '}
                <span className="font-mono">
                  {stats.promptTokens ?? '?'} in →{' '}
                  {stats.completionTokens ?? '?'} out
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground italic">
            Stats will appear here after running...
          </div>
        )}
      </div>
    );
  }
);

TaskStatsDisplay.displayName = 'TaskStatsDisplay';

// =============================================================================
// OUTPUT DISPLAY (Thinking + Content)
// =============================================================================

export interface TaskOutputDisplayProps {
  /** Thinking content (from extended thinking models) */
  thinking: string;
  /** Main output content */
  output: string;
  /** Label for the output section */
  outputLabel?: string;
  /** Placeholder text for empty output */
  placeholder?: string;
  /** Optional additional class name */
  className?: string;
}

/**
 * Displays task output including optional thinking section and main output.
 * The thinking section only appears when content is present.
 */
export const TaskOutputDisplay: React.FC<TaskOutputDisplayProps> = React.memo(
  ({
    thinking,
    output,
    outputLabel = 'LLM Output',
    placeholder = 'Output will appear here...',
    className,
  }) => {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Thinking Output (if any) */}
        {thinking && (
          <div>
            <label className="block text-sm font-medium mb-2">Thinking</label>
            <textarea
              readOnly
              value={thinking}
              className="w-full p-3 rounded-lg border bg-muted/30 font-mono text-sm h-96 resize-y overflow-auto"
            />
          </div>
        )}

        {/* Main Output */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {outputLabel}
          </label>
          <textarea
            readOnly
            value={output}
            placeholder={placeholder}
            className="w-full p-3 rounded-lg border bg-card font-mono text-sm h-96 resize-y overflow-auto"
          />
        </div>
      </div>
    );
  }
);

TaskOutputDisplay.displayName = 'TaskOutputDisplay';
