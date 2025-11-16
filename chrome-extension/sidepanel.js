// Side panel script that manages the job in focus

import { EditableField } from './job-details/components/editable-field.js';
import { EditableMeta } from './job-details/components/editable-meta.js';
import { EditableSection } from './job-details/components/editable-section.js';

let currentJobId = null;
let currentJob = null;
let editableComponents = []; // Track all editable components for cleanup
let isSavingLocally = false; // Flag to prevent reload loops

// Initialize side panel
document.addEventListener('DOMContentLoaded', async () => {
  await loadJobInFocus();
  setupEventListeners();
  setupStorageListener();
});

function setupEventListeners() {
  // Footer buttons
  document.getElementById('viewAllJobsBtn')?.addEventListener('click', async () => {
    await chrome.tabs.create({ url: 'job-details.html' });
    // Close the side panel after opening viewer
    window.close();
  });

  // Restore backup button (in welcome state)
  document.getElementById('restoreBackupBtn')?.addEventListener('click', restoreBackup);
}

// Setup storage change listener for multi-tab sync
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.jobInFocus || changes.jobs) {
        console.log('[Side Panel] Storage changed, reloading job in focus');
        
        // Don't reload if this change was triggered by our own save
        if (isSavingLocally) {
          console.log('[Side Panel] Change triggered by local save, skipping reload');
          return;
        }
        
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
        const timeA = new Date(a[1].updatedAt || 0).getTime();
        const timeB = new Date(b[1].updatedAt || 0).getTime();
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

// Display job details with inline editing using editable components
function displayJob(job) {
  // Cleanup previous editable components
  cleanupEditableComponents();
  
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('jobDetails').classList.remove('hidden');
  document.getElementById('footer').classList.remove('hidden');

  const jobContent = document.getElementById('jobContent');
  
  // Create editable components
  const titleField = new EditableField({
    fieldName: 'jobTitle',
    value: job.jobTitle || 'Untitled Position',
    onSave: (fieldName, value) => saveFieldValue(fieldName, value),
    singleLine: true
  });
  
  const companyField = new EditableField({
    fieldName: 'company',
    value: job.company || 'Unknown Company',
    onSave: (fieldName, value) => saveFieldValue(fieldName, value),
    singleLine: true
  });
  
  // Create meta items
  const metaItems = [
    new EditableMeta({
      icon: '📍',
      label: 'Location',
      fieldName: 'location',
      value: job.location || '',
      type: 'text',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value)
    }),
    new EditableMeta({
      icon: '💰',
      label: 'Salary',
      fieldName: 'salary',
      value: job.salary || '',
      type: 'text',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value)
    }),
    new EditableMeta({
      icon: '🏢',
      label: 'Job Type',
      fieldName: 'jobType',
      value: job.jobType || '',
      type: 'text',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value)
    }),
    new EditableMeta({
      icon: '🏠',
      label: 'Remote Type',
      fieldName: 'remoteType',
      value: job.remoteType || '',
      type: 'select',
      options: ['On-site', 'Remote', 'Hybrid'],
      onSave: (fieldName, value) => saveFieldValue(fieldName, value)
    }),
    new EditableMeta({
      icon: '🗓️',
      label: 'Posted',
      fieldName: 'postedDate',
      value: job.postedDate || '',
      type: 'date',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value)
    }),
    new EditableMeta({
      icon: '⏰',
      label: 'Deadline',
      fieldName: 'deadline',
      value: job.deadline || '',
      type: 'date',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value)
    }),
    new EditableMeta({
      icon: '📊',
      label: 'Status',
      fieldName: 'applicationStatus',
      value: job.applicationStatus || '',
      type: 'select',
      options: ['Researching', 'Drafting', 'Awaiting Review', 'Interviewing', 'Deciding', 'Accepted', 'Rejected', 'Withdrawn'],
      onSave: (fieldName, value) => saveFieldValue(fieldName, value)
    })
  ];
  
  // Create sections
  const sections = [
    new EditableSection({
      fieldName: 'aboutJob',
      value: job.aboutJob || '',
      title: 'About the Job',
      placeholder: '(Click to add...)',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value),
      readonly: false
    }),
    new EditableSection({
      fieldName: 'aboutCompany',
      value: job.aboutCompany || '',
      title: 'About the Company',
      placeholder: '(Click to add...)',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value),
      readonly: false
    }),
    new EditableSection({
      fieldName: 'responsibilities',
      value: job.responsibilities || '',
      title: 'Responsibilities',
      placeholder: '(Click to add...)',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value),
      readonly: false
    }),
    new EditableSection({
      fieldName: 'requirements',
      value: job.requirements || '',
      title: 'Requirements',
      placeholder: '(Click to add...)',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value),
      readonly: false
    }),
    new EditableSection({
      fieldName: 'notes',
      value: job.notes || '',
      title: 'Notes',
      placeholder: '(Click to add...)',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value),
      readonly: false
    }),
    new EditableSection({
      fieldName: 'narrativeStrategy',
      value: job.narrativeStrategy || '',
      title: 'Narrative Strategy',
      placeholder: '(Click to add...)',
      onSave: (fieldName, value) => saveFieldValue(fieldName, value),
      readonly: false
    })
  ];
  
  // Track components for cleanup
  editableComponents = [titleField, companyField, ...metaItems, ...sections];
  
  // Render HTML
  jobContent.innerHTML = `
    <div class="job-header">
      <h2 class="job-title" data-field="jobTitle">
        ${titleField.render()}
      </h2>
      <p class="job-company-label">at 
        <span data-field="company">
          ${companyField.render()}
        </span>
      </p>
    </div>

    <div class="job-meta">
      ${metaItems.map(item => item.render()).join('')}
    </div>

    ${job.url ? `<div class="job-url"><a href="${escapeHtml(job.url)}" target="_blank">🔗 View Original Posting</a></div>` : ''}

    <div class="job-sections">
      ${sections.map(section => section.render()).join('')}
    </div>
  `;
  
  // Attach event listeners
  attachComponentListeners();
}

