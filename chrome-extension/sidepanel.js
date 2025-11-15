// Side panel script that manages the job in focus

let currentJobId = null;
let currentJob = null;
let extractedData = null;

// Initialize side panel
document.addEventListener('DOMContentLoaded', async () => {
  await loadJobInFocus();
  setupEventListeners();
  setupStorageListener();
});

function setupEventListeners() {
  // Extract buttons
  document.getElementById('extractBtnEmpty')?.addEventListener('click', extractJobData);
  document.getElementById('extractBtnSubtle')?.addEventListener('click', extractJobData);
  document.getElementById('extractBtnForm')?.addEventListener('click', extractJobData);
  
  // Form buttons
  document.getElementById('jobForm')?.addEventListener('submit', saveJobData);
  document.getElementById('cancelBtn')?.addEventListener('click', cancelEdit);
  
  // Footer buttons
  document.getElementById('viewAllJobsBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'viewer.html' });
  });
  
  document.getElementById('editResumeBtn')?.addEventListener('click', () => {
    chrome.tabs.create({ url: 'resume.html' });
  });
}

// Setup storage change listener for multi-tab sync
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.jobInFocus || changes.jobs) {
        console.log('[Side Panel] Storage changed, reloading job in focus');
        loadJobInFocus();
      }
    }
  });
}

// Load the job currently in focus
async function loadJobInFocus() {
  try {
    const result = await chrome.storage.local.get(['jobInFocus', 'jobs']);
    const jobInFocusId = result.jobInFocus;
    const jobs = result.jobs || {};

    if (!jobInFocusId || !jobs[jobInFocusId]) {
      // No job in focus - show empty state
      showEmptyState();
      return;
    }

    // Load and display the job
    currentJobId = jobInFocusId;
    currentJob = jobs[jobInFocusId];
    displayJob(currentJob);
  } catch (error) {
    console.error('[Side Panel] Error loading job in focus:', error);
    showEmptyState();
  }
}

// Show empty state (no job in focus)
function showEmptyState() {
  document.getElementById('emptyState').classList.remove('hidden');
  document.getElementById('editForm').classList.add('hidden');
  document.getElementById('jobDetails').classList.add('hidden');
  document.getElementById('footer').classList.add('hidden');
  currentJobId = null;
  currentJob = null;
}

// Show edit form with extracted data
function showEditForm(data) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('editForm').classList.remove('hidden');
  document.getElementById('jobDetails').classList.add('hidden');
  document.getElementById('footer').classList.add('hidden');
  
  populateForm(data);
}

// Display job details
function displayJob(job) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('editForm').classList.add('hidden');
  document.getElementById('jobDetails').classList.remove('hidden');
  document.getElementById('footer').classList.remove('hidden');

  const jobContent = document.getElementById('jobContent');
  jobContent.innerHTML = `
    <div class="job-header">
      <h2 class="job-title">${escapeHtml(job.job_title || 'Untitled Position')}</h2>
      <p class="job-company">at ${escapeHtml(job.company || 'Unknown Company')}</p>
    </div>

    <div class="job-meta">
      ${job.location ? `<div class="meta-item">📍 ${escapeHtml(job.location)}</div>` : ''}
      ${job.salary ? `<div class="meta-item">💰 ${escapeHtml(job.salary)}</div>` : ''}
      ${job.job_type ? `<div class="meta-item">🏢 ${escapeHtml(job.job_type)}</div>` : ''}
      ${job.remote_type ? `<div class="meta-item">${escapeHtml(job.remote_type)}</div>` : ''}
      ${job.posted_date ? `<div class="meta-item">🗓️ Posted: ${formatDate(job.posted_date)}</div>` : ''}
      ${job.deadline ? `<div class="meta-item">⏰ Deadline: ${formatDate(job.deadline)}</div>` : ''}
      ${job.application_status ? `<div class="meta-item">📊 Status: ${escapeHtml(job.application_status)}</div>` : ''}
    </div>

    ${job.url ? `<div class="job-url"><a href="${escapeHtml(job.url)}" target="_blank">🔗 View Original Posting</a></div>` : ''}

    <div class="job-sections">
      ${createSection('About the Job', job.about_job)}
      ${createSection('About the Company', job.about_company)}
      ${createSection('Responsibilities', job.responsibilities)}
      ${createSection('Requirements', job.requirements)}
      ${createSection('Notes', job.notes, true)}
      ${createSection('Narrative Strategy', job.narrative_strategy, true)}
    </div>
  `;
}

