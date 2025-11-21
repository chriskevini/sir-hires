// Popup script - simplified launcher interface
import { checklistTemplates } from './job-details/config.js';

/**
 * Initialize checklists for all application statuses
 * @returns {Object} Checklist object with arrays for each status
 */
function initializeAllChecklists() {
  const checklist = {};
  
  // Create checklist arrays for each status
  Object.keys(checklistTemplates).forEach(status => {
    const template = checklistTemplates[status];
    const timestamp = Date.now();
    
    // Create checklist items with unique IDs
    checklist[status] = template.map((templateItem, index) => ({
      id: `item_${timestamp}_${status}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      text: templateItem.text,
      checked: false,
      order: templateItem.order
    }));
  });
  
  return checklist;
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkIfExtractable();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('extractBtn').addEventListener('click', extractJobData);
  document.getElementById('openSidePanelBtn').addEventListener('click', openSidePanel);
  document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('testLlmBtn').addEventListener('click', testLlmConnection);
}

async function extractJobData() {
  const extractBtn = document.getElementById('extractBtn');
  extractBtn.disabled = true;
  extractBtn.textContent = 'Extracting...';

  try {
    // Open side panel FIRST before extraction (but don't close popup yet)
    await openSidePanel(false);
    
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we can access this tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showStatus('Cannot extract data from Chrome internal pages. Please navigate to a job posting.', 'error');
      extractBtn.disabled = false;
      extractBtn.textContent = 'Extract Job Data';
      return;
    }

    // Get LLM settings
    const result = await chrome.storage.local.get(['llmSettings']);
    const llmSettings = result.llmSettings || {
      endpoint: 'http://localhost:1234/v1/chat/completions',
      modelsEndpoint: 'http://localhost:1234/v1/models',
      model: '',
      maxTokens: 2000,
      temperature: 0.3,
      enabled: true  // Enable LLM for streaming extraction
    };

    // Always use streaming extraction (only supported method)
    if (llmSettings.endpoint) {
      try {
        // Try to send streaming extraction message to content script
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'streamExtractJobData',
          llmSettings: llmSettings,
          jobId: generateJobId()
        });

        if (response && response.success) {
          // Create minimal job record immediately
          const jobId = response.jobId;
          const minimalJob = {
            id: jobId,
            url: response.url,
            source: response.source,
            jobTitle: 'Extracting...',
            company: 'Extracting...',
            location: '',
            salary: '',
            jobType: '',
            remoteType: '',
            postedDate: '',
            deadline: '',
            applicationStatus: 'Researching',
            statusHistory: [{
              status: 'Researching',
              timestamp: new Date().toISOString()
            }],
            checklist: initializeAllChecklists(),
            content: '', // Will be populated by streaming
            rawDescription: response.rawText,
            aboutJob: '',
            aboutCompany: '',
            responsibilities: '',
            requirements: '',
            isExtracting: true, // Flag to track extraction in progress
            updatedAt: new Date().toISOString()
          };
          
          // Save minimal job and set as focus
          const result = await chrome.storage.local.get(['jobs']);
          const jobs = result.jobs || {};
          jobs[jobId] = minimalJob;
          await chrome.storage.local.set({ 
            jobs: jobs,
            jobInFocus: jobId 
          });
          
          console.log('[Popup] Created minimal job record:', jobId);
          
          showStatus('✨ Starting extraction...', 'success');
          
          // Send to background for streaming (wait for acknowledgment)
          // This ensures the background worker receives and starts processing before popup closes
          await chrome.runtime.sendMessage({
            action: 'streamExtractJob',
            jobId: jobId,
            rawText: response.rawText,
            llmSettings: llmSettings
          }).catch(err => {
            console.error('[Popup] Failed to send streaming message:', err);
          });
          
          showStatus('✨ Extraction in progress! Check side panel.', 'success');
          
          // Keep popup open longer to ensure background worker starts keepalive
          // The worker needs time to receive message and establish keepalive interval
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          throw new Error('Failed to start streaming extraction');
        }
      } catch (error) {
        console.error('[Popup] Streaming extraction failed, trying to inject content script:', error);
        
        // Try injecting content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        // Try streaming extraction again
        const response = await chrome.tabs.sendMessage(tab.id, { 
          action: 'streamExtractJobData',
          llmSettings: llmSettings,
          jobId: generateJobId()
        });

        if (response && response.success) {
          const jobId = response.jobId;
          const minimalJob = {
            id: jobId,
            url: response.url,
            source: response.source,
            jobTitle: 'Extracting...',
            company: 'Extracting...',
            location: '',
            salary: '',
            jobType: '',
            remoteType: '',
            postedDate: '',
            deadline: '',
            applicationStatus: 'Researching',
            statusHistory: [{
              status: 'Researching',
              timestamp: new Date().toISOString()
            }],
            checklist: initializeAllChecklists(),
            content: '',
            rawDescription: response.rawText,
            aboutJob: '',
            aboutCompany: '',
            responsibilities: '',
            requirements: '',
            isExtracting: true, // Flag to track extraction in progress
            updatedAt: new Date().toISOString()
          };
          
          const result = await chrome.storage.local.get(['jobs']);
          const jobs = result.jobs || {};
          jobs[jobId] = minimalJob;
          await chrome.storage.local.set({ 
            jobs: jobs,
            jobInFocus: jobId 
          });
          
          showStatus('✨ Starting extraction...', 'success');
          
          // Send to background for streaming (wait for acknowledgment)
          await chrome.runtime.sendMessage({
            action: 'streamExtractJob',
            jobId: jobId,
            rawText: response.rawText,
            llmSettings: llmSettings
          }).catch(err => {
            console.error('[Popup] Failed to send streaming message:', err);
          });
          
          showStatus('✨ Extraction in progress! Check side panel.', 'success');
          
          // Close popup after ensuring message was received
          setTimeout(() => {
            window.close();
          }, 300);
        } else {
          throw new Error('Failed to start streaming extraction after injecting content script');
        }
      }
    } else {
      showStatus('LLM endpoint not configured. Please configure settings first.', 'error');
    }
  } catch (error) {
    console.error('Error extracting job data:', error);
    showStatus('Error: ' + error.message + '. Try refreshing the page and clicking the extension again.', 'error');
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = 'Extract Job Data';
  }
}

// Save extracted job immediately
async function saveExtractedJob(jobData, usedLlm) {
  // Remove extraction note if present
  if (jobData.extractionNote) {
    delete jobData.extractionNote;
  }

  // Validate required fields
  if (!jobData.jobTitle || !jobData.company) {
    throw new Error('Job Title and Company are required fields.');
  }

  try {
    // Get existing jobs from storage (object format)
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};

    // Check for duplicate by URL
    let existingJobId = null;
    if (jobData.url) {
      existingJobId = Object.keys(jobs).find(id => {
        const job = jobs[id];
        return job.url && normalizeUrl(job.url) === normalizeUrl(jobData.url);
      });
    }
    
    if (existingJobId) {
      // Update existing job - preserve user's application tracking data
      const existingJob = jobs[existingJobId];
      const updatedJob = {
        id: existingJobId,
        ...jobData,
        applicationStatus: existingJob.applicationStatus || 'Researching',
        statusHistory: existingJob.statusHistory || [{
          status: 'Researching',
          timestamp: new Date().toISOString()
        }],
        checklist: existingJob.checklist || initializeAllChecklists(),
        updatedAt: new Date().toISOString()
      };
      
      jobs[existingJobId] = updatedJob;
      
      // Update jobs and set as jobInFocus
      await chrome.storage.local.set({ 
        jobs: jobs,
        jobInFocus: existingJobId 
      });
      
      console.log('Job updated:', existingJobId);
    } else {
      // New job - generate ID and add default status tracking
      const jobId = generateJobId();
      const newJob = {
        id: jobId,
        ...jobData,
        applicationStatus: 'Researching',
        statusHistory: [{
          status: 'Researching',
          timestamp: new Date().toISOString()
        }],
        checklist: initializeAllChecklists(),
        updatedAt: new Date().toISOString()
      };
      
      jobs[jobId] = newJob;
      
      // Save jobs and set as jobInFocus
      await chrome.storage.local.set({ 
        jobs: jobs,
        jobInFocus: jobId 
      });
      
      console.log('New job saved:', jobId);
    }
  } catch (error) {
    console.error('Error saving job:', error);
    throw error;
  }
}

// Open side panel
async function openSidePanel(closePopup = true) {
  try {
    const currentWindow = await chrome.windows.getCurrent();
    await chrome.sidePanel.open({ windowId: currentWindow.id });
    console.log('Side panel opened');
    
    // Close popup after opening side panel (only if requested)
    if (closePopup) {
      setTimeout(() => {
        window.close();
      }, 100);
    }
  } catch (error) {
    console.error('Error opening side panel:', error);
    showStatus('Could not open side panel. Try using Ctrl+Shift+H.', 'error');
  }
}

// Check if current page is extractable (disable button on internal pages)
async function checkIfExtractable() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const extractBtn = document.getElementById('extractBtn');
    
    // Disable extraction on Chrome internal pages and extension pages (including job-details.html)
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      extractBtn.disabled = true;
      extractBtn.title = 'Cannot extract from this page';
      
      // Show info message if on viewer page
      if (tab.url && tab.url.includes('job-details.html')) {
        showStatus('You are viewing your saved jobs. Navigate to a job posting to extract data.', 'info');
      }
    } else {
      extractBtn.disabled = false;
      extractBtn.title = '';
    }
  } catch (error) {
    console.error('Error checking if page is extractable:', error);
  }
}

// Settings Management
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['llmSettings']);
    const settings = result.llmSettings || {
      endpoint: 'http://localhost:1234/v1/chat/completions',
      modelsEndpoint: 'http://localhost:1234/v1/models',
      model: '',
      maxTokens: 2000,
      temperature: 0.3
    };

    document.getElementById('llmEndpoint').value = settings.endpoint;
    document.getElementById('llmModel').value = settings.model || '';
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  try {
    const settings = {
      endpoint: document.getElementById('llmEndpoint').value.trim() || 'http://localhost:1234/v1/chat/completions',
      modelsEndpoint: 'http://localhost:1234/v1/models',
      model: document.getElementById('llmModel').value.trim(),
      maxTokens: 2000,
      temperature: 0.3
    };

    await chrome.storage.local.set({ llmSettings: settings });
    showStatus('Settings saved successfully!', 'success');
    
    // Hide settings panel after saving
    setTimeout(() => {
      document.getElementById('settingsSection').classList.add('hidden');
    }, 1000);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Error saving settings: ' + error.message, 'error');
  }
}

function toggleSettings() {
  const settingsSection = document.getElementById('settingsSection');
  settingsSection.classList.toggle('hidden');
}

async function testLlmConnection() {
  const testBtn = document.getElementById('testLlmBtn');
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';

  try {
    const endpoint = document.getElementById('llmEndpoint').value.trim() || 'http://localhost:1234/v1/chat/completions';
    const model = document.getElementById('llmModel').value.trim();

    const requestBody = {
      model: model || 'local-model',
      messages: [
        { role: 'user', content: 'Hello, this is a test message.' }
      ],
      max_tokens: 50,
      temperature: 0.7
    };

    // Use background script to make the request
    const response = await chrome.runtime.sendMessage({
      action: 'callLLM',
      endpoint: endpoint,
      requestBody: requestBody
    });

    if (response.success) {
      showStatus('✓ Connection successful! LLM is responding.', 'success');
    } else {
      showStatus(`Connection failed: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('Error testing LLM:', error);
    showStatus('Connection failed: ' + error.message + '. Make sure LM Studio is running.', 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}
