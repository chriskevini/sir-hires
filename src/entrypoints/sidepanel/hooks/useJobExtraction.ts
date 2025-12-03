import { useState, useEffect, useCallback, useRef } from 'react';
import { browser } from 'wxt/browser';
import {
  llmSettingsStorage,
  extractionTriggerStorage,
  type LLMSettings,
} from '../../../utils/storage';
import { DEFAULT_TASK_SETTINGS } from '../../../utils/llm-utils';
import type { Job } from '../../job-details/hooks';
import { normalizeUrl, generateJobId } from '../../../utils/shared-utils';
import { LLMClient } from '../../../utils/llm-client';
import { runTask, startKeepalive } from '../../../utils/llm-task-runner';
import { jobExtraction } from '../../../tasks';

/**
 * Ephemeral extraction state (not persisted to storage)
 * Used to display live extraction progress in the UI
 */
export interface ExtractingJob {
  id: string;
  url: string;
  source: string;
  chunks: string[];
  isExtracting: boolean;
}

export interface JobStorage {
  getAllJobs: () => Promise<Job[]>;
  saveAllJobs: (jobs: Job[]) => Promise<void>;
  initializeAllChecklists: () => Job['checklist'];
}

/**
 * Custom hook for job extraction functionality
 * Uses runTask() to run LLM extraction directly in the component
 */