// Create a collapsible section with edit indicator
function createSection(title, content, isEditable = false) {
  if (!content && !isEditable) return '';
  
  const displayContent = content || '(Click to add...)';
  const editIcon = '✏️';
  
  return `
    <div class="job-section">
      <h3 class="section-title">
        ${editIcon} ${title}
      </h3>
      <div class="section-content">
        ${escapeHtml(displayContent)}
      </div>
    </div>
  `;
}

// Extract job data from current page
async function extractJobData() {
  const btnEmpty = document.getElementById('extractBtnEmpty');
  const btnSubtle = document.getElementById('extractBtnSubtle');
  const btnForm = document.getElementById('extractBtnForm');
  
  // Find which button was clicked
  let activeBtn = null;
  if (btnEmpty && !btnEmpty.classList.contains('hidden')) activeBtn = btnEmpty;
  else if (btnSubtle && !btnSubtle.parentElement.classList.contains('hidden')) activeBtn = btnSubtle;
  else if (btnForm && !btnForm.parentElement.parentElement.classList.contains('hidden')) activeBtn = btnForm;
  
  if (!activeBtn) return;
  
  const originalText = activeBtn.textContent;
  activeBtn.disabled = true;
  activeBtn.textContent = 'Extracting...';

  try {
    // Get the active tab - for side panels, we need to query differently
    let tab;
    try {
      // First try: Get active tab in the current window
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
      
      // If that didn't work, try getting active tab in last focused window
      if (!tab) {
        const tabs2 = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tab = tabs2[0];
      }
    } catch (error) {
      console.error('[Side Panel] Error querying tabs:', error);
    }

    // Check if we have a valid tab
    if (!tab || !tab.url) {
      showError('Cannot access current tab. Make sure you have a tab open with a job posting.');
      return;
    }

    // Check if we can access this tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      showError('Cannot extract from Chrome internal pages. Please navigate to a job posting.');
      return;
    }

    // Get LLM settings
    const result = await chrome.storage.local.get(['llmSettings']);
    const llmSettings = result.llmSettings || {
      enabled: false,
      endpoint: 'http://localhost:1234/v1/chat/completions',
      model: ''
    };

    try {
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractJobData',
        llmSettings: llmSettings
      });

      if (response && response.success) {
        extractedData = response.data;
        showEditForm(response.data);
        
        // Show appropriate info message based on extraction method
        if (response.usedLlm) {
          showInfo('✨ Job extracted with LLM! Review and edit before saving.');
        } else if (response.data.extraction_note) {
          // LLM failed but DOM extraction succeeded - show warning
          showWarning(response.data.extraction_note);
          // Remove the note from data so it doesn't get saved
          delete response.data.extraction_note;
        } else {
          showInfo('Job data extracted! Review and edit before saving.');
        }
      } else {
        showError('Failed to extract job data. Make sure you are on a job posting page.');
      }
    } catch (error) {
      // Content script not loaded - inject it manually
      console.log('[Side Panel] Content script not found, injecting...');
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractJobData',
        llmSettings: llmSettings
      });

      if (response && response.success) {
        extractedData = response.data;
        showEditForm(response.data);
        
        if (response.usedLlm) {
          showInfo('✨ Job extracted with LLM! Review and edit before saving.');
        } else {
          showInfo('Job data extracted! Review and edit before saving.');
        }
      } else {
        showError('Failed to extract job data.');
      }
    }
  } catch (error) {
    console.error('[Side Panel] Extraction error:', error);
    showError('Error extracting job data: ' + error.message);
  } finally {
    activeBtn.disabled = false;
    activeBtn.textContent = originalText;
  }
}

