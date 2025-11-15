// Side panel script that manages the job in focus

let currentJobId = null;
let currentJob = null;

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
  document.getElementById('jobDetails').classList.add('hidden');
  document.getElementById('footer').classList.add('hidden');
  currentJobId = null;
  currentJob = null;
}

// Display job details
function displayJob(job) {
  document.getElementById('emptyState').classList.add('hidden');
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
  const activeBtn = btnEmpty?.classList.contains('hidden') ? btnSubtle : btnEmpty;
  
  if (!activeBtn) return;
  
  const originalText = activeBtn.textContent;
  activeBtn.disabled = true;
  activeBtn.textContent = 'Extracting...';

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if we can access this tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
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
        // Save the job and set it as job in focus
        await saveExtractedJob(response.data);
        showSuccess('Job extracted and saved successfully!');
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
        await saveExtractedJob(response.data);
        showSuccess('Job extracted and saved successfully!');
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

// Save extracted job and set as job in focus
async function saveExtractedJob(jobData) {
  const jobId = generateJobId();
  const now = new Date().toISOString();
  
  const job = {
    id: jobId,
    ...jobData,
    application_status: jobData.application_status || 'Saved',
    status_history: [{
      status: jobData.application_status || 'Saved',
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
  // TODO: Implement toast notification
  console.log('[Side Panel] Success:', message);
}

// Show error message
function showError(message) {
  // TODO: Implement toast notification
  console.error('[Side Panel] Error:', message);
  alert(message);
}
