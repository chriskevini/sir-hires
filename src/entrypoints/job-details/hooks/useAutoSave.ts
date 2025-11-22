import { useState, useCallback } from 'react';
import { useInterval } from './useInterval';

interface UseAutoSaveOptions {
  /**
   * Auto-save interval in milliseconds
   */
  interval: number;
  /**
   * Callback to save a single document
   */
  onSave: (key: string, content: string) => void;
  /**
   * Function to get the current timestamp for display
   */
  getTimestamp?: () => string;
}

interface UseAutoSaveReturn {
  /**
   * Current content for all documents
   */
  documentContents: Record<string, string>;
  /**
   * Last saved content for comparison
   */
  lastSavedContent: Record<string, string>;
  /**
   * Current save status message
   */
  saveStatus: string;
  /**
   * Update content for a specific document
   */
  updateContent: (key: string, content: string) => void;
  /**
   * Mark content as saved (updates lastSavedContent and status)
   */
  markAsSaved: (key: string, content: string, timestamp?: string) => void;
  /**
   * Initialize all document contents
   */
  initializeContents: (contents: Record<string, string>) => void;
  /**
   * Set save status message
   */
  setSaveStatus: (status: string) => void;
}

/**
 * Hook for managing auto-save functionality for multiple documents.
 * Automatically saves documents at a specified interval if they have unsaved changes.
 */
export const useAutoSave = (
  documentKeys: string[],
  options: UseAutoSaveOptions
): UseAutoSaveReturn => {
  const { interval, onSave, getTimestamp } = options;

  const [documentContents, setDocumentContents] = useState<
    Record<string, string>
  >({});
  const [lastSavedContent, setLastSavedContent] = useState<
    Record<string, string>
  >({});
  const [saveStatus, setSaveStatus] = useState<string>('No changes yet');

  // Auto-save interval
  useInterval(
    () => {
      documentKeys.forEach((key) => {
        const currentText = documentContents[key] || '';
        const lastSaved = lastSavedContent[key] || '';

        if (currentText !== lastSaved) {
          onSave(key, currentText);
        }
      });
    },
    interval,
    [documentContents, lastSavedContent, documentKeys]
  );

  const updateContent = useCallback((key: string, content: string) => {
    setDocumentContents((prev) => ({
      ...prev,
      [key]: content,
    }));
  }, []);

  const markAsSaved = useCallback(
    (key: string, content: string, timestamp?: string) => {
      setLastSavedContent((prev) => ({
        ...prev,
        [key]: content,
      }));

      const statusMessage = timestamp || (getTimestamp && getTimestamp());
      if (statusMessage) {
        setSaveStatus(statusMessage);
      }
    },
    [getTimestamp]
  );

  const initializeContents = useCallback((contents: Record<string, string>) => {
    setDocumentContents(contents);
    setLastSavedContent(contents);
  }, []);

  return {
    documentContents,
    lastSavedContent,
    saveStatus,
    updateContent,
    markAsSaved,
    initializeContents,
    setSaveStatus,
  };
};
