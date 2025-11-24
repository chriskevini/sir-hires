import { useEffect } from 'react';
import { browser } from 'wxt/browser';

/**
 * Profile extraction event types
 * Mirrors job extraction events but for profile extraction
 */
export interface ProfileExtractionStartedEvent {
  action: 'profileExtractionStarted';
}

export interface ProfileExtractionChunkEvent {
  action: 'profileExtractionChunk';
  chunk: string;
}

export interface ProfileExtractionCompleteEvent {
  action: 'profileExtractionComplete';
  fullContent: string;
}

export interface ProfileExtractionErrorEvent {
  action: 'profileExtractionError';
  error: string;
}

export interface ProfileExtractionCancelledEvent {
  action: 'profileExtractionCancelled';
}

export type ProfileExtractionEvent =
  | ProfileExtractionStartedEvent
  | ProfileExtractionChunkEvent
  | ProfileExtractionCompleteEvent
  | ProfileExtractionErrorEvent
  | ProfileExtractionCancelledEvent;

/**
 * Custom hook for profile extraction functionality
 * Listens to extraction events from background script and updates UI state
 */
export function useProfileExtraction(callbacks: {
  onExtractionStarted: () => void;
  onChunkReceived: (chunk: string) => void;
  onExtractionComplete: (fullContent: string) => void;
  onExtractionError: (error: string) => void;
  onExtractionCancelled: () => void;
}) {
  useEffect(() => {
    // Destructure callbacks to avoid stale closures
    const {
      onExtractionStarted,
      onChunkReceived,
      onExtractionComplete,
      onExtractionError,
      onExtractionCancelled,
    } = callbacks;

    const handleMessage = (message: ProfileExtractionEvent) => {
      console.info('[useProfileExtraction] Received message:', message.action);

      switch (message.action) {
        case 'profileExtractionStarted':
          console.info('[useProfileExtraction] Extraction started');
          onExtractionStarted();
          break;

        case 'profileExtractionChunk': {
          const chunkEvent = message as ProfileExtractionChunkEvent;
          console.info(
            '[useProfileExtraction] Received chunk:',
            chunkEvent.chunk.substring(0, 50) + '...'
          );
          onChunkReceived(chunkEvent.chunk);
          break;
        }

        case 'profileExtractionComplete': {
          const completeEvent = message as ProfileExtractionCompleteEvent;
          console.info(
            '[useProfileExtraction] Extraction complete, content length:',
            completeEvent.fullContent.length
          );
          onExtractionComplete(completeEvent.fullContent);
          break;
        }

        case 'profileExtractionError': {
          const errorEvent = message as ProfileExtractionErrorEvent;
          console.error(
            '[useProfileExtraction] Extraction error:',
            errorEvent.error
          );
          onExtractionError(errorEvent.error);
          break;
        }

        case 'profileExtractionCancelled':
          console.info('[useProfileExtraction] Extraction cancelled');
          onExtractionCancelled();
          break;

        default:
          break;
      }
    };

    // Register message listener
    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      // Cleanup listener on unmount
      browser.runtime.onMessage.removeListener(handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - callbacks intentionally omitted to prevent re-registration
}