export function useJobExtraction(
  storage: JobStorage,
  loadJobInFocus: () => Promise<void>,
  currentJob: Job | null
) {
  // Use ref to access latest currentJob without adding to dependencies
  const currentJobRef = useRef<Job | null>(currentJob);

  // Keep ref updated with latest currentJob value
  useEffect(() => {
    currentJobRef.current = currentJob;
  }, [currentJob]);

  const [extracting, setExtracting] = useState(false);
  const [extractingJob, setExtractingJob] = useState<ExtractingJob | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // AbortController for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modal state for duplicate job handling
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingExtraction, setPendingExtraction] = useState<{
    jobId: string;
    url: string;
    source: string;
    rawText: string;
    llmSettings: LLMSettings;
    isRefresh: boolean;
  } | null>(null);

  /**
   * Run the extraction task using runTask()
   */
  const runExtractionTask = useCallback(
    async (params: {
      jobId: string;
      url: string;
      source: string;
      rawText: string;
      llmSettings: LLMSettings;
      isRefresh: boolean;
    }) => {
      const { jobId, url, source, rawText, llmSettings, isRefresh } = params;

      console.info('[useJobExtraction] Starting extraction task for:', jobId);

      // Create ephemeral extraction state
      setExtractingJob({
        id: jobId,
        url,
        source,
        chunks: [],
        isExtracting: true,
      });

      // Create abort controller for this extraction
      abortControllerRef.current = new AbortController();

      // Start keepalive to prevent service worker termination
      const stopKeepalive = startKeepalive();

      try {
        // Initialize LLM client
        const llmClient = new LLMClient({
          endpoint: llmSettings.endpoint,
          modelsEndpoint: llmSettings.modelsEndpoint,
        });

        // Get task-specific settings
        const extractionMaxTokens =
          llmSettings.tasks?.extraction?.maxTokens ||
          DEFAULT_TASK_SETTINGS.extraction.maxTokens;
        const extractionTemperature =
          llmSettings.tasks?.extraction?.temperature ??
          DEFAULT_TASK_SETTINGS.extraction.temperature;

        // Run extraction task
        const result = await runTask({
          config: jobExtraction,
          context: { rawText },
          llmClient,
          model: llmSettings.model || '',
          maxTokens: extractionMaxTokens,
          temperature: extractionTemperature,
          noThink: !llmSettings.thinkHarder,
          signal: abortControllerRef.current.signal,
          onChunk: (delta) => {
            // Append chunk to ephemeral state
            setExtractingJob((prev) => {
              if (!prev || prev.id !== jobId) {
                return prev;
              }
              return {
                ...prev,
                chunks: [...prev.chunks, delta],
              };
            });
          },
        });

        // Check if cancelled
        if (result.cancelled) {
          console.info(
            '[useJobExtraction] Extraction cancelled for job:',
            jobId
          );
          setExtractingJob(null);
          setExtracting(false);
          return;
        }

        // Handle completion
        console.info('[useJobExtraction] Extraction complete for job:', jobId);

        if (isRefresh) {
          // REFRESH MODE: Surgical update - only update content field
          console.info(
            '[useJobExtraction] Refresh mode - performing surgical update'
          );

          const currentJobs = await storage.getAllJobs();
          const existingIndex = currentJobs.findIndex((j) => j.id === jobId);

          if (existingIndex >= 0) {
            // Preserve all existing fields, only update content + timestamp
            currentJobs[existingIndex] = {
              ...currentJobs[existingIndex],
              content: result.content,
              updatedAt: new Date().toISOString(),
            };
            await storage.saveAllJobs(currentJobs);

            console.info(
              '[useJobExtraction] Surgical update complete - preserved checklist/documents/status'
            );
          } else {
            console.error(
              '[useJobExtraction] Refresh mode: Job not found in storage:',
              jobId
            );
            setError('Failed to refresh job - job not found');
          }
        } else {
          // NEW JOB MODE: Create new job with full initialization
          console.info(
            '[useJobExtraction] New job mode - creating full job object'
          );

          const now = new Date().toISOString();
          const newJob: Job = {
            id: jobId,
            url,
            applicationStatus: 'Researching',
            content: result.content,
            checklist: storage.initializeAllChecklists(),
            documents: undefined,
            createdAt: now,
            updatedAt: now,
          };

          // Get current jobs and add the new one
          const currentJobs = await storage.getAllJobs();
          const updatedJobs = [...currentJobs, newJob];
          await storage.saveAllJobs(updatedJobs);

          console.info('[useJobExtraction] Saved completed job to storage');

          // Set jobInFocus via background (Rule 3: Cross-component state)
          await browser.runtime.sendMessage({
            action: 'setJobInFocus',
            jobId,
          });
          console.info(
            '[useJobExtraction] Set jobInFocus after extraction:',
            jobId
          );
        }

        // Clear ephemeral state
        setExtractingJob(null);
        setExtracting(false);
        setPendingExtraction(null);

        // Reload to display the completed/updated job
        await loadJobInFocus();
      } catch (err) {
        console.error('[useJobExtraction] Extraction failed:', err);
        setExtractingJob(null);
        setExtracting(false);
        setError(
          `Extraction failed: ${(err as Error).message}. Make sure LM Studio is running and configured correctly.`
        );
      } finally {
        stopKeepalive();
        abortControllerRef.current = null;
      }
    },
    [storage, loadJobInFocus]
  );

  /**
   * Handle extract job button click
   */
  const handleExtractJob = useCallback(async () => {
    console.info(
      '[useJobExtraction] ===== BUTTON CLICKED - handleExtractJob called ====='
    );
    setExtracting(true);
    setError(null);

    try {
      // Load LLM settings
      const llmSettings: LLMSettings =
        (await llmSettingsStorage.getValue()) || {
          endpoint: 'http://localhost:1234/v1/chat/completions',
          modelsEndpoint: 'http://localhost:1234/v1/models',
          model: '',
          tasks: {
            synthesis: DEFAULT_TASK_SETTINGS.synthesis,
            extraction: DEFAULT_TASK_SETTINGS.extraction,
          },
        };

      if (!llmSettings.endpoint || llmSettings.endpoint.trim() === '') {
        setError(
          '⚠️ LLM endpoint not configured. Please configure settings in the popup first.'
        );
        setExtracting(false);
        return;
      }

      // Get current active tab
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab || !tab.id) {
        setError('No active tab found');
        setExtracting(false);
        return;
      }

      if (
        tab.url?.startsWith('chrome://') ||
        tab.url?.startsWith('chrome-extension://')
      ) {
        setError(
          'Cannot extract data from Chrome internal pages. Please navigate to a job posting.'
        );
        setExtracting(false);
        return;
      }

      console.info('[useJobExtraction] Starting extraction for tab:', tab.url);

      // Get page content from content script
      const response = await browser.tabs
        .sendMessage(tab.id, {
          action: 'getPageContent',
        })
        .catch(async (err) => {
          console.warn(
            '[useJobExtraction] Content script not responding, injecting:',
            err
          );
          // Inject content script if not loaded
          await browser.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ['content-scripts/content.js'],
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
          return browser.tabs.sendMessage(tab.id!, {
            action: 'getPageContent',
          });
        });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to get page content');
      }

      const { url, source, rawText } = response;

      // Duplicate detection: Check if current job has same URL
      const latestCurrentJob = currentJobRef.current;

      console.info('[useJobExtraction] DEBUG - response:', {
        url,
        source,
        rawTextLength: rawText?.length,
      });
      console.info(
        '[useJobExtraction] DEBUG - latestCurrentJob:',
        latestCurrentJob
      );

      if (url && latestCurrentJob) {
        const newUrlNormalized = normalizeUrl(url);
        const currentUrlNormalized = normalizeUrl(latestCurrentJob.url);

        console.info(
          '[useJobExtraction] DEBUG - newUrlNormalized:',
          newUrlNormalized
        );
        console.info(
          '[useJobExtraction] DEBUG - currentUrlNormalized:',
          currentUrlNormalized
        );

        if (newUrlNormalized === currentUrlNormalized) {
          // Same URL as current job - show modal for user choice
          console.info(
            '[useJobExtraction] Duplicate detected - same URL as current job'
          );

          // Store pending extraction data for modal handlers
          const pendingData = {
            jobId: latestCurrentJob.id,
            url,
            source: source || 'Unknown',
            rawText: rawText || '',
            llmSettings,
            isRefresh: false,
          };

          setPendingExtraction(pendingData);
          setShowDuplicateModal(true);
          setExtracting(false);
          return;
        }
      }

      // Different URL or no current job - create new job
      const jobId = generateJobId();
      console.info('[useJobExtraction] Creating new job extraction:', jobId);

      // Run extraction directly
      await runExtractionTask({
        jobId,
        url,
        source: source || 'Unknown',
        rawText: rawText || '',
        llmSettings,
        isRefresh: false,
      });
    } catch (err) {
      console.error('[useJobExtraction] Error extracting job data:', err);
      setError(
        'Error: ' +
          (err as Error).message +
          '. Make sure LM Studio is running and configured correctly.'
      );
      setExtracting(false);
    }
  }, [runExtractionTask]);

  /**
   * Handle "Refresh Job Data" choice from modal
   * Updates only the content field, preserving checklist/documents/status
   */
  const handleRefreshJob = useCallback(async () => {
    if (!pendingExtraction) return;

    console.info('[useJobExtraction] User chose: Refresh Job Data');
    setShowDuplicateModal(false);
    setExtracting(true);

    // Run extraction with refresh flag
    await runExtractionTask({
      ...pendingExtraction,
      isRefresh: true,
    });
  }, [pendingExtraction, runExtractionTask]);

  /**
   * Handle "Extract as New Job" choice from modal
   * Creates a new job with a new ID
   */
  const handleExtractNew = useCallback(async () => {
    if (!pendingExtraction) return;

    console.info('[useJobExtraction] User chose: Extract as New Job');
    setShowDuplicateModal(false);
    setExtracting(true);

    // Generate new job ID and run extraction
    const newJobId = generateJobId();
    await runExtractionTask({
      ...pendingExtraction,
      jobId: newJobId,
      isRefresh: false,
    });

    setPendingExtraction(null);
  }, [pendingExtraction, runExtractionTask]);

  /**
   * Handle "Cancel" choice from modal
   */
  const handleCancelDuplicate = useCallback(() => {
    console.info('[useJobExtraction] User chose: Cancel');
    setShowDuplicateModal(false);
    setPendingExtraction(null);
    setExtracting(false);
  }, []);

  /**
   * Cancel ongoing extraction
   */
  const cancelExtraction = useCallback(() => {
    if (abortControllerRef.current) {
      console.info('[useJobExtraction] Cancelling extraction');
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Watch for extraction trigger from context menu (via storage)
   * This is triggered when user clicks "Extract Job from This Page" in context menu
   */
  useEffect(() => {
    console.info('[useJobExtraction] Setting up extraction trigger watcher...');

    // Check for existing trigger on mount (in case it was set before sidepanel opened)
    extractionTriggerStorage.getValue().then((currentValue) => {
      console.info('[useJobExtraction] Initial trigger check:', currentValue);
      if (currentValue) {
        console.info(
          '[useJobExtraction] Found existing trigger on mount, starting extraction'
        );
        // Trigger extraction
        handleExtractJob();
        // Clear the trigger
        extractionTriggerStorage.setValue(null);
      }
    });

    // Watch for new triggers
    const unwatch = extractionTriggerStorage.watch(
      (newValue: number | null, oldValue: number | null) => {
        console.info(
          '[useJobExtraction] Extraction trigger storage change detected!'
        );
        console.info('[useJobExtraction] Old value:', oldValue);
        console.info('[useJobExtraction] New value:', newValue);

        // Only trigger if value changed (new timestamp set)
        if (newValue && newValue !== oldValue) {
          console.info(
            '[useJobExtraction] Valid extraction trigger received from context menu'
          );
          console.info(
            '[useJobExtraction] Timestamp:',
            new Date(newValue).toISOString()
          );

          // Clear the trigger to prevent duplicate executions
          extractionTriggerStorage.setValue(null);

          // Trigger extraction
          console.info(
            '[useJobExtraction] Starting extraction from context menu trigger...'
          );
          handleExtractJob();
        }
      }
    );

    console.info('[useJobExtraction] Extraction trigger watcher registered');

    return () => {
      console.info('[useJobExtraction] Cleaning up extraction trigger watcher');
      unwatch();
    };
  }, [handleExtractJob]);

  return {
    extracting,
    extractingJob,
    error,
    handleExtractJob,
    cancelExtraction,
    showDuplicateModal,
    pendingExtraction,
    handleRefreshJob,
    handleExtractNew,
    handleCancelDuplicate,
  };
}
