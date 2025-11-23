import { useState, useEffect, useCallback } from 'react';
import { browser } from 'wxt/browser';
import {
  llmSettingsStorage,
  jobsStorage,
  extractionTriggerStorage,
  type LLMSettings,
} from '../../../utils/storage';
import { useExtractionEvents } from '../../job-details/hooks';
import type { Job } from '../../job-details/hooks';
import type {
  ExtractionEvent,
  ExtractionStartedMessage,
  ExtractionChunkMessage,
  ExtractionCompleteMessage,
} from '../../job-details/hooks';

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
 * Handles extraction logic, event handling, and trigger watching
 */
export function useJobExtraction(
  storage: JobStorage,
  loadJobInFocus: () => Promise<void>
) {
  const extractionEvents = useExtractionEvents();

  const [extracting, setExtracting] = useState(false);
  const [extractingJob, setExtractingJob] = useState<ExtractingJob | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle extract job button click
   */
  const handleExtractJob = useCallback(async () => {
    setExtracting(true);
    setError(null);

    try {
      // Load LLM settings
      const llmSettings: LLMSettings =
        (await llmSettingsStorage.getValue()) || {
          endpoint: 'http://localhost:1234/v1/chat/completions',
          modelsEndpoint: 'http://localhost:1234/v1/models',
          model: '',
          maxTokens: 2000,
          temperature: 0.3,
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

      // Get job URL from content script
      const preCheckResponse = await browser.tabs
        .sendMessage(tab.id, {
          action: 'getJobUrl',
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
          return browser.tabs.sendMessage(tab.id!, { action: 'getJobUrl' });
        });

      // Determine job ID (check if job already exists)
      let jobId: string;
      if (preCheckResponse && preCheckResponse.url) {
        const jobs = (await jobsStorage.getValue()) || {};
        const normalizeUrl = (url: string) => {
          try {
            const urlObj = new URL(url);
            return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
          } catch {
            return url;
          }
        };

        const existingJobId = Object.keys(jobs).find((id) => {
          const job = jobs[id];
          return (
            job.url &&
            normalizeUrl(job.url) === normalizeUrl(preCheckResponse.url)
          );
        });

        if (existingJobId) {
          console.info(
            '[useJobExtraction] Re-extracting existing job:',
            existingJobId
          );
          jobId = existingJobId;
        } else {
          jobId =
            'job_' +
            Date.now() +
            '_' +
            Math.random().toString(36).substring(2, 9);
          console.info(
            '[useJobExtraction] Creating new job extraction:',
            jobId
          );
        }
      } else {
        jobId =
          'job_' +
          Date.now() +
          '_' +
          Math.random().toString(36).substring(2, 9);
        console.info('[useJobExtraction] Creating new job extraction:', jobId);
      }

      // Note: We DON'T set jobInFocus here because the job doesn't exist yet
      // It will be set after extraction completes and the job is saved
      // This prevents race conditions where loadJobInFocus() clears a non-existent job

      // Request extraction from content script
      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'streamExtractJobData',
        llmSettings: llmSettings,
        jobId: jobId,
      });

      if (response && response.success) {
        console.info('[useJobExtraction] Extraction started successfully');

        // Send message to background to start streaming
        await browser.runtime.sendMessage({
          action: 'streamExtractJob',
          jobId: response.jobId,
          url: response.url,
          source: response.source,
          rawText: response.rawText,
          llmSettings: llmSettings,
        });
      } else {
        throw new Error('Failed to start streaming extraction');
      }
    } catch (error) {
      console.error('[useJobExtraction] Error extracting job data:', error);
      setError(
        'Error: ' +
          (error as Error).message +
          '. Make sure LM Studio is running and configured correctly.'
      );
      setExtracting(false);
    }
    // Note: Don't reset extracting here - let extraction events handle it
  }, []);

  /**
   * Register extraction event listener
   */
  useEffect(() => {
    const handleExtraction = (event: ExtractionEvent) => {
      console.info(
        '[useJobExtraction] Received extraction event:',
        event.action
      );

      switch (event.action) {
        case 'extractionStarted': {
          const startEvent = event as ExtractionStartedMessage;
          console.info(
            '[useJobExtraction] Extraction started for job:',
            startEvent.jobId
          );

          // Create ephemeral extraction state (React state only)
          setExtractingJob({
            id: startEvent.jobId,
            url: startEvent.url,
            source: startEvent.source,
            chunks: [],
            isExtracting: true,
          });

          // Clear any previous errors
          setError(null);
          break;
        }

        case 'extractionChunk': {
          const chunkEvent = event as ExtractionChunkMessage;
          console.info(
            '[useJobExtraction] Received extraction chunk for job:',
            chunkEvent.jobId
          );

          // Append chunk to ephemeral state
          setExtractingJob((prev) => {
            if (!prev || prev.id !== chunkEvent.jobId) {
              console.warn(
                '[useJobExtraction] Received chunk for unexpected job:',
                chunkEvent.jobId
              );
              return prev;
            }

            return {
              ...prev,
              chunks: [...prev.chunks, chunkEvent.chunk],
            };
          });
          break;
        }

        case 'extractionComplete': {
          const completeEvent = event as ExtractionCompleteMessage;
          console.info(
            '[useJobExtraction] Extraction complete for job:',
            completeEvent.jobId
          );

          // Save to storage now that extraction is complete
          (async () => {
            try {
              // Access extractingJob from current state via updater function
              setExtractingJob((currentExtractingJob) => {
                if (
                  !currentExtractingJob ||
                  currentExtractingJob.id !== completeEvent.jobId
                ) {
                  console.error(
                    '[useJobExtraction] No extracting job found for completion:',
                    completeEvent.jobId
                  );
                  return currentExtractingJob;
                }

                // Perform async operations outside of setState
                (async () => {
                  try {
                    // Create a complete job object
                    const now = new Date().toISOString();
                    const newJob: Job = {
                      id: completeEvent.jobId,
                      url: currentExtractingJob.url,
                      applicationStatus: 'Researching',
                      content: completeEvent.fullContent,
                      checklist: storage.initializeAllChecklists(),
                      documents: undefined, // Will be initialized when switching to Drafting
                      createdAt: now,
                      updatedAt: now,
                    };

                    // Get current jobs and add the new one
                    const currentJobs = await storage.getAllJobs();
                    const updatedJobs = [...currentJobs, newJob];
                    await storage.saveAllJobs(updatedJobs);

                    console.info(
                      '[useJobExtraction] Saved completed job to storage'
                    );

                    // NOW set jobInFocus via background (Rule 3: Cross-component state)
                    // Use message instead of direct storage for cross-tab consistency
                    await browser.runtime.sendMessage({
                      action: 'setJobInFocus',
                      jobId: completeEvent.jobId,
                    });
                    console.info(
                      '[useJobExtraction] Set jobInFocus after extraction:',
                      completeEvent.jobId
                    );

                    // Clear ephemeral extraction state
                    setExtractingJob(null);
                    setExtracting(false);

                    // Reload to display the completed job
                    await loadJobInFocus();
                  } catch (err) {
                    console.error(
                      '[useJobExtraction] Error saving completed job:',
                      err
                    );
                    setError('Failed to save extracted job');
                    setExtractingJob(null);
                  }
                })();

                return currentExtractingJob;
              });
            } catch (err) {
              console.error(
                '[useJobExtraction] Error in completion handler:',
                err
              );
            }
          })();
          break;
        }

        case 'extractionError':
          console.error(
            '[useJobExtraction] Extraction error for job:',
            event.jobId,
            event.error
          );

          // Clear ephemeral state and show error
          setExtractingJob(null);
          setExtracting(false);
          setError(`Extraction failed: ${event.error}`);
          break;

        case 'extractionCancelled':
          console.info(
            '[useJobExtraction] Extraction cancelled for job:',
            event.jobId
          );

          // Clear ephemeral state
          setExtractingJob(null);
          setExtracting(false);
          break;

        default:
          break;
      }
    };

    extractionEvents.onExtractionEvent(handleExtraction);

    return () => {
      extractionEvents.offExtractionEvent(handleExtraction);
    };
  }, [extractionEvents, loadJobInFocus, storage]);

  /**
   * Watch for extraction trigger from context menu (via storage)
   * This is triggered when user clicks "Extract Job from This Page" in context menu
   */
  useEffect(() => {
    console.info(
      '[useJobExtraction] 🔍 Setting up extraction trigger watcher...'
    );

    // Check for existing trigger on mount (in case it was set before sidepanel opened)
    extractionTriggerStorage.getValue().then((currentValue) => {
      console.info('[useJobExtraction] Initial trigger check:', currentValue);
      if (currentValue) {
        console.info(
          '[useJobExtraction] ✅ Found existing trigger on mount, starting extraction'
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
          '[useJobExtraction] 📡 Extraction trigger storage change detected!'
        );
        console.info('[useJobExtraction] Old value:', oldValue);
        console.info('[useJobExtraction] New value:', newValue);

        // Only trigger if value changed (new timestamp set)
        if (newValue && newValue !== oldValue) {
          console.info(
            '[useJobExtraction] ✅ Valid extraction trigger received from context menu'
          );
          console.info(
            '[useJobExtraction] Timestamp:',
            new Date(newValue).toISOString()
          );

          // Clear the trigger to prevent duplicate executions
          extractionTriggerStorage.setValue(null);

          // Trigger extraction
          console.info(
            '[useJobExtraction] 🚀 Starting extraction from context menu trigger...'
          );
          handleExtractJob();
        }
      }
    );

    console.info('[useJobExtraction] ✅ Extraction trigger watcher registered');

    return () => {
      console.info(
        '[useJobExtraction] 🧹 Cleaning up extraction trigger watcher'
      );
      unwatch();
    };
  }, [handleExtractJob]);

  return {
    extracting,
    extractingJob,
    error,
    handleExtractJob,
  };
}
