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
          callbacks.onExtractionStarted();
          break;

        case 'profileExtractionChunk':
          if (message.chunk) {
            callbacks.onChunkReceived(message.chunk);
          }
          break;

        case 'profileExtractionComplete':
          if (message.fullContent !== undefined) {
            callbacks.onExtractionComplete(message.fullContent);
          }
          break;

        case 'profileExtractionError':
          if (message.error) {
            callbacks.onExtractionError(message.error);
          }
          break;

        case 'profileExtractionCancelled':
          callbacks.onExtractionCancelled();
          break;
      }
    };

    browser.runtime.onMessage.addListener(messageListener);

    return () => {
      browser.runtime.onMessage.removeListener(messageListener);
    };
  }, [callbacks]);
}
