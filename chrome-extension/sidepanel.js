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
        
        // Check if user is currently editing a field
        const activeElement = document.activeElement;
        const isEditing = activeElement && (
          activeElement.contentEditable === 'true' ||
          activeElement.classList.contains('inline-input') ||
          activeElement.classList.contains('inline-select')
        );
        
        if (isEditing) {
          console.log('[Side Panel] User is editing, deferring reload');
          // Defer reload until after the current edit is done
          activeElement.addEventListener('blur', () => {
            // Add small delay to allow save to complete
            setTimeout(() => loadJobInFocus(), 100);
          }, { once: true });
        } else {
          loadJobInFocus();
        }
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

    // Don't reload if user is currently in the edit form
    const editForm = document.getElementById('editForm');
    if (editForm && !editForm.classList.contains('hidden')) {
      console.log('[Side Panel] User is in edit form, skipping reload');
      return;
    }

    if (!jobInFocusId || !jobs[jobInFocusId]) {
      // No job in focus or job was deleted - show empty state
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

// Display job details with inline editing
function displayJob(job) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('editForm').classList.add('hidden');
  document.getElementById('jobDetails').classList.remove('hidden');
  document.getElementById('footer').classList.remove('hidden');

  const jobContent = document.getElementById('jobContent');
  jobContent.innerHTML = `
    <div class="job-header">
      <h2 class="job-title editable-field" data-field="job_title" contenteditable="true">
        ${escapeHtml(job.job_title || 'Untitled Position')}
        <span class="edit-icon">✏️</span>
      </h2>
      <p class="job-company-label">at 
        <span class="editable-field" data-field="company" contenteditable="true">
          ${escapeHtml(job.company || 'Unknown Company')}
          <span class="edit-icon">✏️</span>
        </span>
      </p>
    </div>

    <div class="job-meta">
      ${createEditableMetaItem('📍', job.location, 'location', 'text', 'Location')}
      ${createEditableMetaItem('💰', job.salary, 'salary', 'text', 'Salary')}
      ${createEditableMetaItem('🏢', job.job_type, 'job_type', 'text', 'Job Type')}
      ${createEditableSelectMetaItem('🏠', job.remote_type, 'remote_type', ['On-site', 'Remote', 'Hybrid'], 'Remote Type')}
      ${createEditableDateMetaItem('🗓️', job.posted_date, 'posted_date', 'Posted')}
      ${createEditableDateMetaItem('⏰', job.deadline, 'deadline', 'Deadline')}
      ${createEditableSelectMetaItem('📊', job.application_status, 'application_status', ['Saved', 'Applying', 'Applied', 'Interview', 'Offer', 'Rejected', 'Accepted', 'Declined'], 'Status')}
    </div>

    ${job.url ? `<div class="job-url"><a href="${escapeHtml(job.url)}" target="_blank">🔗 View Original Posting</a></div>` : ''}

    <div class="job-sections">
      ${createEditableSection('About the Job', job.about_job, 'about_job')}
      ${createEditableSection('About the Company', job.about_company, 'about_company')}
      ${createEditableSection('Responsibilities', job.responsibilities, 'responsibilities')}
      ${createEditableSection('Requirements', job.requirements, 'requirements')}
      ${createEditableSection('Notes', job.notes, 'notes')}
      ${createEditableSection('Narrative Strategy', job.narrative_strategy, 'narrative_strategy')}
    </div>
  `;
  
  // Attach inline editing event listeners
  attachInlineEditingListeners();
}

// Create editable meta item (text input)
function createEditableMetaItem(icon, value, field, type, label) {
  if (!value && !label) return '';
  const displayValue = value || `(Add ${label})`;
  return `
    <div class="meta-item editable-meta" data-field="${field}" data-type="${type}">
      <span class="meta-icon">${icon}</span>
      <span class="meta-value">${escapeHtml(displayValue)}</span>
      <span class="edit-icon">✏️</span>
      <span class="save-indicator"></span>
    </div>
  `;
}

// Create editable meta item (date input)
function createEditableDateMetaItem(icon, value, field, label) {
  if (!value && !label) return '';
  const displayValue = value ? formatDate(value) : `(Add ${label})`;
  return `
    <div class="meta-item editable-meta" data-field="${field}" data-type="date" data-raw-value="${escapeHtml(value || '')}">
      <span class="meta-icon">${icon}</span>
      <span class="meta-label">${label}:</span>
      <span class="meta-value">${displayValue}</span>
      <span class="edit-icon">✏️</span>
      <span class="save-indicator"></span>
    </div>
  `;
}

