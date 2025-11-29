import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_INTERVAL_MS = 1000;

export interface UseProgressMessagesOptions {
  /** Array of messages to cycle through */
  messages: string[];
  /** Whether the progress is currently active */
  isActive: boolean;
  /** Callback when message changes */
  onMessageChange: (message: string) => void;
  /** Interval between message changes in ms (default: 1000) */
  intervalMs?: number;
}

export interface UseProgressMessagesReturn {
  /** Call this when real content starts streaming to stop progress messages */
  markContentReceived: () => void;
  /** Check if real content has been received */
  hasReceivedContent: boolean;
  /** Reset the progress state (call before starting a new operation) */
  reset: () => void;
}

/**
 * Hook for cycling through progress messages during LLM operations.
 *
 * Usage:
 * ```tsx
 * const { markContentReceived, reset } = useProgressMessages({
 *   messages: EXTRACTION_PROGRESS_MESSAGES,
 *   isActive: isExtracting,
 *   onMessageChange: (msg) => setContent(msg + '\n\n'),
 * });
 *
 * // In your onChunk callback:
 * onChunk: (delta) => {
 *   markContentReceived(); // Stops progress messages
 *   // ... handle delta
 * }
 *
 * // Before starting a new operation:
 * reset();
 * setIsExtracting(true);
 * ```
 */
export function useProgressMessages({
  messages,
  isActive,
  onMessageChange,
  intervalMs = DEFAULT_INTERVAL_MS,
}: UseProgressMessagesOptions): UseProgressMessagesReturn {
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIndexRef = useRef<number>(0);
  const hasReceivedContentRef = useRef<boolean>(false);

  // Mark that real content has been received (stops progress messages)
  const markContentReceived = useCallback(() => {
    hasReceivedContentRef.current = true;
    // Clear interval immediately when real content arrives
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Reset state for a new operation
  const reset = useCallback(() => {
    progressIndexRef.current = 0;
    hasReceivedContentRef.current = false;
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Progress message cycling effect
  useEffect(() => {
    if (isActive && !hasReceivedContentRef.current) {
      // Show initial message
      if (messages.length > 0) {
        onMessageChange(messages[0]);
      }

      progressIntervalRef.current = setInterval(() => {
        // Only update if we haven't started receiving real content
        if (!hasReceivedContentRef.current) {
          const lastIndex = messages.length - 1;
          // Stop cycling at the last message
          if (progressIndexRef.current < lastIndex) {
            progressIndexRef.current += 1;
            onMessageChange(messages[progressIndexRef.current]);
          } else {
            // At last message - clear interval to stop cycling
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
          }
        }
      }, intervalMs);
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [isActive, messages, onMessageChange, intervalMs]);

  return {
    markContentReceived,
    hasReceivedContent: hasReceivedContentRef.current,
    reset,
  };
}

/**
 * Helper to check if text is a progress message from a given array
 */
export function isProgressMessage(text: string, messages: string[]): boolean {
  return messages.some((msg) => text.startsWith(msg));
}
