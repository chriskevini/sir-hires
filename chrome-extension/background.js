// Background service worker for the extension

// Import LLMClient for streaming extraction
import { LLMClient } from './utils/llm-client.js';
import { llmConfig } from './job-details/config.js';

// Global keepalive to prevent service worker termination
// Chrome terminates inactive service workers after ~30 seconds
// This interval pings storage every 20 seconds to keep it alive
let globalKeepAliveInterval = null;

function startGlobalKeepAlive() {
  if (globalKeepAliveInterval) {
    return; // Already running
  }
  
  console.log('[Background] Starting global keepalive');
  
  // Fire immediately first
  chrome.storage.local.get(['_keepalive'], () => {
    console.log('[Background] Global keepalive ping (immediate)');
  });
  
  // Then continue every 20 seconds
  globalKeepAliveInterval = setInterval(() => {
    chrome.storage.local.get(['_keepalive'], () => {
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
  return new Promise((resolve) => {
    chrome.storage.local.get(['jobs', 'masterResume', 'schemaMigrated'], (result) => {
      // Check if migration already completed
      if (result.schemaMigrated) {
        console.log('[Migration] Schema already migrated to camelCase');
        resolve();
        return;
      }

      console.log('[Migration] Starting snake_case to camelCase migration...');
      let migrationCount = 0;

      // Migrate jobs
      const jobs = result.jobs || {};
      const migratedJobs = {};
      
      Object.entries(jobs).forEach(([key, job]) => {
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
          applicationStatus: job.application_status || job.applicationStatus || 'Researching',
          statusHistory: job.status_history || job.statusHistory || [],
          url: job.url || '',
          source: job.source || '',
          rawDescription: job.raw_description || job.rawDescription || '',
          aboutJob: job.about_job || job.aboutJob || '',
          aboutCompany: job.about_company || job.aboutCompany || '',
          responsibilities: job.responsibilities || '',
          requirements: job.requirements || '',
          notes: job.notes || '',
          narrativeStrategy: job.narrative_strategy || job.narrativeStrategy || '',
          updatedAt: job.updated_at || job.updatedAt || new Date().toISOString(),
          targetedResume: job.targeted_resume || job.targetedResume || ''
        };
        migrationCount++;
      });

      // Migrate master resume (if it exists)
      let migratedMasterResume = null;
      if (result.masterResume) {
        migratedMasterResume = {
          content: result.masterResume.content || '',
          updatedAt: result.masterResume.updated_at || result.masterResume.updatedAt || new Date().toISOString()
        };
      }

      // Save migrated data
      const dataToSave = {
        jobs: migratedJobs,
        schemaMigrated: true
      };
      
      if (migratedMasterResume) {
        dataToSave.masterResume = migratedMasterResume;
      }

      chrome.storage.local.set(dataToSave, () => {
        console.log(`[Migration] Successfully migrated ${migrationCount} jobs to camelCase`);
        resolve();
      });
    });
  });
}

// Migration function: Convert masterResume to userProfile with Profile Template
async function migrateResumeToProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['masterResume', 'userProfile', 'profileMigrated'], (result) => {
      // Check if migration already completed
      if (result.profileMigrated) {
        console.log('[Migration] Profile already migrated to userProfile');
        resolve();
        return;
      }

      console.log('[Migration] Starting masterResume to userProfile migration...');

      // If userProfile already exists, don't migrate
      if (result.userProfile) {
        console.log('[Migration] userProfile already exists, skipping migration');
        chrome.storage.local.set({ profileMigrated: true }, () => {
          resolve();
        });
        return;
      }

      // If masterResume exists, migrate it
      if (result.masterResume && result.masterResume.content) {
        const oldContent = result.masterResume.content;
        const updatedAt = result.masterResume.updatedAt || new Date().toISOString();
        
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
${oldContent.split('\n').map(line => '// ' + line).join('\n')}`;

        const userProfile = {
          content: migratedContent,
          updatedAt: new Date().toISOString()
        };

        chrome.storage.local.set({ 
          userProfile: userProfile,
          profileMigrated: true
        }, () => {
          console.log('[Migration] Successfully migrated masterResume to userProfile');
          resolve();
        });
      } else {
        // No masterResume to migrate, just mark as migrated
        console.log('[Migration] No masterResume found, marking as migrated');
        chrome.storage.local.set({ profileMigrated: true }, () => {
          resolve();
        });
      }
    });
  });
}

// Listen for installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Sir Hires extension installed');
  
  // Run migrations in order
  await migrateStorageSchema();
  await migrateResumeToProfile();
  
  // Initialize storage if needed
  chrome.storage.local.get(['jobs'], (result) => {
    if (!result.jobs) {
      chrome.storage.local.set({ jobs: {} });
    }
  });

  // Disable side panel on action click (we want popup to open instead)
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
    .catch((error) => console.error('Error setting side panel behavior:', error));

  // Auto-open side panel on first install to show instructions
  if (details.reason === 'install') {
    try {
      const windows = await chrome.windows.getAll();
      if (windows.length > 0) {
        await chrome.sidePanel.open({ windowId: windows[0].id });
        console.log('Side panel opened on first install');
      }
    } catch (error) {
      console.error('Error opening side panel on install:', error);
    }
  }
});

// Listen for keyboard shortcut to toggle side panel
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-side-panel') {
    try {
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: window.id });
      console.log('Side panel toggled via keyboard shortcut');
    } catch (error) {
      console.error('Error toggling side panel:', error);
    }
  }
});

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getJobs') {
    chrome.storage.local.get(['jobs'], (result) => {
      sendResponse({ jobs: result.jobs || [] });
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'saveJob') {
    chrome.storage.local.get(['jobs'], (result) => {
      const jobs = result.jobs || [];
      jobs.push(request.job);
      chrome.storage.local.set({ jobs }, () => {
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
      } catch (error) {
        console.error('[Background] LLM call failed:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (request.action === 'streamExtractJob') {
    // Handle streaming job extraction with LLM
    const { jobId, rawText, llmSettings } = request;
    console.log('[Background] Received streaming extraction request for job:', jobId);
    
    // Start global keepalive BEFORE responding to ensure worker stays alive
    startGlobalKeepAlive();
    
    // Immediately acknowledge receipt so popup can close
    sendResponse({ success: true, message: 'Extraction started' });
    
    // Start streaming in background (don't await)
    (async () => {
      try {
        console.log('[Background] Starting LLM streaming for job:', jobId);

        // Initialize LLM client
        const llmClient = new LLMClient({
          endpoint: llmSettings.endpoint,
          modelsEndpoint: llmSettings.modelsEndpoint
        });

        // Prepare prompts from config
        const systemPrompt = llmConfig.synthesis.prompts.jobExtractor.trim();
        const userPrompt = rawText;

        // Stream completion with callbacks
        const result = await llmClient.streamCompletion({
          model: llmSettings.model,
          systemPrompt: systemPrompt,
          userPrompt: userPrompt,
          maxTokens: llmSettings.maxTokens || 2000,
          temperature: llmSettings.temperature || 0.3,
          onThinkingUpdate: (delta) => {
            // Ignore thinking stream (we only care about the document)
            console.log('[Background] Thinking:', delta.substring(0, 50) + '...');
          },
          onDocumentUpdate: (delta) => {
            // Send document chunks to sidepanel
            console.log('[Background] Sending chunk to sidepanel:', delta.substring(0, 50) + '...');
            chrome.runtime.sendMessage({
              action: 'extractionChunk',
              jobId: jobId,
              chunk: delta
            }).catch(err => {
              console.error('[Background] Failed to send chunk to sidepanel:', err);
            });
          }
        });

        // Send completion message
        chrome.runtime.sendMessage({
          action: 'extractionComplete',
          jobId: jobId,
          fullContent: result.documentContent
        }).catch(err => {
          console.error('[Background] Failed to send completion to sidepanel:', err);
        });

        console.log('[Background] Streaming extraction completed for job:', jobId);

      } catch (error) {
        console.error('[Background] Streaming extraction failed:', error);
        
        // Send error to sidepanel
        chrome.runtime.sendMessage({
          action: 'extractionError',
          jobId: jobId,
          error: error.message
        }).catch(err => {
          console.error('[Background] Failed to send error to sidepanel:', err);
        });
      } finally {
        // Stop global keepalive when done
        stopGlobalKeepAlive();
      }
    })();
    
    return true; // Keep message channel open for async response
  }
});

// Function to call LLM API (runs in background with proper permissions)
async function callLLMAPI(endpoint, requestBody) {
  console.log('[Background] Calling LLM API:', endpoint);
  console.log('[Background] Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    // Add a timeout for the fetch request (60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    console.log('[Background] LLM API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] LLM API error response:', errorText);
      throw new Error(`LLM API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Background] LLM API success, response length:', JSON.stringify(data).length);
    return data;
  } catch (error) {
    console.error('[Background] Error calling LLM API:', error);
    
    // Provide more specific error messages
    if (error.name === 'AbortError') {
      throw new Error('LLM request timed out after 60 seconds');
    } else if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to LM Studio. Make sure it is running on ' + endpoint);
    } else {
      throw error;
    }
  }
}
