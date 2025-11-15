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
  // Footer buttons
  document.getElementById('viewAllJobsBtn')?.addEventListener('click', async () => {
    await chrome.tabs.create({ url: 'viewer.html' });
    // Close the side panel after opening viewer
    window.close();
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
    let jobInFocusId = result.jobInFocus;
    const jobs = result.jobs || {};

    // If no job in focus or job was deleted, but there are saved jobs
    if ((!jobInFocusId || !jobs[jobInFocusId]) && Object.keys(jobs).length > 0) {
      console.log('[Side Panel] No job in focus but jobs exist, setting newest job as focus');
      
      // Find the newest job (by updated_at timestamp)
      const jobEntries = Object.entries(jobs);
      jobEntries.sort((a, b) => {
        const timeA = new Date(a[1].updated_at || 0).getTime();
        const timeB = new Date(b[1].updated_at || 0).getTime();
        return timeB - timeA; // Descending order (newest first)
      });
      
      // Set the newest job as focus
      const newestJobId = jobEntries[0][0];
      jobInFocusId = newestJobId;
      await chrome.storage.local.set({ jobInFocus: newestJobId });
      console.log('[Side Panel] Set newest job as focus:', newestJobId);
    }

    if (!jobInFocusId || !jobs[jobInFocusId]) {
      // Still no job in focus - show empty state
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

// Display job details with inline editing
function displayJob(job) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('jobDetails').classList.remove('hidden');
  document.getElementById('footer').classList.remove('hidden');

  const jobContent = document.getElementById('jobContent');
  jobContent.innerHTML = `
    <div class="job-header">
      <h2 class="job-title editable-field" data-field="job_title" contenteditable="true">
        ${escapeHtml(job.job_title || 'Untitled Position')}
      </h2>
      <p class="job-company-label">at 
        <span class="editable-field" data-field="company" contenteditable="true">
          ${escapeHtml(job.company || 'Unknown Company')}
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
        <span class="save-indicator"></span>
      </h3>
      <div class="section-content ${hasContent ? '' : 'empty-content'}" contenteditable="true">
${escapeHtml(displayContent)}</div>
    </div>
  `;
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

// Format date for display
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    // If it's YYYY-MM-DD format, parse as local date to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day); // month is 0-indexed
      return date.toLocaleDateString();
    }
    // Otherwise parse normally (for ISO timestamps with time)
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