// Create editable meta item (select dropdown)
function createEditableSelectMetaItem(icon, value, field, options, label) {
  if (!value && !label) return '';
  const displayValue = value || `(Select ${label})`;
  const optionsJson = JSON.stringify(options).replace(/"/g, '&quot;');
  return `
    <div class="meta-item editable-meta" data-field="${field}" data-type="select" data-options="${optionsJson}">
      <span class="meta-icon">${icon}</span>
      <span class="meta-label">${label}:</span>
      <span class="meta-value">${escapeHtml(displayValue)}</span>
      <span class="edit-icon">✏️</span>
      <span class="save-indicator"></span>
    </div>
  `;
}

// Create editable section (textarea)
function createEditableSection(title, content, field) {
  const displayContent = content || '(Click to add...)';
  const hasContent = !!content;
  
  return `
    <div class="job-section editable-section" data-field="${field}">
      <h3 class="section-title">
        ${title}
        <span class="edit-icon">✏️</span>
        <span class="save-indicator"></span>
      </h3>
      <div class="section-content ${hasContent ? '' : 'empty-content'}" contenteditable="true">
${escapeHtml(displayContent)}</div>
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

// Attach inline editing event listeners
function attachInlineEditingListeners() {
  // Handle contenteditable fields (job title, company name, sections)
  const editableFields = document.querySelectorAll('[contenteditable="true"]');
  editableFields.forEach(field => {
    // Show edit indicator on hover
    field.addEventListener('mouseenter', () => {
      field.classList.add('editing-hover');
    });
    
    field.addEventListener('mouseleave', () => {
      field.classList.remove('editing-hover');
    });
    
    // Handle focus
    field.addEventListener('focus', () => {
      field.classList.add('editing-active');
      // Store original value for comparison
      field.dataset.originalValue = field.textContent.trim();
    });
    
    // Handle blur (save)
    field.addEventListener('blur', async () => {
      field.classList.remove('editing-active');
      const newValue = field.textContent.trim();
      const originalValue = field.dataset.originalValue;
      
      // Only save if value changed
      if (newValue !== originalValue) {
        const fieldName = field.dataset.field;
        if (fieldName) {
          await saveFieldValue(fieldName, newValue, field);
        }
      }
    });
    
    // Prevent Enter key from creating new lines in single-line fields
    if (field.classList.contains('job-title') || field.dataset.field === 'company') {
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          field.blur();
        }
      });
    }
  });
  
  // Handle meta items (location, salary, job_type, dates, selects)
  const metaItems = document.querySelectorAll('.editable-meta');
  metaItems.forEach(item => {
    item.addEventListener('click', () => {
      handleMetaItemEdit(item);
    });
  });
}

// Handle editing of meta items (converts to input/select)
function handleMetaItemEdit(metaItem) {
  const field = metaItem.dataset.field;
  const type = metaItem.dataset.type;
  const valueSpan = metaItem.querySelector('.meta-value');
  const currentValue = currentJob[field] || '';
  
  if (type === 'select') {
    // Create select dropdown
    const options = JSON.parse(metaItem.dataset.options.replace(/&quot;/g, '"'));
    const select = document.createElement('select');
    select.className = 'inline-select';
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '(None)';
    select.appendChild(emptyOption);
    
    // Add options
    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      if (opt === currentValue) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    
    // Replace value span with select
    const originalDisplay = valueSpan.textContent;
    valueSpan.textContent = '';
    valueSpan.appendChild(select);
    select.focus();
    
    // Handle selection
    const handleSelect = async () => {
      const newValue = select.value;
      await saveFieldValue(field, newValue, metaItem);
      valueSpan.textContent = newValue || `(Select ${metaItem.querySelector('.meta-label').textContent.replace(':', '')})`;
    };
    
    select.addEventListener('change', handleSelect);
    select.addEventListener('blur', () => {
      if (valueSpan.contains(select)) {
        valueSpan.textContent = originalDisplay;
      }
    });
    
  } else if (type === 'date') {
    // Create date input
    const input = document.createElement('input');
    input.type = 'date';
    input.className = 'inline-input';
    input.value = isoToDateInput(currentValue);
    
    // Replace value span with input
    const originalDisplay = valueSpan.textContent;
    valueSpan.textContent = '';
    valueSpan.appendChild(input);
    input.focus();
    
    // Handle blur (save)
    input.addEventListener('blur', async () => {
      const newValue = dateInputToISO(input.value);
      await saveFieldValue(field, newValue, metaItem);
      valueSpan.textContent = newValue ? formatDate(newValue) : `(Add ${metaItem.querySelector('.meta-label').textContent.replace(':', '')})`;
    });
    
  } else {
    // Create text input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-input';
    input.value = currentValue;
    
    // Replace value span with input
    const originalDisplay = valueSpan.textContent;
    valueSpan.textContent = '';
    valueSpan.appendChild(input);
    input.focus();
    input.select();
    
    // Handle blur (save)
    input.addEventListener('blur', async () => {
      const newValue = input.value.trim();
      await saveFieldValue(field, newValue, metaItem);
      valueSpan.textContent = newValue || `(Add ${metaItem.dataset.field})`;
    });
    
    // Handle Enter key
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
  }
}

// Save field value to storage
async function saveFieldValue(field, value, element) {
  if (!currentJobId || !currentJob) {
    showError('No job in focus to update');
    return;
  }
  
  // Show saving indicator
  const saveIndicator = element.querySelector('.save-indicator') || element.parentElement.querySelector('.save-indicator');
  if (saveIndicator) {
    saveIndicator.textContent = '💾';
    saveIndicator.classList.add('saving');
  }
  
  try {
    // Update current job object
    currentJob[field] = value;
    currentJob.updated_at = new Date().toISOString();
    
    // Get all jobs from storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    
    // Update the job
    jobs[currentJobId] = currentJob;
    
    // Save back to storage
    await chrome.storage.local.set({ jobs: jobs });
    
    console.log(`[Side Panel] Updated field ${field}:`, value);
    
    // Show success indicator
    if (saveIndicator) {
      saveIndicator.textContent = '✓';
      saveIndicator.classList.remove('saving');
      saveIndicator.classList.add('saved');
      
      // Hide indicator after 2 seconds
      setTimeout(() => {
        saveIndicator.classList.remove('saved');
        saveIndicator.textContent = '';
      }, 2000);
    }
    
  } catch (error) {
    console.error('[Side Panel] Error saving field:', error);
    showError('Failed to save changes');
    
    // Show error indicator
    if (saveIndicator) {
      saveIndicator.textContent = '✗';
      saveIndicator.classList.remove('saving');
      saveIndicator.classList.add('error');
      
      setTimeout(() => {
        saveIndicator.classList.remove('error');
        saveIndicator.textContent = '';
      }, 2000);
    }
  }
}
