// Background Service Worker
//
// Central coordination point for the extension. Handles:
// - Extension lifecycle (installation, context menus)
// - LLM API calls (non-streaming, for content scripts)
// - Cross-component state management (jobInFocus, job deletion)
// - Message routing between content scripts, popup, and sidepanel
//
// Architecture:
// - Uses hybrid event-driven pattern (see AGENTS.md)
// - Rule 2: Manages cross-component state (jobInFocus, deletion)
// - Rule 3: Simple mutations handled directly by components
//
// Note: LLM streaming extraction is now handled directly by components using
// runTask() from src/tasks/index.ts. Components manage their own keepalive
// via startKeepalive() from src/utils/storage.ts.

import type { Browser } from 'wxt/browser';
import { llmConfig } from '../config';
import { jobsStorage, extractionTriggerStorage } from '../utils/storage';

// Message Type Definitions
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

interface SetJobInFocusMessage extends BaseMessage {
  action: 'setJobInFocus';
  jobId: string | null;
}

interface DeleteJobMessage extends BaseMessage {
  action: 'deleteJob';
  jobId: string;
}

interface FetchModelsMessage extends BaseMessage {
  action: 'fetchModels';
  endpoint: string;
  apiKey?: string;
}

type RuntimeMessage =
  | GetJobsMessage
  | SaveJobMessage
  | CallLLMMessage
  | SetJobInFocusMessage
  | DeleteJobMessage
  | FetchModelsMessage;

export default defineBackground(() => {
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
      // Page context menu (right-click on page)
      await browser.contextMenus.create({
        id: 'extract-job',
        title: 'Extract Job from This Page',
        contexts: ['page', 'selection'],
      });

      // Extension icon context menu (right-click on extension icon)
      // User features
      await browser.contextMenus.create({
        id: 'view-all-jobs',
        title: 'View All Jobs',
        contexts: ['action'],
      });

      await browser.contextMenus.create({
        id: 'edit-profile',
        title: 'Edit Profile',
        contexts: ['action'],
      });

      // Developer/settings features
      await browser.contextMenus.create({
        id: 'open-settings',
        title: 'Open LLM Settings',
        contexts: ['action'],
      });

      await browser.contextMenus.create({
        id: 'prompt-playground',
        title: 'Prompt Playground',
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
      } else if (info.menuItemId === 'edit-profile') {
        console.info('[Background] Opening profile page');

        // Open profile page in a new tab
        browser.tabs
          .create({
            url: browser.runtime.getURL('/profile.html'),
          })
          .then(() => {
            console.info('[Background] Profile page opened successfully');
          })
          .catch((error: unknown) => {
            console.error('[Background] Error opening profile:', error);
          });
      } else if (info.menuItemId === 'prompt-playground') {
        console.info('[Background] Opening prompt playground');

        // Open prompt playground in a new tab
        browser.tabs
          .create({
            url: browser.runtime.getURL('/playground.html'),
          })
          .then(() => {
            console.info('[Background] Prompt playground opened successfully');
          })
          .catch((error: unknown) => {
            console.error(
              '[Background] Error opening prompt playground:',
              error
            );
          });
      }
    }
  );

  // Call LLM API with timeout and error handling
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
        llmConfig.timeoutMs
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
          `LLM request timed out after ${llmConfig.timeoutSeconds} seconds`
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

      if (request.action === 'fetchModels') {
        // Handle fetching available models from LLM server
        const { endpoint, apiKey } = request;
        console.info('[Background] Fetching models from:', endpoint);

        (async () => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const headers: Record<string, string> = {};
            if (apiKey) {
              headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(endpoint, {
              method: 'GET',
              headers,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`
              );
            }

            const data = await response.json();

            // Extract model IDs from the response
            // OpenAI-compatible API returns { data: [{ id: "model-name", ... }, ...] }
            const models: string[] = (data.data || []).map(
              (m: { id: string }) => m.id
            );

            console.info('[Background] Found models:', models);
            sendResponse({ success: true, models });
          } catch (error: unknown) {
            console.error('[Background] Failed to fetch models:', error);

            const errorMessage =
              error instanceof Error ? error.message : String(error);
            const errorName = error instanceof Error ? error.name : '';

            let displayMessage = errorMessage;
            if (errorName === 'AbortError') {
              displayMessage = 'Request timed out. Is the LLM server running?';
            } else if (errorMessage.includes('Failed to fetch')) {
              displayMessage =
                'Cannot connect to LLM server. Make sure it is running.';
            }

            sendResponse({ success: false, error: displayMessage });
          }
        })();
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
