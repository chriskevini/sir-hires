// Popup script - simplified launcher interface

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
      enabled: true, // Default to ON
      endpoint: 'http://localhost:1234/v1/chat/completions',
      model: ''
    };

    try {
      // Try to send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractJobData',
        llmSettings: llmSettings
      });

      if (response && response.success) {
        // Immediately save the job and set as focus
        await saveExtractedJob(response.data, response.usedLlm);
        
        // Show success message
        if (response.usedLlm) {
          showStatus('✨ Job extracted with LLM and saved!', 'success');
        } else if (response.data.extraction_note) {
          showStatus('⚠️ Job extracted and saved. ' + response.data.extraction_note, 'warning');
        } else {
          showStatus('✓ Job extracted and saved!', 'success');
        }
        
        // Close popup after a brief delay to show the message
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        showStatus('Failed to extract job data. Make sure you are on a job posting page.', 'error');
      }
    } catch (error) {
      // Content script not loaded - inject it manually
      console.log('Content script not found, injecting...');
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      // Wait a moment for the script to load
      await new Promise(resolve => setTimeout(resolve, 100));

      // Try again
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractJobData',
        llmSettings: llmSettings
      });

      if (response && response.success) {
        await saveExtractedJob(response.data, response.usedLlm);
        
        if (response.usedLlm) {
          showStatus('✨ Job extracted with LLM and saved!', 'success');
        } else {
          showStatus('✓ Job extracted and saved!', 'success');
        }
        
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        showStatus('Failed to extract job data.', 'error');
      }
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
  if (jobData.extraction_note) {
    delete jobData.extraction_note;
  }

  // Validate required fields
  if (!jobData.job_title || !jobData.company) {
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
        application_status: existingJob.application_status || 'Saved',
        status_history: existingJob.status_history || [{
          status: 'Saved',
          timestamp: new Date().toISOString()
        }],
        updated_at: new Date().toISOString()
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
        application_status: 'Saved',
        status_history: [{
          status: 'Saved',
          timestamp: new Date().toISOString()
        }],
        updated_at: new Date().toISOString()
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
    
    // Disable extraction on Chrome internal pages and extension pages (including viewer.html)
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      extractBtn.disabled = true;
      extractBtn.title = 'Cannot extract from this page';
      
      // Show info message if on viewer page
      if (tab.url && tab.url.includes('viewer.html')) {
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
      enabled: true, // Default to ON
      endpoint: 'http://localhost:1234/v1/chat/completions',
      model: ''
    };

    document.getElementById('useLlmCheckbox').checked = settings.enabled;
    document.getElementById('llmEndpoint').value = settings.endpoint;
    document.getElementById('llmModel').value = settings.model || '';
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function saveSettings() {
  try {
    const settings = {
      enabled: document.getElementById('useLlmCheckbox').checked,
      endpoint: document.getElementById('llmEndpoint').value.trim() || 'http://localhost:1234/v1/chat/completions',
      model: document.getElementById('llmModel').value.trim()
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
