/**
 * Background Service Worker
 *
 * Central coordination point for the extension. Handles:
 * - Extension lifecycle (installation, context menus)
 * - Service worker keepalive during LLM extraction (prevents Chrome MV3 termination)
 * - LLM API calls and streaming job extraction
 * - Cross-component state management (jobInFocus, job deletion)
 * - Message routing between content scripts, popup, and sidepanel
 *
 * Architecture:
 * - Uses hybrid event-driven pattern (see AGENTS.md)
 * - Rule 1: Coordinates multi-step async operations (extraction workflow)
 * - Rule 2: Simple mutations handled directly by components
 * - Rule 3: Manages cross-component state (jobInFocus, deletion)
 */

import type { Browser } from 'wxt/browser';
import { LLMClient } from '../utils/llm-client';
import {
  llmConfig,
  LLM_API_TIMEOUT_MS,
  LLM_API_TIMEOUT_SECONDS,
  SERVICE_WORKER_KEEPALIVE_INTERVAL_MS,
  MESSAGE_RETRY_MAX_ATTEMPTS,
  MESSAGE_RETRY_DELAY_MS,
} from '../config';
import {
  jobsStorage,
  keepaliveStorage,
  extractionTriggerStorage,
} from '../utils/storage';

// ===== Message Type Definitions =====
// These types define the contract between components and the background script
interface BaseMessage {
  action: string;
}

interface GetJobsMessage extends BaseMessage {
  action: 'getJobs';
}

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

interface JobDocument {
  title: string;
  text: string;
  lastEdited: string | null;
  order: number;
}

interface SaveJobMessage extends BaseMessage {
  action: 'saveJob';
  job: {
    id: string;
    content?: string;
    url: string;
    applicationStatus: string;
    checklist?: Record<string, ChecklistItem[]>;
    documents?: Record<string, JobDocument>;
    updatedAt: string;
    createdAt: string;
  };
}

interface CallLLMMessage extends BaseMessage {
  action: 'callLLM';
  endpoint: string;
  requestBody: unknown;
}

interface LLMSettings {
  provider: string;
  model: string;
  apiEndpoint: string;
  endpoint: string;
  modelsEndpoint?: string;
  maxTokens?: number;
  temperature?: number;
}

interface StreamExtractJobMessage extends BaseMessage {
  action: 'streamExtractJob';
  jobId: string;
  url: string;
  source: string;
  rawText: string;
  llmSettings?: LLMSettings;
}

interface CancelExtractionMessage extends BaseMessage {
  action: 'cancelExtraction';
  jobId: string;
}

interface SetJobInFocusMessage extends BaseMessage {
  action: 'setJobInFocus';
  jobId: string | null;
}

interface DeleteJobMessage extends BaseMessage {
  action: 'deleteJob';
  jobId: string;
}

type RuntimeMessage =
  | GetJobsMessage
  | SaveJobMessage
  | CallLLMMessage
  | StreamExtractJobMessage
  | CancelExtractionMessage
  | SetJobInFocusMessage
  | DeleteJobMessage;

// Internal notification message types (sent from background to components)
interface ExtractionStartedMessage extends BaseMessage {
  action: 'extractionStarted';
  jobId: string;
  url: string;
  source: string;
  rawText: string;
}

interface ExtractionChunkMessage extends BaseMessage {
  action: 'extractionChunk';
  jobId: string;
  chunk: string;
}

interface ExtractionCompleteMessage extends BaseMessage {
  action: 'extractionComplete';
  jobId: string;
  fullContent: string;
}

interface ExtractionCancelledMessage extends BaseMessage {
  action: 'extractionCancelled';
  jobId: string;
}

interface ExtractionErrorMessage extends BaseMessage {
  action: 'extractionError';
  jobId: string;
  error: string;
}

type NotificationMessage =
  | ExtractionStartedMessage
  | ExtractionChunkMessage
  | ExtractionCompleteMessage
  | ExtractionCancelledMessage
  | ExtractionErrorMessage;

