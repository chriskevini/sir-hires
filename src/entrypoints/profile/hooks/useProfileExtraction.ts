import { useEffect } from 'react';
import { browser } from 'wxt/browser';

/**
 * Hook to listen for profile extraction events from background script
 */
export function useProfileExtraction(callbacks: {
  onExtractionStarted: () => void;
  onChunkReceived: (chunk: string) => void;
  onExtractionComplete: (fullContent: string) => void;
  onExtractionError: (error: string) => void;
  onExtractionCancelled: () => void;
}): void {
  // Destructure callbacks to use individual dependencies
  const {
    onExtractionStarted,
    onChunkReceived,
    onExtractionComplete,
    onExtractionError,
    onExtractionCancelled,
  } = callbacks;

  useEffect(() => {
    const messageListener = (
      message: {
        action: string;
        chunk?: string;
        fullContent?: string;
        error?: string;
      },
      _sender: unknown
    ) => {
      switch (message.action) {
        case 'profileExtractionStarted':
          onExtractionStarted();
          break;

        case 'profileExtractionChunk':
          if (message.chunk) {
            onChunkReceived(message.chunk);
          }
          break;

        case 'profileExtractionComplete':
          if (message.fullContent !== undefined) {
            onExtractionComplete(message.fullContent);
          }
          break;

        case 'profileExtractionError':
          if (message.error) {
            onExtractionError(message.error);
          }
          break;

        case 'profileExtractionCancelled':
          onExtractionCancelled();
          break;
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [
    onExtractionStarted,
    onChunkReceived,
    onExtractionComplete,
    onExtractionError,
    onExtractionCancelled,
  ]);
}