// Attach listeners for editable components
function attachComponentListeners() {
  // Attach title field
  const titleElement = document.querySelector('[data-field="jobTitle"]');
  if (titleElement) {
    const titleComponent = editableComponents.find(c => c.fieldName === 'jobTitle');
    if (titleComponent) {
      titleComponent.attachListeners(titleElement);
    }
  }
  
  // Attach company field
  const companyElement = document.querySelector('[data-field="company"]');
  if (companyElement) {
    const companyComponent = editableComponents.find(c => c.fieldName === 'company');
    if (companyComponent) {
      companyComponent.attachListeners(companyElement);
    }
  }
  
  // Attach meta items
  const metaElements = document.querySelectorAll('.editable-meta');
  metaElements.forEach(element => {
    const fieldName = element.dataset.field;
    const component = editableComponents.find(c => c.fieldName === fieldName);
    if (component) {
      component.attachListeners(element);
    }
  });
  
  // Attach sections
  const sectionElements = document.querySelectorAll('.editable-section');
  sectionElements.forEach(element => {
    const fieldName = element.dataset.field;
    const component = editableComponents.find(c => c.fieldName === fieldName);
    if (component) {
      component.attachListeners(element);
    }
  });
}

// Cleanup editable components
function cleanupEditableComponents() {
  editableComponents.forEach(component => {
    if (component.cleanup) {
      component.cleanup();
    }
  });
  editableComponents = [];
}

// Save field value to storage
async function saveFieldValue(field, value) {
  if (!currentJobId || !currentJob) {
    showError('No job in focus to update');
    return;
  }
  
  // Set flag to prevent reload loop
  isSavingLocally = true;
  
  try {
    // Update current job object
    currentJob[field] = value;
    currentJob.updatedAt = new Date().toISOString();
    
    // Get all jobs from storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    
    // Update the job
    jobs[currentJobId] = currentJob;
    
    // Save back to storage
    await chrome.storage.local.set({ jobs: jobs });
    
    console.log(`[Side Panel] Updated field ${field}:`, value);
    
    // Reset flag after a short delay (allow storage event to fire)
    setTimeout(() => {
      isSavingLocally = false;
    }, 200);
    
  } catch (error) {
    console.error('[Side Panel] Error saving field:', error);
    showError('Failed to save changes');
    isSavingLocally = false;
    throw error; // Re-throw so component can show error indicator
  }
}

// Restore backup function
async function restoreBackup() {
  try {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const backup = JSON.parse(text);

        // Validate backup structure
        if (!backup.version || !backup.data) {
          showError('Invalid backup file format.');
          return;
        }

        // Confirm overwrite
        const jobCount = Object.keys(backup.data.jobs || {}).length;
        const confirmMsg = `This will overwrite all your current data with the backup from ${new Date(backup.exportDate).toLocaleString()}.\n\nBackup contains ${jobCount} job(s).\n\nThis cannot be undone. Continue?`;
        
        if (!confirm(confirmMsg)) {
          return;
        }

        // Restore all data
        await chrome.storage.local.set({
          jobs: backup.data.jobs || {},
          masterResume: backup.data.masterResume || null,
          llmSettings: backup.data.llmSettings || null,
          jobInFocus: backup.data.jobInFocus || null
          // Note: Don't restore dataVersion - let migration determine it
        });

        console.log('[Side Panel] Backup restored successfully');
        showSuccess('Backup restored successfully! Reloading...');
        
        // Reload after a brief delay to show the success message
        // Migration will run automatically on next load
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (error) {
        console.error('[Side Panel] Error restoring backup:', error);
        showError('Error restoring backup: ' + error.message);
      }
    };

    // Trigger file picker
    input.click();
  } catch (error) {
    console.error('[Side Panel] Error in restore backup:', error);
    showError('Error in restore backup: ' + error.message);
  }
}
