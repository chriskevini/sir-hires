import { LLMClient } from '../utils/llm-client';
import { llmConfig } from '../config';

export default defineBackground(() => {
  // Global keepalive to prevent service worker termination
  // Chrome terminates inactive service workers after ~30 seconds
  // This interval pings storage every 20 seconds to keep it alive
  let globalKeepAliveInterval: NodeJS.Timeout | null = null;

  // Track active extractions for cancellation
  // Map: jobId → { llmClient, streamId }
  const activeExtractions = new Map<string, any>();

  function startGlobalKeepAlive() {
    if (globalKeepAliveInterval) {
      return; // Already running
    }

    console.log('[Background] Starting global keepalive');

    // Fire immediately first
    browser.storage.local.get(['_keepalive']).then(() => {
      console.log('[Background] Global keepalive ping (immediate)');
    });

    // Then continue every 20 seconds
    globalKeepAliveInterval = setInterval(() => {
      browser.storage.local.get(['_keepalive']).then(() => {
        console.log('[Background] Global keepalive ping');
      });
    }, 20000); // Ping every 20 seconds
  }

  function stopGlobalKeepAlive() {
    if (globalKeepAliveInterval) {
      console.log('[Background] Stopping global keepalive');
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
      console.log('[Migration] Schema already migrated to camelCase');
      return;
    }

    console.log('[Migration] Starting snake_case to camelCase migration...');
    let migrationCount = 0;

    // Migrate jobs
    const jobs = result.jobs || {};
    const migratedJobs: Record<string, any> = {};

    Object.entries(jobs).forEach(([key, job]: [string, any]) => {
      migratedJobs[key] = {
        id: job.id,
        jobTitle: job.job_title || job.jobTitle || '',
        company: job.company || '',
        location: job.location || '',
        salary: job.salary || '',
        jobType: job.job_type || job.jobType || '',
        remoteType: job.remote_type || job.remoteType || '',
        postedDate: job.posted_date || job.postedDate || '',
        deadline: job.deadline || '',
        applicationStatus:
          job.application_status || job.applicationStatus || 'Researching',
        statusHistory: job.status_history || job.statusHistory || [],
        url: job.url || '',
        source: job.source || '',
        rawDescription: job.raw_description || job.rawDescription || '',
        aboutJob: job.about_job || job.aboutJob || '',
        aboutCompany: job.about_company || job.aboutCompany || '',
        responsibilities: job.responsibilities || '',
        requirements: job.requirements || '',
        notes: job.notes || '',
        narrativeStrategy:
          job.narrative_strategy || job.narrativeStrategy || '',
        updatedAt: job.updated_at || job.updatedAt || new Date().toISOString(),
        targetedResume: job.targeted_resume || job.targetedResume || '',
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
    console.log(
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
      console.log('[Migration] Profile already migrated to userProfile');
      return;
    }

    console.log(
      '[Migration] Starting masterResume to userProfile migration...'
    );

    // If userProfile already exists, don't migrate
    if (result.userProfile) {
      console.log('[Migration] userProfile already exists, skipping migration');
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
      console.log(
        '[Migration] Successfully migrated masterResume to userProfile'
      );
    } else {
      // No masterResume to migrate, just mark as migrated
      console.log('[Migration] No masterResume found, marking as migrated');
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
    const result = await browser.storage.local.get(['jobs']);
    if (!result.jobs) {
      await browser.storage.local.set({ jobs: {} });
    }

    // Disable side panel on action click (we want popup to open instead)
    try {
      await browser.sidePanel.setPanelBehavior({
        openPanelOnActionClick: false,
      });
    } catch (error) {
      console.error('Error setting side panel behavior:', error);
    }
  });

  // Helper function to call LLM API
  async function callLLMAPI(endpoint: string, requestBody: any) {
    console.log('[Background] Calling LLM API:', endpoint);
    console.log(
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

      console.log('[Background] LLM API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Background] LLM API error response:', errorText);
        throw new Error(`LLM API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(
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
        console.log(
          `[Background] Message sent successfully: ${message.action}`
        );
        return; // Success!
      } catch (err: any) {
        if (err.message?.includes('Receiving end does not exist')) {
          if (attempt < maxRetries) {
            console.log(
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
      browser.storage.local.get(['jobs']).then((result) => {
        sendResponse({ jobs: result.jobs || [] });
      });
      return true;
    }

    if (request.action === 'saveJob') {
      browser.storage.local.get(['jobs']).then((result) => {
        const jobs = result.jobs || [];
        jobs.push(request.job);
        browser.storage.local.set({ jobs }).then(() => {
          sendResponse({ success: true, count: jobs.length });
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
      console.log(
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
          console.log('[Background] Starting LLM streaming for job:', jobId);

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

          console.log(
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
              console.log(
                '[Background] Thinking:',
                delta.substring(0, 50) + '...'
              );
            },
            onDocumentUpdate: (delta: string) => {
              // Send document chunks to sidepanel (no retry for chunks - stream is real-time)
              console.log(
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
            console.log(
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

          console.log(
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
      console.log('[Background] Received cancellation request for job:', jobId);

      const extraction = activeExtractions.get(jobId);
      if (extraction) {
        const { llmClient, streamId } = extraction;
        console.log('[Background] Cancelling stream:', streamId);
        llmClient.cancelStream(streamId);
        sendResponse({ success: true, message: 'Extraction cancelled' });
      } else {
        console.log('[Background] No active extraction found for job:', jobId);
        sendResponse({ success: false, message: 'No active extraction found' });
      }

      return true;
    }

    return false;
  });

  console.log('Sir Hires background script loaded');
});