// Populate form with extracted data
function populateForm(data) {
  document.getElementById('jobTitle').value = data.job_title || '';
  document.getElementById('company').value = data.company || '';
  document.getElementById('location').value = data.location || '';
  document.getElementById('salary').value = data.salary || '';
  document.getElementById('jobType').value = data.job_type || '';
  document.getElementById('remoteType').value = data.remote_type || '';
  
  // Convert ISO timestamps to YYYY-MM-DD format for date inputs
  document.getElementById('postedDate').value = isoToDateInput(data.posted_date) || '';
  document.getElementById('deadline').value = isoToDateInput(data.deadline) || '';
  
  document.getElementById('url').value = data.url || '';
  document.getElementById('source').value = data.source || '';
  document.getElementById('rawDescription').value = data.raw_description || '';
  document.getElementById('aboutJob').value = data.about_job || '';
  document.getElementById('aboutCompany').value = data.about_company || '';
  document.getElementById('responsibilities').value = data.responsibilities || '';
  document.getElementById('requirements').value = data.requirements || '';
  document.getElementById('notes').value = data.notes || '';
  document.getElementById('narrativeStrategy').value = data.narrative_strategy || '';
}

// Helper function to convert date string to YYYY-MM-DD for date input
function isoToDateInput(dateString) {
  if (!dateString) return '';
  
  // If it's already YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // If it's an ISO timestamp, extract the date part without timezone conversion
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
    return dateString.split('T')[0];
  }
  
  return '';
}

// Helper function to keep date input (YYYY-MM-DD) as-is
function dateInputToISO(dateString) {
  if (!dateString) return '';
  
  // Validate YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  return '';
}

// Save job data and set as job in focus
async function saveJobData(event) {
  event.preventDefault();

  const jobData = {
    job_title: document.getElementById('jobTitle').value.trim(),
    company: document.getElementById('company').value.trim(),
    location: document.getElementById('location').value.trim(),
    salary: document.getElementById('salary').value.trim(),
    job_type: document.getElementById('jobType').value.trim(),
    remote_type: document.getElementById('remoteType').value.trim(),
    posted_date: dateInputToISO(document.getElementById('postedDate').value.trim()),
    deadline: dateInputToISO(document.getElementById('deadline').value.trim()),
    url: document.getElementById('url').value.trim(),
    source: document.getElementById('source').value.trim(),
    raw_description: document.getElementById('rawDescription').value.trim(),
    about_job: document.getElementById('aboutJob').value.trim(),
    about_company: document.getElementById('aboutCompany').value.trim(),
    responsibilities: document.getElementById('responsibilities').value.trim(),
    requirements: document.getElementById('requirements').value.trim(),
    notes: document.getElementById('notes').value.trim(),
    narrative_strategy: document.getElementById('narrativeStrategy').value.trim()
  };

  // Validate required fields
  if (!jobData.job_title || !jobData.company) {
    showError('Job Title and Company are required fields.');
    return;
  }

  try {
    const jobId = generateJobId();
    const now = new Date().toISOString();
    
    const job = {
      id: jobId,
      ...jobData,
      application_status: 'Saved',
      status_history: [{
        status: 'Saved',
        timestamp: now
      }],
      updated_at: now
    };

    // Get existing jobs
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    
    // Save job
    jobs[jobId] = job;
    
    // Set as job in focus and save
    await chrome.storage.local.set({ 
      jobs: jobs,
      jobInFocus: jobId 
    });

    console.log('[Side Panel] Job saved and set as focus:', jobId);
    
    // Update UI
    currentJobId = jobId;
    currentJob = job;
    displayJob(job);
    
    showSuccess('✓ Job saved and set as focus!');
    
    // Clear extracted data
    extractedData = null;
  } catch (error) {
    console.error('[Side Panel] Error saving job:', error);
    showError('Error saving job: ' + error.message);
  }
}

// Cancel editing and return to previous state
function cancelEdit() {
  extractedData = null;
  document.getElementById('jobForm').reset();
  
  // Return to job details if we have a job in focus, otherwise empty state
  if (currentJobId && currentJob) {
    displayJob(currentJob);
  } else {
    showEmptyState();
  }
}

// Generate unique job ID
function generateJobId() {
  return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show success message
function showSuccess(message) {
  showToast(message, 'success');
}

// Show error message
function showError(message) {
  showToast(message, 'error');
}

// Show warning message
function showWarning(message) {
  showToast(message, 'warning');
}

// Show info message
function showInfo(message) {
  showToast(message, 'info');
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  // Auto-hide after 4 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}
