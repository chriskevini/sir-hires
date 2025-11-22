import { LLMClient } from '../utils/llm-client';
import { llmConfig } from '../config';
import {
  jobsStorage,
  keepaliveStorage,
  extractionTriggerStorage,
} from '../utils/storage';

export default defineBackground(() => {
  // Global keepalive to prevent service worker termination
  // Chrome terminates inactive service workers after ~30 seconds
  // This interval pings storage every 20 seconds to keep it alive
  let globalKeepAliveInterval: NodeJS.Timeout | null = null;

  // Track active extractions for cancellation
  // Map: jobId → { llmClient, streamId }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeExtractions = new Map<string, any>();

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
    }, 20000); // Ping every 20 seconds
  }

  function stopGlobalKeepAlive() {
    if (globalKeepAliveInterval) {
      console.info('[Background] Stopping global keepalive');
      clearInterval(globalKeepAliveInterval);
      globalKeepAliveInterval = null;
    }
  }

  // Migration function: Convert snake_case properties to camelCase
  async function migrateStorageSchema() {
    const result = await browser.storage.local.get([
      'jobs',
      'masterResume',
      'schemaMigrated',
    ]);

    // Check if migration already completed
    if (result.schemaMigrated) {
      console.info('[Migration] Schema already migrated to camelCase');
      return;
    }

    console.info('[Migration] Starting snake_case to camelCase migration...');
    let migrationCount = 0;

    // Migrate jobs
    const jobs = result.jobs || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const migratedJobs: Record<string, any> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.entries(jobs).forEach(([key, job]: [string, any]) => {
      migratedJobs[key] = {
        id: job.id,
        content: job.content || '',
        url: job.url || '',
        applicationStatus:
          job.application_status || job.applicationStatus || 'Researching',
        checklist: job.checklist || {},
        documents: job.documents || {},
        updatedAt: job.updated_at || job.updatedAt || new Date().toISOString(),
        createdAt: job.created_at || job.createdAt || new Date().toISOString(),
      };
      migrationCount++;
    });

    // Migrate master resume (if it exists)
    let migratedMasterResume = null;
    if (result.masterResume) {
      migratedMasterResume = {
        content: result.masterResume.content || '',
        updatedAt:
          result.masterResume.updated_at ||
          result.masterResume.updatedAt ||
          new Date().toISOString(),
      };
    }

    // Save migrated data
    const dataToSave: Record<string, any> = {
      jobs: migratedJobs,
      schemaMigrated: true,
    };

    if (migratedMasterResume) {
      dataToSave.masterResume = migratedMasterResume;
    }

    await browser.storage.local.set(dataToSave);
    console.info(
      `[Migration] Successfully migrated ${migrationCount} jobs to camelCase`
    );
  }

  // Migration function: Convert masterResume to userProfile with Profile Template
  async function migrateResumeToProfile() {
    const result = await browser.storage.local.get([
      'masterResume',
      'userProfile',
      'profileMigrated',
    ]);

    // Check if migration already completed
    if (result.profileMigrated) {
      console.info('[Migration] Profile already migrated to userProfile');
      return;
    }

    console.info(
      '[Migration] Starting masterResume to userProfile migration...'
    );

    // If userProfile already exists, don't migrate
    if (result.userProfile) {
      console.info(
        '[Migration] userProfile already exists, skipping migration'
      );
      await browser.storage.local.set({ profileMigrated: true });
      return;
    }

    // If masterResume exists, migrate it
    if (result.masterResume && result.masterResume.content) {
      const oldContent = result.masterResume.content;

      // Wrap old content in comment block and add Profile Template starter
      const migratedContent = `<PROFILE>
NAME: Your Full Name
EMAIL: your.email@example.com
PHONE: (555) 123-4567

# EDUCATION
## EDU_1
DEGREE: Your degree
SCHOOL: Your school
START: Start date
END: End date

# EXPERIENCE
## EXP_1
TYPE: PROFESSIONAL
TITLE: Your job title
AT: Company name
START: Start date
END: ONGOING
BULLETS:
- Achievement or responsibility
- Another achievement

# INTERESTS:
- Your interests

// OLD CONTENT:
${oldContent
  .split('\n')
  .map((line) => '// ' + line)
  .join('\n')}`;

      const userProfile = {
        content: migratedContent,
        updatedAt: new Date().toISOString(),
      };

      await browser.storage.local.set({
        userProfile: userProfile,
        profileMigrated: true,
      });
      console.info(
        '[Migration] Successfully migrated masterResume to userProfile'
      );
    } else {
      // No masterResume to migrate, just mark as migrated
      console.info('[Migration] No masterResume found, marking as migrated');
      await browser.storage.local.set({ profileMigrated: true });
    }
  }

  // Listen for installation
  browser.runtime.onInstalled.addListener(async (_details) => {
    console.info('Sir Hires extension installed');

    // Run migrations in order
    await migrateStorageSchema();
    await migrateResumeToProfile();

    // Initialize storage if needed
    const jobs = await jobsStorage.getValue();
    if (!jobs || Object.keys(jobs).length === 0) {
      await jobsStorage.setValue({});
    }

    // Disable side panel on action click (we want popup to open instead)
    try {
      await browser.sidePanel.setPanelBehavior({
        openPanelOnActionClick: false,
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
  browser.contextMenus.onClicked.addListener((info, tab) => {
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
        .catch((error: any) => {
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
        .catch((error: any) => {
          console.error('[Background] Error opening popup:', error);
        });
    } else if (info.menuItemId === 'view-all-jobs') {
      console.info('[Background] Opening job details page');

      // Open job-details page in a new tab
      browser.tabs
        .create({
          url: browser.runtime.getURL('job-details.html'),
        })
        .then(() => {
          console.info('[Background] Job details page opened successfully');
        })
        .catch((error: any) => {
          console.error('[Background] Error opening job details:', error);
        });
    }
  });

  // Helper function to call LLM API
  async function callLLMAPI(endpoint: string, requestBody: any) {
    console.info('[Background] Calling LLM API:', endpoint);
    console.info(
      '[Background] Request body:',
      JSON.stringify(requestBody, null, 2)
    );

    try {
      // Add a timeout for the fetch request (60 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

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
    } catch (error: any) {
      console.error('[Background] Error calling LLM API:', error);

      // Provide more specific error messages
      if (error.name === 'AbortError') {
        throw new Error('LLM request timed out after 60 seconds');
      } else if (error.message.includes('Failed to fetch')) {
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

  // Helper function to send messages with retry logic (for sidepanel timing issues)
  async function sendMessageWithRetry(
    message: any,
    maxRetries: number = 5,
    delayMs: number = 200
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await browser.runtime.sendMessage(message);
        console.info(
          `[Background] Message sent successfully: ${message.action}`
        );
        return; // Success!
      } catch (err: any) {
        if (err.message?.includes('Receiving end does not exist')) {
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
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
          const data = await callLLMAPI(request.endpoint, request.requestBody);
          sendResponse({ success: true, data: data });
        } catch (error: any) {
          console.error('[Background] LLM call failed:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    if (request.action === 'streamExtractJob') {
      // Handle streaming job extraction with LLM
      const { jobId, url, source, rawText, llmSettings } = request;
      console.info(
        '[Background] Received streaming extraction request for job:',
        jobId
      );

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
          await sendMessageWithRetry(
            {
              action: 'extractionStarted',
              jobId: jobId,
              url: url,
              source: source,
              rawText: rawText,
            },
            5,
            200
          ); // 5 retries, 200ms delay between retries

          // Prepare prompts from config
          const systemPrompt = llmConfig.synthesis.prompts.jobExtractor.trim();
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
                .catch((err: any) => {
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
            }).catch((err: any) => {
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
          }).catch((err: any) => {
            console.error(
              '[Background] Failed to send completion to sidepanel:',
              err
            );
          });

          console.info(
            '[Background] Streaming extraction completed for job:',
            jobId
          );
        } catch (error: any) {
          console.error('[Background] Streaming extraction failed:', error);

          // Send error to sidepanel
          await sendMessageWithRetry({
            action: 'extractionError',
            jobId: jobId,
            error: error.message,
          }).catch((err: any) => {
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
        console.info('[Background] No active extraction found for job:', jobId);
        sendResponse({ success: false, message: 'No active extraction found' });
      }

      return true;
    }

    return false;
  });

  console.info('Sir Hires background script loaded');
});
