// Side panel script that manages the job in focus

import { MainView } from './job-details/main-view.js';
import { parseJobTemplate, mapMarkdownFieldsToJob } from './utils/job-parser.js';
import { checklistTemplates } from './job-details/config.js';

let currentJobId = null;
let currentJob = null;
let mainView = null; // MainView instance for rendering state-based views
let isSavingLocally = false; // Flag to prevent reload loops
let streamBuffer = ''; // Buffer for incomplete lines during streaming
let extractingJobData = null; // In-memory job data during extraction (before saving to storage)

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
        
        // Skip reload if current job is extracting (streaming handler manages UI updates)
        if (changes.jobs && currentJobId) {
          const updatedJob = changes.jobs.newValue?.[currentJobId];
          if (updatedJob?.isExtracting) {
            console.log('[Side Panel] Job is extracting, skipping reload to prevent stream disruption');
            return;
          }
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
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'prepareForExtraction') {
      handlePrepareForExtraction(message.jobId, message.url, message.source);
    } else if (message.action === 'extractionStarted') {
      handleExtractionStarted(message.jobId, message.url, message.source, message.rawText);
    } else if (message.action === 'extractionChunk') {
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

// Handle prepare for extraction - create placeholder job BEFORE extraction starts
// This ensures the Researching view (with textarea) is ready to receive streaming chunks
function handlePrepareForExtraction(jobId, url, source) {
  console.log('[Side Panel] Preparing for extraction, job:', jobId);
  
  // Update currentJobId to the extracting job
  currentJobId = jobId;
  
  // Create minimal in-memory job structure (placeholder)
  extractingJobData = {
    id: jobId,
    url: url,
    source: source,
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
    content: '', // Will be populated by streaming chunks
    rawDescription: '', // Will be set by extractionStarted
    aboutJob: '',
    aboutCompany: '',
    responsibilities: '',
    requirements: '',
    isExtracting: true,
    updatedAt: new Date().toISOString()
  };
  
  // Store as current job for display
  currentJob = extractingJobData;
  
  // Display extraction UI immediately (creates textarea for streaming)
  displayJob(currentJob);
  
  console.log('[Side Panel] Created placeholder job, Researching view displayed:', jobId);
}

// Handle extraction start - update placeholder job with raw text
function handleExtractionStarted(jobId, url, source, rawText) {
  console.log('[Side Panel] Extraction started for job:', jobId);
  
  if (jobId !== currentJobId) {
    console.warn('[Side Panel] Extraction started for different job than expected');
    // Fallback: create new placeholder if mismatch
    handlePrepareForExtraction(jobId, url, source);
  }
  
  // Update placeholder job with raw text
  if (extractingJobData && extractingJobData.id === jobId) {
    extractingJobData.rawDescription = rawText;
    extractingJobData.updatedAt = new Date().toISOString();
    console.log('[Side Panel] Updated placeholder job with raw text (', rawText.length, 'chars)');
  } else {
    console.warn('[Side Panel] No placeholder job found, creating new one');
    // Fallback: create job if prepareForExtraction was missed
    extractingJobData = {
      id: jobId,
      url: url,
      source: source,
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
      rawDescription: rawText,
      aboutJob: '',
      aboutCompany: '',
      responsibilities: '',
      requirements: '',
      isExtracting: true,
      updatedAt: new Date().toISOString()
    };
    
    currentJob = extractingJobData;
    displayJob(currentJob);
  }
}

// Helper function to initialize all checklists (same as popup.js)
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

// Handle streaming extraction chunk
async function handleExtractionChunk(jobId, chunk) {
  console.log('[Side Panel] Received chunk for job:', jobId, 'current:', currentJobId, 'chunk:', chunk.substring(0, 50) + '...');
  
  if (jobId !== currentJobId) {
    console.log('[Side Panel] Received chunk for different job, ignoring');
    return;
  }

  try {
    // Check if job exists in storage (for re-extraction of existing jobs)
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const storageJob = jobs[jobId];

    console.log('[Side Panel] Chunk handler - job exists in storage:', !!storageJob);

    if (storageJob) {
      // Job exists in storage - this is a re-extraction, use storage-based flow
      console.log('[Side Panel] Re-extraction: updating job in storage');
      
      // Set flag to prevent reload loop
      isSavingLocally = true;
      
      // Append chunk to job.content field (full content for storage)
      storageJob.content = (storageJob.content || '') + chunk;
      storageJob.updatedAt = new Date().toISOString();

      // Save back to storage
      jobs[jobId] = storageJob;
      await chrome.storage.local.set({ jobs });

      // Update local reference
      currentJob = storageJob;
    } else {
      // Job NOT in storage - this is a new extraction, use in-memory flow
      console.log('[Side Panel] New extraction: using in-memory job');
      
      if (!extractingJobData) {
        console.warn('[Side Panel] No in-memory job data, creating minimal structure');
        // Fallback: create minimal structure if extractionStarted was missed
        extractingJobData = {
          id: jobId,
          content: '',
          isExtracting: true,
          updatedAt: new Date().toISOString()
        };
      }
      
      // Append chunk to in-memory job
      extractingJobData.content = (extractingJobData.content || '') + chunk;
      extractingJobData.updatedAt = new Date().toISOString();
      
      // Update local reference
      currentJob = extractingJobData;
    }

    // Update textarea directly (no full re-render for better performance)
    const textarea = document.querySelector('#jobEditor');
    if (textarea && textarea.hasAttribute('readonly')) {
      // Line buffering strategy: Only display complete lines to prevent showing
      // partial tokens like "COMP" or ">" during streaming.
      // This ensures user never sees incomplete keys or broken markdown syntax.
      streamBuffer += chunk;
      
      // Split by newlines - lines array will have complete lines, last element is incomplete
      const lines = streamBuffer.split('\n');
      
      // Last element is always the incomplete line (doesn't end with \n yet)
      const incompleteLine = lines.pop();
      
      // If we have complete lines, append them to textarea
      if (lines.length > 0) {
        const completeLines = lines.join('\n') + '\n'; // Rejoin with newlines
        textarea.value = (textarea.value || '') + completeLines;
        
        // Clear placeholder on first content display
        if (textarea.placeholder) {
          textarea.placeholder = '';
        }
        
        console.log('[Side Panel] Displayed', lines.length, 'complete line(s)');
      } else if (!textarea.value) {
        // Still waiting for first complete line - show placeholder
        textarea.placeholder = 'Receiving data from LLM...';
      }
      
      // Keep incomplete line in buffer for next chunk
      streamBuffer = incompleteLine || '';
      
      // Note: User controls scroll position, we don't auto-scroll
    } else {
      // Fallback: If textarea not found or not readonly, do full re-render
      displayJob(currentJob);
    }

    console.log('[Side Panel] Appended chunk (', chunk.length, 'chars) to', storageJob ? 'storage' : 'in-memory', 'job');

    // Reset flag after a short delay (only if we saved to storage)
    if (storageJob) {
      setTimeout(() => {
        isSavingLocally = false;
      }, 50);
    }

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
    streamBuffer = ''; // Reset buffer even if not in focus
    extractingJobData = null; // Clear in-memory data
    return;
  }

  // Set flag to prevent reload loop
  isSavingLocally = true;

  try {
    // Capture scroll position BEFORE re-render (from readonly textarea)
    const oldTextarea = document.querySelector('#jobEditor');
    const savedScrollTop = oldTextarea ? oldTextarea.scrollTop : 0;
    console.log('[Side Panel] Captured scroll position:', savedScrollTop);

    // Flush any remaining buffered content to textarea (for visual continuity)
    if (oldTextarea && oldTextarea.hasAttribute('readonly') && streamBuffer) {
      oldTextarea.value = (oldTextarea.value || '') + streamBuffer;
      console.log('[Side Panel] Flushed remaining buffer:', streamBuffer.length, 'chars');
    }
    
    // Reset stream buffer
    streamBuffer = '';

    // Check if job exists in storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const storageJob = jobs[jobId];

    let job;
    
    if (storageJob) {
      // Job exists in storage - this is a re-extraction
      console.log('[Side Panel] Re-extraction complete: updating existing job');
      job = storageJob;
    } else {
      // Job NOT in storage - this is a new extraction, create from in-memory data
      console.log('[Side Panel] New extraction complete: creating job in storage for FIRST time');
      
      if (!extractingJobData) {
        console.warn('[Side Panel] No in-memory job data found, creating minimal job');
        extractingJobData = {
          id: jobId,
          applicationStatus: 'Researching',
          statusHistory: [{
            status: 'Researching',
            timestamp: new Date().toISOString()
          }],
          checklist: initializeAllChecklists(),
          updatedAt: new Date().toISOString()
        };
      }
      
      job = extractingJobData;
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

    // Save to storage (FIRST time for new extractions, update for re-extractions)
    jobs[jobId] = job;
    await chrome.storage.local.set({ jobs });
    console.log('[Side Panel] Saved complete job to storage:', jobId);

    // Clear in-memory extraction data
    extractingJobData = null;

    // Update local reference
    currentJob = job;

    // Trigger MainView re-render (transitions from extraction UI to normal editor UI)
    displayJob(currentJob);

    // Restore scroll position AFTER re-render (to new editable textarea)
    // Use requestAnimationFrame to ensure DOM has settled
    requestAnimationFrame(() => {
      const newTextarea = document.querySelector('#jobEditor');
      if (newTextarea && savedScrollTop > 0) {
        newTextarea.scrollTop = savedScrollTop;
        console.log('[Side Panel] Restored scroll position:', savedScrollTop);
      }
    });

    // Show success toast
    showSuccess('Job extraction completed!');

    // Reset flag after a short delay
    setTimeout(() => {
      isSavingLocally = false;
    }, 200);

  } catch (error) {
    console.error('[Side Panel] Error handling extraction completion:', error);
    isSavingLocally = false;
    streamBuffer = ''; // Reset buffer on error
    extractingJobData = null; // Clear in-memory data on error
  }
}

// Handle extraction error
async function handleExtractionError(jobId, errorMessage) {
  console.error('[Side Panel] Extraction error for job:', jobId, errorMessage);

  if (jobId !== currentJobId) {
    console.log('[Side Panel] Error for different job, skipping UI update');
    streamBuffer = ''; // Reset buffer even if not in focus
    extractingJobData = null; // Clear in-memory data
    return;
  }

  // Reset stream buffer
  streamBuffer = '';

  // Set flag to prevent reload loop
  isSavingLocally = true;

  try {
    // Check if job exists in storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const storageJob = jobs[jobId];

    if (storageJob) {
      // Job exists in storage - update with error
      console.log('[Side Panel] Extraction error for existing job');
      
      // Update job with error marker in content
      // ResearchingView will display this in the validation panel
      storageJob.content = storageJob.content || '';
      storageJob.extractionError = errorMessage;
      storageJob.isExtracting = false; // Clear extraction flag
      storageJob.updatedAt = new Date().toISOString();

      // Save back to storage
      jobs[jobId] = storageJob;
      await chrome.storage.local.set({ jobs });

      // Update local reference
      currentJob = storageJob;

      // Trigger MainView re-render to show error
      displayJob(currentJob);
    } else {
      // Job NOT in storage - discard in-memory job, show error
      console.log('[Side Panel] Extraction error for new job: discarding in-memory data');
      
      extractingJobData = null;
      currentJob = null;
      currentJobId = null;
      
      // Clear jobInFocus
      await chrome.storage.local.set({ jobInFocus: null });
      
      // Show empty state
      clearJobDisplay();
    }

    // Show error toast
    showError('Extraction failed: ' + errorMessage);

    // Reset flag after a short delay
    setTimeout(() => {
      isSavingLocally = false;
    }, 200);

  } catch (error) {
    console.error('[Side Panel] Error handling extraction error:', error);
    isSavingLocally = false;
    extractingJobData = null; // Clear in-memory data on error
  }
}

// Handle extraction cancellation
async function handleExtractionCancelled(jobId) {
  console.log('[Side Panel] Extraction cancelled for job:', jobId);
  console.log('[Side Panel] extractingJobData exists:', !!extractingJobData);
  console.log('[Side Panel] currentJobId:', currentJobId);

  if (jobId !== currentJobId) {
    console.log('[Side Panel] Cancelled job is not in focus, skipping UI update');
    streamBuffer = ''; // Reset buffer even if not in focus
    extractingJobData = null; // Clear in-memory data
    return;
  }

  // Reset stream buffer
  streamBuffer = '';

  try {
    // Check if job exists in storage
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || {};
    const storageJob = jobs[jobId];

    console.log('[Side Panel] Job exists in storage:', !!storageJob);

    if (storageJob) {
      // Job exists in storage - this is a re-extraction cancellation
      console.log('[Side Panel] Re-extraction cancelled: clearing extraction flag');
      
      // Set flag to prevent reload loop
      isSavingLocally = true;
      
      // Clear extraction state but keep the job
      storageJob.isExtracting = false;
      storageJob.updatedAt = new Date().toISOString();
      
      // Clear extraction error if present
      if (storageJob.extractionError) {
        delete storageJob.extractionError;
      }

      // Save back to storage
      jobs[jobId] = storageJob;
      await chrome.storage.local.set({ jobs });

      // Update local reference
      currentJob = storageJob;

      // Trigger MainView re-render to clear extraction UI
      displayJob(currentJob);

      console.log('[Side Panel] Cleared extraction state for existing job:', jobId);

      // Reset flag after a short delay
      setTimeout(() => {
        isSavingLocally = false;
      }, 200);
    } else {
      // Job NOT in storage - this is a new extraction cancellation
      console.log('[Side Panel] New extraction cancelled: discarding in-memory job');
      
      // Clear in-memory extraction data (no storage cleanup needed!)
      extractingJobData = null;
      currentJob = null;
      currentJobId = null;
      
      // Clear jobInFocus from storage
      await chrome.storage.local.set({ jobInFocus: null });
      
      // Show empty state
      clearJobDisplay();
      
      console.log('[Side Panel] Discarded in-memory job, no fragments in storage');
    }

  } catch (error) {
    console.error('[Side Panel] Error handling extraction cancellation:', error);
    isSavingLocally = false;
    
    // Cleanup in-memory state on error
    extractingJobData = null;
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

    if (!jobInFocusId) {
      // No job in focus - show empty state
      showEmptyState();
      return;
    }

    if (!jobs[jobInFocusId]) {
      // Job in focus but not in storage yet - likely a new extraction starting
      // Set currentJobId and wait for extraction to start (handleExtractionStarted will create in-memory job)
      console.log('[Side Panel] Job in focus but not in storage yet (extraction pending):', jobInFocusId);
      currentJobId = jobInFocusId;
      currentJob = null;
      
      // Show empty state for now (will be replaced when extraction starts)
      showEmptyState();
      return;
    }

    // Load and display the job from storage
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

  // Reset stream buffer when switching jobs or re-rendering
  // (unless job is currently extracting, in which case keep the buffer)
  if (!job.isExtracting) {
    streamBuffer = '';
  }

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
    
    // Check if job is extracting (could be in storage or in-memory)
    const isExtracting = (job && job.isExtracting) || (extractingJobData && extractingJobData.id === currentJobId);
    
    // If job is currently extracting, cancel the extraction
    if (isExtracting) {
      console.log(`[Side Panel] Cancelling extraction for job ${currentJobId}`);
      chrome.runtime.sendMessage({
        action: 'cancelExtraction',
        jobId: currentJobId
      }).catch(err => {
        console.error('[Side Panel] Failed to send cancellation:', err);
      });
      
      // Clear in-memory extraction data
      extractingJobData = null;
      streamBuffer = '';
    }
    
    // Delete the job from storage (if it exists)
    if (job) {
      delete jobs[currentJobId];
    }
    
    // Clear job in focus if it was this job
    const updates = { jobs };
    if (result.jobInFocus === currentJobId) {
      updates.jobInFocus = null;
    }
    
    // Save back to storage
    await chrome.storage.local.set(updates);
    
    console.log(`[Side Panel] Deleted job ${currentJobId}`, job ? '(from storage)' : '(in-memory only)');
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
