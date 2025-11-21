// Side panel script that manages the job in focus

import { MainView } from './job-details/main-view.js';
import { parseJobTemplate, mapMarkdownFieldsToJob } from './utils/job-parser.js';

let currentJobId = null;
let currentJob = null;
let mainView = null; // MainView instance for rendering state-based views
let isSavingLocally = false; // Flag to prevent reload loops

// Initialize side panel
document.addEventListener('DOMContentLoaded', async () => {
  // Create MainView instance
  mainView = new MainView();
  
  await loadJobInFocus();
  setupEventListeners();
  setupStorageListener();
  setupStreamListeners();
  setupViewEventListeners();
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

// Setup event listeners for view custom events
function setupViewEventListeners() {
  // Handle field save from view
  document.addEventListener('view:saveField', async (event) => {
    const { index, fieldName, value } = event.detail;
    await saveFieldValue(fieldName, value);
  });

  // Handle delete job from view
  document.addEventListener('view:deleteJob', async (event) => {
    const { index } = event.detail;
    await deleteJob();
  });
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

// Setup message listeners for streaming extraction
function setupStreamListeners() {
  console.log('[Side Panel] Setting up stream listeners');
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractionChunk') {
      handleExtractionChunk(message.jobId, message.chunk);
    } else if (message.action === 'extractionComplete') {
      handleExtractionComplete(message.jobId, message.fullContent);
    } else if (message.action === 'extractionError') {
      handleExtractionError(message.jobId, message.error);
    } else if (message.action === 'extractionCancelled') {
      handleExtractionCancelled(message.jobId);
    }
  });
}

// Handle streaming extraction chunk
async function handleExtractionChunk(jobId, chunk) {
  console.log('[Side Panel] Received chunk for job:', jobId, 'current:', currentJobId, 'chunk:', chunk.substring(0, 50) + '...');
  
  if (jobId !== currentJobId) {
    console.log('[Side Panel] Received chunk for different job, ignoring');
    return;
  }

  // Set flag to prevent reload loop
  isSavingLocally = true;

  try {
    // Get current job from storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const job = jobs[jobId];

    if (!job) {
      console.log('[Side Panel] Job deleted, ignoring extraction chunk');
      isSavingLocally = false;
      return;
    }

    // Append chunk to job.content field
    job.content = (job.content || '') + chunk;
    job.updatedAt = new Date().toISOString();

    // Save back to storage
    jobs[jobId] = job;
    await chrome.storage.local.set({ jobs });

    // Update local reference
    currentJob = job;

    // Update textarea directly (no full re-render for better performance)
    const textarea = document.querySelector('#jobEditor');
    if (textarea && textarea.hasAttribute('readonly')) {
      textarea.value = job.content;
      // Note: User controls scroll position, we don't auto-scroll
    } else {
      // Fallback: If textarea not found or not readonly, do full re-render
      displayJob(currentJob);
    }

    console.log('[Side Panel] Appended chunk to job.content:', chunk.length, 'chars');

    // Reset flag after a short delay
    setTimeout(() => {
      isSavingLocally = false;
    }, 50);

  } catch (error) {
    console.error('[Side Panel] Error handling extraction chunk:', error);
    isSavingLocally = false;
  }
}

// Handle extraction completion
async function handleExtractionComplete(jobId, fullContent) {
  console.log('[Side Panel] Extraction complete for job:', jobId);

  if (jobId !== currentJobId) {
    console.log('[Side Panel] Completed job is not in focus, skipping UI update');
    return;
  }

  // Set flag to prevent reload loop
  isSavingLocally = true;

  try {
    // Get current job from storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const job = jobs[jobId];

    if (!job) {
      console.log('[Side Panel] Job deleted, ignoring extraction completion');
      isSavingLocally = false;
      return;
    }

    // Set final content (in case chunks were missed)
    job.content = fullContent;
    job.updatedAt = new Date().toISOString();
    job.isExtracting = false; // Clear extraction flag

    // Parse the markdown content and map fields to job object
    const parsed = parseJobTemplate(fullContent);
    const mappedFields = mapMarkdownFieldsToJob(parsed.topLevelFields);
    
    // Update job with mapped fields
    Object.assign(job, mappedFields);
    
    console.log('[Side Panel] Updated job fields from markdown:', { 
      jobTitle: job.jobTitle, 
      company: job.company 
    });

    // Save back to storage
    jobs[jobId] = job;
    await chrome.storage.local.set({ jobs });

    // Update local reference
    currentJob = job;

    // Trigger MainView re-render
    displayJob(currentJob);

    // Show success toast
    showSuccess('Job extraction completed!');

    // Reset flag after a short delay
    setTimeout(() => {
      isSavingLocally = false;
    }, 200);

  } catch (error) {
    console.error('[Side Panel] Error handling extraction completion:', error);
    isSavingLocally = false;
  }
}

