import { useEffect, useCallback, useRef, useMemo } from 'react';
import { browser } from 'wxt/browser';

/**
 * Extraction event types
 */
export type ExtractionEventType =
  | 'extractionStarted'
  | 'extractionChunk'
  | 'extractionComplete'
  | 'extractionError'
  | 'extractionCancelled';

/**
 * Base extraction message structure
 */
export interface ExtractionMessage {
  action: ExtractionEventType;
  jobId: string;
}

/**
 * Extraction started message
 */
export interface ExtractionStartedMessage extends ExtractionMessage {
  action: 'extractionStarted';
  url: string;
  source: string;
  rawText: string;
}

/**
 * Extraction chunk message (streaming data)
 */
export interface ExtractionChunkMessage extends ExtractionMessage {
  action: 'extractionChunk';
  chunk: string;
}

/**
 * Extraction complete message
 */
export interface ExtractionCompleteMessage extends ExtractionMessage {
  action: 'extractionComplete';
  fullContent: string;
}

/**
 * Extraction error message
 */
export interface ExtractionErrorMessage extends ExtractionMessage {
  action: 'extractionError';
  error: string;
}

/**
 * Extraction cancelled message
 */
export interface ExtractionCancelledMessage extends ExtractionMessage {
  action: 'extractionCancelled';
}

/**
 * Union type for all extraction messages
 */
export type ExtractionEvent =
  | ExtractionStartedMessage
  | ExtractionChunkMessage
  | ExtractionCompleteMessage
  | ExtractionErrorMessage
  | ExtractionCancelledMessage;

/**
 * Callback function for extraction events
 */
export type ExtractionEventCallback = (event: ExtractionEvent) => void;

/**
 * React hook for handling extraction-related runtime messages
 *
 * This hook provides a clean, declarative API for listening to extraction events
 * from the background script. It follows the same pattern as useJobStorage for
 * consistency.
 *
 * @example
 * ```tsx
 * const extractionEvents = useExtractionEvents();
 *
 * useEffect(() => {
 *   const handleExtraction = (event: ExtractionEvent) => {
 *     switch (event.action) {
 *       case 'extractionComplete':
 *         loadJobInFocus();
 *         break;
 *       case 'extractionError':
 *         setError(event.error);
 *         break;
 *     }
 *   };
 *
 *   extractionEvents.onExtractionEvent(handleExtraction);
 *   return () => extractionEvents.offExtractionEvent(handleExtraction);
 * }, []);
 * ```
 */
export function useExtractionEvents() {
  const listenersRef = useRef<ExtractionEventCallback[]>([]);

  /**
   * Register a callback for extraction events
   */
  const onExtractionEvent = useCallback((callback: ExtractionEventCallback) => {
    if (typeof callback === 'function') {
      listenersRef.current.push(callback);
    }
  }, []);

  /**
   * Unregister a callback for extraction events
   */
  const offExtractionEvent = useCallback(
    (callback: ExtractionEventCallback) => {
      listenersRef.current = listenersRef.current.filter(
        (cb) => cb !== callback
      );
    },
    []
  );

  /**
   * Initialize runtime message listener for extraction events
   */
  useEffect(() => {
    const listener = (
      message: any,
      _sender: any,
      _sendResponse: (response?: any) => void
    ) => {
      // Only handle extraction-related messages
      if (
        message.action &&
        typeof message.action === 'string' &&
        message.action.startsWith('extraction')
      ) {
        const extractionEvent = message as ExtractionEvent;

        // Notify all registered listeners
        listenersRef.current.forEach((callback) => {
          try {
            callback(extractionEvent);
          } catch (error) {
            console.error('Error in extraction event listener:', error);
          }
        });
      }
    };

    browser.runtime.onMessage.addListener(listener);

    return () => {
      browser.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return useMemo(
    () => ({
      onExtractionEvent,
      offExtractionEvent,
    }),
    [onExtractionEvent, offExtractionEvent]
  );
}