interface ActiveExtraction {
  llmClient: LLMClient;
  streamId: string;
}

export default defineBackground(() => {
  // Global keepalive to prevent service worker termination
  // Chrome terminates inactive service workers after ~30 seconds
  // This interval pings storage every 20 seconds to keep it alive
  let globalKeepAliveInterval: NodeJS.Timeout | null = null;

  // Track active extractions for cancellation
  // Map: jobId → { llmClient, streamId }
  const activeExtractions = new Map<string, ActiveExtraction>();

  function startGlobalKeepAlive() {
    if (globalKeepAliveInterval) {
      return; // Already running
    }

    console.info('[Background] Starting global keepalive');

    // Fire immediately first
    keepaliveStorage.getValue().then(() => {
      console.info('[Background] Global keepalive ping (immediate)');
    });

    // Then continue every 20 seconds
    globalKeepAliveInterval = setInterval(() => {
      keepaliveStorage.getValue().then(() => {
        console.info('[Background] Global keepalive ping');
      });
    }, SERVICE_WORKER_KEEPALIVE_INTERVAL_MS);
  }

  function stopGlobalKeepAlive() {
    if (globalKeepAliveInterval) {
      console.info('[Background] Stopping global keepalive');
      clearInterval(globalKeepAliveInterval);
      globalKeepAliveInterval = null;
    }
  }

  // Listen for installation
  browser.runtime.onInstalled.addListener(async () => {
    console.info('Sir Hires extension installed');

    // Initialize storage if needed
    const jobs = await jobsStorage.getValue();
    if (!jobs || Object.keys(jobs).length === 0) {
      await jobsStorage.setValue({});
    }

    // Enable side panel on action click (left-click opens sidepanel)
    try {
      await browser.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      });
    } catch (error) {
      console.error('Error setting side panel behavior:', error);
    }

    // Create context menu items
    try {
      await browser.contextMenus.create({
        id: 'extract-job',
        title: 'Extract Job from This Page',
        contexts: ['page', 'selection'],
      });

      await browser.contextMenus.create({
        id: 'open-settings',
        title: 'Open LLM Settings',
        contexts: ['action'],
      });

      await browser.contextMenus.create({
        id: 'view-all-jobs',
        title: 'View All Jobs',
        contexts: ['action'],
      });

      console.info('[Background] Context menus created');
    } catch (error) {
      console.error('[Background] Error creating context menus:', error);
    }
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(
    (
      info: Browser.contextMenus.OnClickData,
      tab: Browser.tabs.Tab | undefined
    ) => {
      console.info('[Background] Context menu clicked:', info.menuItemId);

      if (info.menuItemId === 'extract-job' && tab?.id && tab.windowId) {
        console.info('[Background] Opening sidepanel for extraction');

        // CRITICAL: Call sidePanel.open() synchronously (no await) to preserve user gesture
        // Chrome MV3 loses gesture context after ANY async operation, even with await
        // We must call the API synchronously within the event handler
        browser.sidePanel
          .open({ windowId: tab.windowId })
          .then(() => {
            console.info('[Background] Sidepanel opened successfully');

            // Now set extraction trigger (sidepanel will detect this change)
            // Even if sidepanel isn't fully loaded yet, the watch() will catch it
            return extractionTriggerStorage.setValue(Date.now());
          })
          .then(() => {
            console.info('[Background] Extraction trigger set');
            // The sidepanel's extractionTriggerStorage.watch() will detect the change
            // and automatically start the extraction flow
          })
          .catch((error: unknown) => {
            console.error(
              '[Background] Error handling extraction context menu:',
              error
            );
          });
      } else if (info.menuItemId === 'open-settings') {
        console.info('[Background] Opening popup for settings');

        // Open popup window (extension popup)
        browser.action
          .openPopup()
          .then(() => {
            console.info('[Background] Popup opened successfully');
          })
          .catch((error: unknown) => {
            console.error('[Background] Error opening popup:', error);
          });
      } else if (info.menuItemId === 'view-all-jobs') {
        console.info('[Background] Opening job details page');

        // Open job-details page in a new tab
        browser.tabs
          .create({
            url: browser.runtime.getURL('/job-details.html'),
          })
          .then(() => {
            console.info('[Background] Job details page opened successfully');
          })
          .catch((error: unknown) => {
            console.error('[Background] Error opening job details:', error);
          });
      }
    }
  );

  /**
   * Call LLM API with timeout and error handling
   *
   * @param endpoint - LLM API endpoint URL
   * @param requestBody - Request payload for the LLM
   * @returns Promise resolving to LLM response data
   * @throws Error with user-friendly message on failure
   */
  async function callLLMAPI(endpoint: string, requestBody: unknown) {
    console.info('[Background] Calling LLM API:', endpoint);
    console.info(
      '[Background] Request body:',
      JSON.stringify(requestBody, null, 2)
    );

    try {
      // Add a timeout for the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        LLM_API_TIMEOUT_MS
      );

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.info('[Background] LLM API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Background] LLM API error response:', errorText);
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.info(
        '[Background] LLM API success, response length:',
        JSON.stringify(data).length
      );
      return data;
    } catch (error: unknown) {
      console.error('[Background] Error calling LLM API:', error);
      const err = error as Error;

      // Provide more specific error messages
      if (err.name === 'AbortError') {
        throw new Error(
          `LLM request timed out after ${LLM_API_TIMEOUT_SECONDS} seconds`
        );
      } else if (err.message.includes('Failed to fetch')) {
        throw new Error(
          'Cannot connect to LM Studio. Make sure it is running on ' + endpoint
        );
      } else {
        throw error;
      }
    }
  }

  // Note: Keyboard shortcuts cannot open side panels in Chrome MV3
  // The commands.onCommand API is not considered a "user gesture" by Chrome
  // Users can open the side panel via:
  // 1. Right-click context menu on the page
  // 2. Clicking the extension icon (if setPanelBehavior is enabled)
  // 3. Chrome's built-in side panel menu

  /**
   * Send messages with retry logic to handle sidepanel timing issues
   *
   * The sidepanel may not be fully loaded when background tries to send messages,
   * especially immediately after opening. This function retries on
   * "Receiving end does not exist" errors.
   *
   * @param message - Notification message to send
   * @param maxRetries - Maximum retry attempts (default: 5)
   * @param delayMs - Delay between retries in milliseconds (default: 200)
   * @throws Error if all retries fail or non-retryable error occurs
   */
  async function sendMessageWithRetry(
    message: NotificationMessage,
    maxRetries: number = MESSAGE_RETRY_MAX_ATTEMPTS,
    delayMs: number = MESSAGE_RETRY_DELAY_MS
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await browser.runtime.sendMessage(message);
        console.info(
          `[Background] Message sent successfully: ${message.action}`
        );
        return; // Success!
      } catch (err: unknown) {
        const error = err as Error;
        if (error.message?.includes('Receiving end does not exist')) {
          if (attempt < maxRetries) {
            console.info(
              `[Background] Sidepanel not ready, retrying (${attempt}/${maxRetries})...`
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          } else {
            console.error(
              `[Background] Failed to send message after ${maxRetries} attempts:`,
              err
            );
            throw err;
          }
        } else {
          // Different error, don't retry
          console.error('[Background] Failed to send message:', err);
          throw err;
        }
      }
    }
  }

  // Handle messages from other parts of the extension
  browser.runtime.onMessage.addListener(
    (
      request: RuntimeMessage,
      _sender: Browser.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => {
      // Note: WXT handles async message handlers automatically

      if (request.action === 'getJobs') {
        jobsStorage.getValue().then((jobsObj) => {
          sendResponse({ jobs: jobsObj || {} });
        });
        return true;
      }

      if (request.action === 'saveJob') {
        jobsStorage.getValue().then((jobsObj) => {
          const jobs = jobsObj || {};
          jobs[request.job.id] = request.job;
          jobsStorage.setValue(jobs).then(() => {
            sendResponse({ success: true, count: Object.keys(jobs).length });
          });
        });
        return true;
      }

      if (request.action === 'callLLM') {
        // Handle LLM API calls from content script
        (async () => {
          try {
            const data = await callLLMAPI(
              request.endpoint,
              request.requestBody
            );
            sendResponse({ success: true, data: data });
          } catch (error: unknown) {
            console.error('[Background] LLM call failed:', error);
            const err = error as Error;
            sendResponse({ success: false, error: err.message });
          }
        })();
        return true;
      }

      if (request.action === 'streamExtractJob') {
        // Handle streaming job extraction with LLM
        const {
          jobId,
          url,
          source,
          rawText,
          llmSettings: userLlmSettings,
        } = request;
        console.info(
          '[Background] Received streaming extraction request for job:',
          jobId
        );

        // Use user settings or fallback to config defaults
        const llmSettings: LLMSettings = userLlmSettings || {
          provider: 'lm-studio',
          model: llmConfig.extraction.defaultModel,
          apiEndpoint: llmConfig.extraction.endpoint,
          endpoint: llmConfig.extraction.endpoint,
          maxTokens: 2000,
          temperature: 0.3,
        };

        // Start global keepalive BEFORE responding to ensure worker stays alive
        startGlobalKeepAlive();

        // Immediately acknowledge receipt so popup can close
        sendResponse({ success: true, message: 'Extraction started' });

        // Start streaming in background (don't await)
        (async () => {
          const streamId = jobId; // Use jobId as streamId for tracking

          try {
            console.info('[Background] Starting LLM streaming for job:', jobId);

            // Initialize LLM client
            const llmClient = new LLMClient({
              endpoint: llmSettings.endpoint,
              modelsEndpoint: llmSettings.modelsEndpoint,
            });

            // Store in activeExtractions for cancellation
            activeExtractions.set(jobId, { llmClient, streamId });

            // Send initial metadata to sidepanel (for creating in-memory job)
            // Use retry logic because sidepanel may not be fully loaded yet
            await sendMessageWithRetry({
              action: 'extractionStarted',
              jobId: jobId,
              url: url,
              source: source,
              rawText: rawText,
            });

            // Prepare prompts from config
            const systemPrompt =
              llmConfig.synthesis.prompts.jobExtractor.trim();
            const userPrompt = rawText;

            // Use configured model or fallback to default extraction model
            const modelToUse =
              llmSettings.model && llmSettings.model.trim() !== ''
                ? llmSettings.model
                : llmConfig.extraction.defaultModel;

            console.info(
              '[Background] Using model for extraction:',
              modelToUse,
              llmSettings.model ? '(configured)' : '(default fallback)'
            );

            // Stream completion with callbacks
            const result = await llmClient.streamCompletion({
              streamId: streamId, // Pass streamId for cancellation tracking
              model: modelToUse,
              systemPrompt: systemPrompt,
              userPrompt: userPrompt,
              maxTokens: llmSettings.maxTokens || 2000,
              temperature: llmSettings.temperature || 0.3,
              onThinkingUpdate: (delta: string) => {
                // Ignore thinking stream (we only care about the document)
                console.info(
                  '[Background] Thinking:',
                  delta.substring(0, 50) + '...'
                );
              },
              onDocumentUpdate: (delta: string) => {
                // Send document chunks to sidepanel (no retry for chunks - stream is real-time)
                console.info(
                  '[Background] Sending chunk to sidepanel:',
                  delta.substring(0, 50) + '...'
                );
                browser.runtime
                  .sendMessage({
                    action: 'extractionChunk',
                    jobId: jobId,
                    chunk: delta,
                  })
                  .catch((err: unknown) => {
                    console.error(
                      '[Background] Failed to send chunk to sidepanel:',
                      err
                    );
                  });
              },
            });

            // Check if stream was cancelled
            if (result.cancelled) {
              console.info(
                '[Background] Streaming extraction cancelled for job:',
                jobId
              );
              await sendMessageWithRetry({
                action: 'extractionCancelled',
                jobId: jobId,
              }).catch((err: unknown) => {
                console.error(
                  '[Background] Failed to send cancellation to sidepanel:',
                  err
                );
              });
              return;
            }

            // Send completion message
            await sendMessageWithRetry({
              action: 'extractionComplete',
              jobId: jobId,
              fullContent: result.documentContent,
            }).catch((err: unknown) => {
              console.error(
                '[Background] Failed to send completion to sidepanel:',
                err
              );
            });

            console.info(
              '[Background] Streaming extraction completed for job:',
              jobId
            );
          } catch (error: unknown) {
            console.error('[Background] Streaming extraction failed:', error);

            // Send error to sidepanel
            const err = error as Error;
            await sendMessageWithRetry({
              action: 'extractionError',
              jobId: jobId,
              error: err.message,
            }).catch((err: unknown) => {
              console.error(
                '[Background] Failed to send error to sidepanel:',
                err
              );
            });
          } finally {
            // Clean up activeExtractions
            activeExtractions.delete(jobId);

            // Stop global keepalive when done
            stopGlobalKeepAlive();
          }
        })();

        return true; // Keep message channel open for async response
      }

      if (request.action === 'cancelExtraction') {
        // Handle cancellation of ongoing extraction
        const { jobId } = request;
        console.info(
          '[Background] Received cancellation request for job:',
          jobId
        );

        const extraction = activeExtractions.get(jobId);
        if (extraction) {
          const { llmClient, streamId } = extraction;
          console.info('[Background] Cancelling stream:', streamId);
          llmClient.cancelStream(streamId);
          sendResponse({ success: true, message: 'Extraction cancelled' });
        } else {
          console.info(
            '[Background] No active extraction found for job:',
            jobId
          );
          sendResponse({
            success: false,
            message: 'No active extraction found',
          });
        }

        return true;
      }

      if (request.action === 'setJobInFocus') {
        // Handle setting jobInFocus (Rule 3: Cross-component state)
        // Background coordinates jobInFocus to ensure consistency across sidepanel and job-details
        const { jobId } = request;
        console.info('[Background] Setting jobInFocus to:', jobId);

        (async () => {
          try {
            const { jobInFocusStorage } = await import('../utils/storage');
            await jobInFocusStorage.setValue(jobId);
            sendResponse({ success: true });
          } catch (error: unknown) {
            console.error('[Background] Failed to set jobInFocus:', error);
            const err = error as Error;
            sendResponse({ success: false, error: err.message });
          }
        })();

        return true;
      }

      if (request.action === 'deleteJob') {
        // Handle job deletion (Rule 3: Cross-component state)
        // Background coordinates deletion to ensure cross-tab sync
        const { jobId } = request;
        console.info('[Background] Deleting job:', jobId);

        (async () => {
          try {
            const { jobInFocusStorage } = await import('../utils/storage');

            // Delete job from storage
            const jobs = await jobsStorage.getValue();
            delete jobs[jobId];
            await jobsStorage.setValue(jobs);

            // Clear jobInFocus if the deleted job was focused
            const currentFocus = await jobInFocusStorage.getValue();
            if (currentFocus === jobId) {
              await jobInFocusStorage.setValue(null);
            }

            console.info('[Background] Job deleted successfully:', jobId);
            sendResponse({ success: true });
          } catch (error: unknown) {
            console.error('[Background] Failed to delete job:', error);
            const err = error as Error;
            sendResponse({ success: false, error: err.message });
          }
        })();

        return true;
      }

      return false;
    }
  );

  console.info('Sir Hires background script loaded');
});