// Handle extraction error
async function handleExtractionError(jobId, errorMessage) {
  console.error('[Side Panel] Extraction error for job:', jobId, errorMessage);

  if (jobId !== currentJobId) {
    console.log('[Side Panel] Error for different job, skipping UI update');
    return;
  }

  // Set flag to prevent reload loop
  isSavingLocally = true;

  try {
    // Get current job from storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const job = jobs[jobId];

    if (!job) {
      console.log('[Side Panel] Job deleted, ignoring extraction error');
      isSavingLocally = false;
      return;
    }

    // Update job with error marker in content
    // ResearchingView will display this in the validation panel
    job.content = job.content || '';
    job.extractionError = errorMessage;
    job.isExtracting = false; // Clear extraction flag
    job.updatedAt = new Date().toISOString();

    // Save back to storage
    jobs[jobId] = job;
    await chrome.storage.local.set({ jobs });

    // Update local reference
    currentJob = job;

    // Trigger MainView re-render to show error
    displayJob(currentJob);

    // Show error toast
    showError('Extraction failed: ' + errorMessage);

    // Reset flag after a short delay
    setTimeout(() => {
      isSavingLocally = false;
    }, 200);

  } catch (error) {
    console.error('[Side Panel] Error handling extraction error:', error);
    isSavingLocally = false;
  }
}

// Handle extraction cancellation
async function handleExtractionCancelled(jobId) {
  console.log('[Side Panel] Extraction cancelled for job:', jobId);

  if (jobId !== currentJobId) {
    console.log('[Side Panel] Cancelled job is not in focus, skipping UI update');
    return;
  }

  // Set flag to prevent reload loop
  isSavingLocally = true;

  try {
    // Get current job from storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const job = jobs[jobId];

    if (!job) {
      console.log('[Side Panel] Job deleted (expected after cancel & delete), no update needed');
      isSavingLocally = false;
      return;
    }

    // Clear extraction state
    job.isExtracting = false;
    job.updatedAt = new Date().toISOString();
    
    // Clear extraction error if present
    if (job.extractionError) {
      delete job.extractionError;
    }

    // Save back to storage
    jobs[jobId] = job;
    await chrome.storage.local.set({ jobs });

    // Update local reference
    currentJob = job;

    // Trigger MainView re-render to clear extraction UI
    displayJob(currentJob);

    console.log('[Side Panel] Cleared extraction state for job:', jobId);

    // Reset flag after a short delay
    setTimeout(() => {
      isSavingLocally = false;
    }, 200);

  } catch (error) {
    console.error('[Side Panel] Error handling extraction cancellation:', error);
    isSavingLocally = false;
  }
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
  
  // Cleanup MainView
  if (mainView) {
    mainView.cleanup();
  }
  
  currentJobId = null;
  currentJob = null;
}

// Display job details using MainView (state-based view selection)
function displayJob(job) {
  document.getElementById('emptyState').classList.add('hidden');
  document.getElementById('jobDetails').classList.remove('hidden');
  document.getElementById('footer').classList.remove('hidden');

  const jobContent = document.getElementById('jobContent');
  
  // Use MainView to render the appropriate view based on job status
  // Pass index as 0 since sidepanel only shows one job at a time
  mainView.render(jobContent, job, 0);
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

// Delete the current job in focus
async function deleteJob() {
  if (!currentJobId) {
    showError('No job to delete');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this job? This cannot be undone.')) {
    return;
  }
  
  try {
    // Get all jobs from storage
    const result = await chrome.storage.local.get(['jobs', 'jobInFocus']);
    const jobs = result.jobs || {};
    const job = jobs[currentJobId];
    
    // If job is currently extracting, cancel the extraction
    if (job && job.isExtracting) {
      console.log(`[Side Panel] Cancelling extraction for job ${currentJobId}`);
      chrome.runtime.sendMessage({
        action: 'cancelExtraction',
        jobId: currentJobId
      }).catch(err => {
        console.error('[Side Panel] Failed to send cancellation:', err);
      });
    }
    
    // Delete the job
    delete jobs[currentJobId];
    
    // Clear job in focus if it was this job
    const updates = { jobs };
    if (result.jobInFocus === currentJobId) {
      updates.jobInFocus = null;
    }
    
    // Save back to storage
    await chrome.storage.local.set(updates);
    
    console.log(`[Side Panel] Deleted job ${currentJobId}`);
    showSuccess('Job deleted');
    
    // Reload to show empty state or next job
    await loadJobInFocus();
    
  } catch (error) {
    console.error('[Side Panel] Error deleting job:', error);
    showError('Failed to delete job');
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
          userProfile: backup.data.userProfile || backup.data.masterResume || null,
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

// Show error toast
function showError(message) {
  showToast(message, 'error');
}

// Show success toast
function showSuccess(message) {
  showToast(message, 'success');
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');
  
  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}
