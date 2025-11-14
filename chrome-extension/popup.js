// Popup script that handles UI interactions and data management

let currentJobData = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await updateJobCount();
  await loadSettings();
  await checkCurrentPageDuplicate();
  await checkIfExtractable();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('extractBtn').addEventListener('click', extractJobData);
  document.getElementById('jobForm').addEventListener('submit', saveJobData);
  document.getElementById('cancelBtn').addEventListener('click', cancelEdit);
  document.getElementById('viewJobsBtn').addEventListener('click', viewAllJobs);
  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllJobs);
  document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('testLlmBtn').addEventListener('click', testLlmConnection);
}

async function extractJobData() {
  const extractBtn = document.getElementById('extractBtn');
  extractBtn.disabled = true;
  extractBtn.textContent = 'Extracting...';

  try {
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
      enabled: false,
      endpoint: 'http://localhost:1234/v1/chat/completions',
      model: ''
    };

    // Override with current checkbox state
    llmSettings.enabled = document.getElementById('useLlmCheckbox').checked;

    try {
      // Try to send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractJobData',
        llmSettings: llmSettings
      });

      if (response && response.success) {
        currentJobData = response.data;
        populateForm(response.data);
        showDataSection();
        
        // Show different message if LLM was used
        if (response.usedLlm) {
          showStatus('Job data extracted with LLM! Review and edit before saving.', 'success');
        } else if (response.data.extraction_note) {
          // Show warning if LLM failed but DOM extraction succeeded
          showStatus('⚠️ ' + response.data.extraction_note, 'warning');
          // Remove the note from the data so it's not saved
          delete response.data.extraction_note;
        } else {
          showStatus('Job data extracted! Review and edit before saving.', 'info');
        }
      } else {
        showStatus('Failed to extract job data. Make sure you are on a job posting page.', 'error');
      }
    } catch (error) {
      // Content script not loaded - inject it manually
      console.log('Content script not found, injecting manually...');
      
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
        currentJobData = response.data;
        populateForm(response.data);
        showDataSection();
        
        // Show different message if LLM was used
        if (response.usedLlm) {
          showStatus('Job data extracted with LLM! Review and edit before saving.', 'success');
        } else {
          showStatus('Job data extracted! Review and edit before saving.', 'info');
        }
      } else {
        showStatus('Failed to extract job data. Make sure you are on a job posting page.', 'error');
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

function populateForm(data) {
  document.getElementById('jobTitle').value = data.job_title || '';
  document.getElementById('company').value = data.company || '';
  document.getElementById('location').value = data.location || '';
  document.getElementById('salary').value = data.salary || '';
  document.getElementById('jobType').value = data.job_type || '';
  document.getElementById('remoteType').value = data.remote_type || '';
  document.getElementById('postedDate').value = data.posted_date || '';
  document.getElementById('url').value = data.url || '';
  document.getElementById('source').value = data.source || '';
  document.getElementById('rawDescription').value = data.raw_description || '';
  document.getElementById('aboutJob').value = data.about_job || '';
  document.getElementById('aboutCompany').value = data.about_company || '';
  document.getElementById('responsibilities').value = data.responsibilities || '';
  document.getElementById('requirements').value = data.requirements || '';
}

function showDataSection() {
  document.getElementById('dataSection').classList.remove('hidden');
}

function hideDataSection() {
  document.getElementById('dataSection').classList.add('hidden');
}

// Check if a job with the same URL already exists
async function checkDuplicateJob(url) {
  if (!url) return false;
  
  try {
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || [];
    
    // Normalize URLs for comparison (remove trailing slashes, query params that might differ)
    const normalizeUrl = (u) => {
      try {
        const urlObj = new URL(u);
        // Keep protocol, host, and pathname, ignore search params and hash
        return urlObj.origin + urlObj.pathname.replace(/\/$/, '');
      } catch {
        return u.trim().toLowerCase();
      }
    };
    
    const normalizedUrl = normalizeUrl(url);
    return jobs.some(job => normalizeUrl(job.url) === normalizedUrl);
  } catch (error) {
    console.error('Error checking for duplicate job:', error);
    return false;
  }
}

// Check if the current page URL is already saved (runs on popup load)
async function checkCurrentPageDuplicate() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Skip Chrome internal pages
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    const isDuplicate = await checkDuplicateJob(tab.url);
    const duplicateBadge = document.getElementById('duplicateWarning');
    
    if (isDuplicate && duplicateBadge) {
      duplicateBadge.classList.remove('hidden');
    } else if (duplicateBadge) {
      duplicateBadge.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error checking current page for duplicate:', error);
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

async function saveJobData(event) {
  event.preventDefault();

  const jobData = {
    job_title: document.getElementById('jobTitle').value.trim(),
    company: document.getElementById('company').value.trim(),
    location: document.getElementById('location').value.trim(),
    salary: document.getElementById('salary').value.trim(),
    job_type: document.getElementById('jobType').value.trim(),
    remote_type: document.getElementById('remoteType').value.trim(),
    posted_date: document.getElementById('postedDate').value.trim(),
    url: document.getElementById('url').value.trim(),
    source: document.getElementById('source').value.trim(),
    raw_description: document.getElementById('rawDescription').value.trim(),
    about_job: document.getElementById('aboutJob').value.trim(),
    about_company: document.getElementById('aboutCompany').value.trim(),
    responsibilities: document.getElementById('responsibilities').value.trim(),
    requirements: document.getElementById('requirements').value.trim(),
    extracted_at: currentJobData?.extracted_at || new Date().toISOString(),
    saved_at: new Date().toISOString()
  };

  // Validate required fields
  if (!jobData.job_title || !jobData.company) {
    showStatus('Job Title and Company are required fields.', 'error');
    return;
  }

  try {
    // Get existing jobs from storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || [];

    // Check for duplicate (warn but allow saving)
    const isDuplicate = await checkDuplicateJob(jobData.url);
    if (isDuplicate) {
      const confirmSave = confirm('This job URL already exists in your saved jobs. Do you want to save it again anyway?');
      if (!confirmSave) {
        showStatus('Save cancelled - job already exists.', 'info');
        return;
      }
    }

    // Add new job
    jobs.push(jobData);

    // Save back to storage
    await chrome.storage.local.set({ jobs });

    showStatus('Job saved successfully!', 'success');
    hideDataSection();
    await updateJobCount();

    // Reset form
    document.getElementById('jobForm').reset();
    currentJobData = null;

  } catch (error) {
    console.error('Error saving job:', error);
    showStatus('Error saving job: ' + error.message, 'error');
  }
}

function cancelEdit() {
  hideDataSection();
  document.getElementById('jobForm').reset();
  currentJobData = null;
  hideStatus();
}

async function updateJobCount() {
  try {
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || [];
    document.getElementById('jobCount').textContent = jobs.length;
    
    // Show saved section if there are jobs
    if (jobs.length > 0) {
      document.getElementById('savedSection').classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error updating job count:', error);
  }
}

async function viewAllJobs() {
  try {
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || [];

    if (jobs.length === 0) {
      showStatus('No saved jobs yet.', 'info');
      return;
    }

    // Open a new tab with the jobs viewer
    chrome.tabs.create({ url: 'viewer.html' });
  } catch (error) {
    console.error('Error viewing jobs:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

async function exportJSON() {
  try {
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || [];

    if (jobs.length === 0) {
      showStatus('No jobs to export.', 'info');
      return;
    }

    const dataStr = JSON.stringify(jobs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `jobs-export-${timestamp}.json`;

    // Download the file
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    showStatus(`Exporting ${jobs.length} jobs as JSON...`, 'success');
  } catch (error) {
    console.error('Error exporting JSON:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

async function exportCSV() {
  try {
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || [];

    if (jobs.length === 0) {
      showStatus('No jobs to export.', 'info');
      return;
    }

    // Create CSV headers
    const headers = ['Job Title', 'Company', 'Location', 'Salary', 'Job Type', 'Remote Type', 'Posted Date', 'URL', 'Source', 'Raw Description', 'About the Job', 'About the Company', 'Responsibilities', 'Requirements', 'Extracted At', 'Saved At'];
    
    // Create CSV rows
    const rows = jobs.map(job => [
      escapeCsvValue(job.job_title),
      escapeCsvValue(job.company),
      escapeCsvValue(job.location),
      escapeCsvValue(job.salary),
      escapeCsvValue(job.job_type),
      escapeCsvValue(job.remote_type),
      escapeCsvValue(job.posted_date),
      escapeCsvValue(job.url),
      escapeCsvValue(job.source),
      escapeCsvValue(job.raw_description),
      escapeCsvValue(job.about_job),
      escapeCsvValue(job.about_company),
      escapeCsvValue(job.responsibilities),
      escapeCsvValue(job.requirements),
      escapeCsvValue(job.extracted_at),
      escapeCsvValue(job.saved_at)
    ]);

    // Combine headers and rows
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `jobs-export-${timestamp}.csv`;

    // Download the file
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    showStatus(`Exporting ${jobs.length} jobs as CSV...`, 'success');
  } catch (error) {
    console.error('Error exporting CSV:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

function escapeCsvValue(value) {
  if (!value) return '';
  const str = String(value);
  // If the value contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function clearAllJobs() {
  if (!confirm('Are you sure you want to delete all saved jobs? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.set({ jobs: [] });
    await updateJobCount();
    document.getElementById('savedSection').classList.add('hidden');
    showStatus('All jobs cleared.', 'success');
  } catch (error) {
    console.error('Error clearing jobs:', error);
    showStatus('Error: ' + error.message, 'error');
  }
}

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => hideStatus(), 5000);
  }
}

function hideStatus() {
  document.getElementById('status').classList.add('hidden');
}

// Settings Management
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['llmSettings']);
    const settings = result.llmSettings || {
      enabled: false,
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
