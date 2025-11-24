import { useCallback } from 'react';
import { browser } from 'wxt/browser';
import type { useJobState } from './useJobState';
import type { useJobStorage } from './useJobStorage';

/**
 * Hook providing common job event handlers
 * Eliminates duplication between job-details and sidepanel App files
 *
 * @param jobState - Job state manager (return value of useJobState)
 * @param storage - Storage service (return value of useJobStorage)
 * @param loadJobs - Function to reload jobs from storage
 * @param suppressReloadUntil - Timestamp to suppress reload events
 * @param setSuppressReloadUntil - Setter for suppressReloadUntil
 * @returns Object containing all event handlers
 */
export function useJobHandlers(
  jobState: ReturnType<typeof useJobState>,
  storage: ReturnType<typeof useJobStorage>,
  loadJobs: () => Promise<void>,
  suppressReloadUntil: number | null,
  setSuppressReloadUntil: (value: number | null) => void
) {
  /**
   * Handle storage change events
   */
  const handleStorageChange = useCallback(
    (changes: Record<string, unknown>) => {
      console.info('[useJobHandlers] Storage changed:', Object.keys(changes));

      // Check if reload is suppressed (during document auto-save)
      if (suppressReloadUntil && Date.now() < suppressReloadUntil) {
        console.info('[useJobHandlers] Reload suppressed during document save');
        return;
      }

      // Check if animation is active
      if (jobState.isAnimating) {
        console.info(
          '[useJobHandlers] Animation in progress, setting pending reload flag'
        );
        jobState.setPendingReload(true);
        return;
      }

      // Reload jobs if they changed
      if (changes.jobs || changes.jobInFocus) {
        console.info('[useJobHandlers] Jobs changed, reloading...');
        loadJobs();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [suppressReloadUntil] // Only watch suppressReloadUntil - uses latest jobState/loadJobs via closure
  );

  /**
   * Handle save field event (generic field updates)
   */
  const handleSaveField = useCallback(
    async (index: number, fieldName: string, value: string) => {
      const job = jobState.allJobs[index];
      if (!job) {
        console.error('[useJobHandlers] Job not found at index:', index);
        return;
      }

      const updatedJob = {
        ...job,
        [fieldName]: value,
        updatedAt: new Date().toISOString(),
      };

      await storage.updateJob(job.id, updatedJob);
      console.info(
        `[useJobHandlers] Updated ${fieldName} for job at index ${index}`
      );
    },
    [jobState.allJobs, storage]
  );

  /**
   * Handle delete job event
   */
  const handleDeleteJob = useCallback(
    async (index: number) => {
      // eslint-disable-next-line no-undef
      if (!confirm('Are you sure you want to delete this job?')) {
        return;
      }

      const job = jobState.allJobs[index];
      if (!job) {
        console.error('[useJobHandlers] Job not found at index:', index);
        return;
      }

      // Use background message for cross-tab consistency (Rule 3: Cross-component state)
      try {
        const response = await browser.runtime.sendMessage({
          action: 'deleteJob',
          jobId: job.id,
        });

        if (response && response.success) {
          console.info(`[useJobHandlers] Deleted job at index ${index}`);
          await loadJobs();
        } else {
          console.error('[useJobHandlers] Failed to delete job:', response);
        }
      } catch (error) {
        console.error('[useJobHandlers] Error deleting job:', error);
      }
    },
    [jobState.allJobs, loadJobs]
  );

  /**
   * Handle checklist toggle expand
   */
  const handleChecklistToggleExpand = useCallback(
    async (_index: number, isExpanded: boolean) => {
      jobState.setChecklistExpanded(isExpanded);
      await storage.setChecklistExpanded(isExpanded);
      console.info(
        `[useJobHandlers] Toggled checklist expand globally to ${isExpanded}`
      );
    },
    [jobState, storage]
  );

  /**
   * Handle checklist toggle item
   */
  const handleChecklistToggleItem = useCallback(
    async (index: number, itemId: string) => {
      const job = jobState.allJobs[index];
      if (!job || !job.checklist) {
        console.error(
          '[useJobHandlers] Job or checklist not found at index:',
          index
        );
        return;
      }

      // Find and toggle the item in the current status's checklist
      const currentStatusItems = job.checklist[job.applicationStatus || ''];
      if (!currentStatusItems) {
        console.error(
          '[useJobHandlers] Checklist not found for status:',
          job.applicationStatus
        );
        return;
      }

      const item = currentStatusItems.find(
        (i: { id: string; checked: boolean }) => i.id === itemId
      );
      if (item) {
        item.checked = !item.checked;

        const updatedJob = {
          ...job,
          updatedAt: new Date().toISOString(),
        };

        await storage.updateJob(job.id, updatedJob);
        console.info(`[useJobHandlers] Toggled checklist item ${itemId}`);
      }
    },
    [jobState.allJobs, storage]
  );

  /**
   * Handle initialize documents (Drafting view)
   */
  const handleInitializeDocuments = useCallback(
    async (index: number) => {
      const job = jobState.allJobs[index];
      if (!job) {
        console.error('[useJobHandlers] Job not found at index:', index);
        return;
      }

      // Initialize documents if not already present
      if (!job.documents) {
        const initializedDocs = storage.initializeDocuments(job);
        const updatedJob = {
          ...job,
          documents: initializedDocs,
          updatedAt: new Date().toISOString(),
        };

        await storage.updateJob(job.id, updatedJob);
        console.info(
          `[useJobHandlers] Initialized documents for job at index ${index}`
        );
      }
    },
    [jobState.allJobs, storage]
  );

  /**
   * Handle save document (auto-save or manual save)
   */
  const handleSaveDocument = useCallback(
    async (
      index: number,
      documentKey: string,
      documentData: { title: string; text: string }
    ) => {
      const job = jobState.allJobs[index];
      if (!job) {
        console.error('[useJobHandlers] Job not found at index:', index);
        return;
      }

      // Suppress reloads for 500ms to prevent auto-save from triggering view reload
      setSuppressReloadUntil(Date.now() + 500);

      // Save document to storage
      await storage.saveDocument(job.id, documentKey, documentData);
      console.info(
        `[useJobHandlers] Saved document ${documentKey} for job at index ${index}`
      );
    },
    [jobState.allJobs, storage, setSuppressReloadUntil]
  );

  return {
    handleStorageChange,
    handleSaveField,
    handleDeleteJob,
    handleChecklistToggleExpand,
    handleChecklistToggleItem,
    handleInitializeDocuments,
    handleSaveDocument,
  };
}

/**
 * Type definition for job handlers return value
 */
export type JobHandlers = ReturnType<typeof useJobHandlers>;
