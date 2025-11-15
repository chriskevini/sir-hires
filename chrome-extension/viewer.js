// Viewer script for displaying saved jobs
let allJobs = [];
let filteredJobs = [];
let selectedJobIndex = -1;
let debugMode = false;
let jobInFocusId = null; // Track which job is currently in focus

async function loadJobs() {
  console.log('loadJobs() called');
  try {
    const result = await chrome.storage.local.get(['jobs', 'masterResume', 'jobInFocus']);
    console.log('Storage result:', result);
    
    // Store the job in focus ID
    jobInFocusId = result.jobInFocus || null;
    
    // Convert object-based storage to array for viewer compatibility
    const jobsObj = result.jobs || {};
    allJobs = Object.values(jobsObj);
    
    // Migration: Ensure all jobs have IDs (for backward compatibility)
    let needsMigration = false;
    const migratedJobs = {};
    
    Object.entries(jobsObj).forEach(([key, job]) => {
      if (!job.id) {
        // Old job without ID - use the storage key as the ID
        console.log('Migrating job without ID, using key:', key);
        job.id = key;
        needsMigration = true;
      }
      migratedJobs[job.id] = job;
    });
    
    // If we migrated any jobs, save them back
    if (needsMigration) {
      console.log('Saving migrated jobs with IDs');
      await chrome.storage.local.set({ jobs: migratedJobs });
      allJobs = Object.values(migratedJobs);
    }
    
    console.log('allJobs:', allJobs);
    console.log('allJobs.length:', allJobs.length);
    console.log('jobInFocusId:', jobInFocusId);
    
    // Check if master resume exists and show hint if not
    checkResumeStatus(result.masterResume);
    
    if (allJobs.length === 0) {
      console.log('No jobs found, showing empty state');
      document.getElementById('emptyState').classList.remove('hidden');
      document.querySelector('.main-content').style.display = 'none';
      document.getElementById('jobsList').innerHTML = '';
    } else {
      console.log('Jobs found, rendering...');
      document.getElementById('emptyState').classList.add('hidden');
      document.querySelector('.main-content').style.display = 'flex';
      populateSourceFilter();
      restoreFilters(); // Restore saved filter states
      filterJobs(); // This will render sidebar and select first job
    }
    
    updateStats();
  } catch (error) {
    console.error('Error loading jobs:', error);
    document.getElementById('jobsList').innerHTML = '<div style="color: red; padding: 20px;">Error loading jobs: ' + error.message + '</div>';
  }
}

function checkResumeStatus(masterResume) {
  const resumeHint = document.getElementById('resumeHint');
  
  if (!masterResume || !masterResume.content || masterResume.content.trim() === '') {
    // No resume exists, show hint
    resumeHint.classList.remove('hidden');
  } else {
    // Resume exists, hide hint
    resumeHint.classList.add('hidden');
  }
}

function openMasterResume() {
  window.location.href = 'resume.html';
}

function saveFilters() {
  const filters = {
    search: document.getElementById('searchInput').value,
    source: document.getElementById('sourceFilter').value,
    status: document.getElementById('statusFilter').value,
    sort: document.getElementById('sortFilter').value
  };
  localStorage.setItem('jobViewerFilters', JSON.stringify(filters));
}

function restoreFilters() {
  const saved = localStorage.getItem('jobViewerFilters');
  if (saved) {
    try {
      const filters = JSON.parse(saved);
      document.getElementById('searchInput').value = filters.search || '';
      document.getElementById('sourceFilter').value = filters.source || '';
      document.getElementById('statusFilter').value = filters.status || '';
      document.getElementById('sortFilter').value = filters.sort || 'newest';
    } catch (error) {
      console.error('Error restoring filters:', error);
    }
  }
}

function updateStats() {
  document.getElementById('jobCount').textContent = allJobs.length;
}

function populateSourceFilter() {
  const sources = [...new Set(allJobs.map(job => job.source).filter(Boolean))];
  const select = document.getElementById('sourceFilter');
  
  // Keep the "All Sources" option
  select.innerHTML = '<option value="">All Sources</option>';
  
  sources.forEach(source => {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source;
    select.appendChild(option);
  });
}

function renderJobs(jobs) {
  console.log('renderJobs() called with', jobs.length, 'jobs');
  console.log('jobInFocusId:', jobInFocusId);
  filteredJobs = jobs;
  renderSidebar(jobs);
  
  // Auto-select job based on priority:
  // 1. Job in focus (if it exists in filtered jobs)
  // 2. Currently selected job (if valid)
  // 3. First job in list
  if (jobs.length > 0) {
    let indexToSelect = -1;
    
    // Try to find and select the job in focus
    if (jobInFocusId) {
      console.log('Looking for job with ID:', jobInFocusId);
      console.log('First job in list:', jobs[0]);
      const focusIndex = jobs.findIndex(job => job.id === jobInFocusId);
      console.log('Found job in focus at index:', focusIndex);
      if (focusIndex !== -1) {
        console.log('Auto-selecting job in focus at index:', focusIndex);
        indexToSelect = focusIndex;
      }
    }
    
    // Fallback to current selection if job in focus not found
    if (indexToSelect === -1 && selectedJobIndex >= 0 && selectedJobIndex < jobs.length) {
      console.log('Falling back to current selection:', selectedJobIndex);
      indexToSelect = selectedJobIndex;
    }
    
    // Fallback to first job if no valid selection
    if (indexToSelect === -1) {
      console.log('Falling back to first job');
      indexToSelect = 0;
    }
    
    console.log('Final index to select:', indexToSelect);
    selectJob(indexToSelect);
  } else {
    document.getElementById('detailPanel').innerHTML = '<div class="detail-panel-empty">No jobs match your filters</div>';
    selectedJobIndex = -1;
  }
}

function renderSidebar(jobs) {
  console.log('renderSidebar() called with', jobs.length, 'jobs');
  const jobsList = document.getElementById('jobsList');
  
  if (!jobsList) {
    console.error('jobsList element not found!');
    return;
  }
  
  if (jobs.length === 0) {
    jobsList.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; font-size: 13px;">No jobs found</div>';
    return;
  }

  try {
    jobsList.innerHTML = jobs.map((job, index) => renderCompactJobCard(job, index)).join('');
    console.log('Sidebar rendered successfully');
  } catch (error) {
    console.error('Error rendering sidebar:', error);
    jobsList.innerHTML = '<div style="color: red; padding: 20px;">Error rendering jobs: ' + error.message + '</div>';
  }
}

function renderCompactJobCard(job, index) {
  const status = job.application_status || 'Saved';
  const isActive = index === selectedJobIndex;
  const isFocused = job.id === jobInFocusId;
  
  return `
    <div class="job-card-compact ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}" data-index="${index}">
      <div class="job-card-header-compact">
        <div class="job-title-compact">${escapeHtml(job.job_title)}</div>
        ${isFocused ? '<span class="focus-indicator" title="Currently in focus">📌</span>' : ''}
      </div>
      <div class="company-compact">${escapeHtml(job.company)}</div>
      <div class="meta-compact">
        ${status !== 'Saved' ? `<span class="status-badge-compact status-${status}">${status}</span>` : ''}
        ${job.deadline ? `<span>⏰ ${escapeHtml(formatRelativeDate(job.deadline))}</span>` : ''}
      </div>
    </div>
  `;
}

async function selectJob(index) {
  console.log('selectJob() called with index:', index);
  selectedJobIndex = index;
  
  // Update active state in sidebar
  document.querySelectorAll('.job-card-compact').forEach((card, i) => {
    if (i === index) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });
  
  // Render job detail
  const job = filteredJobs[index];
  const globalIndex = allJobs.indexOf(job);
  renderJobDetail(job, globalIndex);
  
  // Set this job as the job in focus
  if (job.id) {
    await chrome.storage.local.set({ jobInFocus: job.id });
    console.log(`Set job ${job.id} as job in focus`);
  }
}

function renderJobDetail(job, index) {
  console.log('renderJobDetail() called for job at index:', index);
  const detailPanel = document.getElementById('detailPanel');
  
  if (!detailPanel) {
    console.error('detailPanel element not found!');
    return;
  }
  
  try {
    detailPanel.innerHTML = debugMode ? renderDebugJob(job, index) : renderNormalJob(job, index);
    
    // Attach event listeners to the detail panel buttons
    attachButtonListeners();
  } catch (error) {
    console.error('Error rendering job detail:', error);
    detailPanel.innerHTML = '<div style="color: red; padding: 20px;">Error rendering job detail: ' + error.message + '</div>';
  }
}

// Helper to format YYYY-MM-DD dates as absolute date strings (e.g., "Jan 15, 2025")
function formatAbsoluteDate(dateString) {
  if (!dateString) return '';
  
  // If it's YYYY-MM-DD format, parse manually without timezone conversion
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  }
  
  // Fallback: return original string if format is unexpected
  return dateString;
}

// Helper to format YYYY-MM-DD dates as relative time (e.g., "3 days ago", "In 5 days")
function formatRelativeDate(dateString) {
  if (!dateString) return '';
  
  // Parse YYYY-MM-DD manually to avoid timezone issues
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateString; // Fallback to original if format unexpected
  
  const [, year, month, day] = match;
  const jobDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
  jobDate.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const diffTime = jobDate - today;
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  // Format based on difference
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  
  // Future dates (deadlines)
  if (diffDays > 0) {
    if (diffDays < 7) return `In ${diffDays} days`;
    if (diffDays < 14) return 'In 1 week';
    if (diffDays < 30) return `In ${Math.round(diffDays / 7)} weeks`;
    if (diffDays < 60) return 'In 1 month';
    if (diffDays < 365) return `In ${Math.round(diffDays / 30)} months`;
    return `In ${Math.round(diffDays / 365)} years`;
  }
  
  // Past dates (posted dates)
  const absDays = Math.abs(diffDays);
  if (absDays < 7) return `${absDays} days ago`;
  if (absDays < 14) return '1 week ago';
  if (absDays < 30) return `${Math.round(absDays / 7)} weeks ago`;
  if (absDays < 60) return '1 month ago';
  if (absDays < 365) return `${Math.round(absDays / 30)} months ago`;
  return `${Math.round(absDays / 365)} years ago`;
}

function renderNormalJob(job, index) {

  return `
    <div class="job-card">
      <div class="job-header">
        <div>
          <div class="job-title">${escapeHtml(job.job_title)}</div>
          <div class="company">${escapeHtml(job.company)}</div>
        </div>
        <div>
          ${job.source ? `<span class="badge">${escapeHtml(job.source)}</span>` : ''}
        </div>
      </div>
      
      <div class="status-selector">
        <label>Status:</label>
        <select class="status-select" data-index="${index}">
          <option value="Saved" ${(job.application_status || 'Saved') === 'Saved' ? 'selected' : ''}>Saved</option>
          <option value="Applied" ${job.application_status === 'Applied' ? 'selected' : ''}>Applied</option>
          <option value="Screening" ${job.application_status === 'Screening' ? 'selected' : ''}>Screening</option>
          <option value="Interviewing" ${job.application_status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
          <option value="Offer" ${job.application_status === 'Offer' ? 'selected' : ''}>Offer</option>
          <option value="Accepted" ${job.application_status === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Rejected" ${job.application_status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          <option value="Withdrawn" ${job.application_status === 'Withdrawn' ? 'selected' : ''}>Withdrawn</option>
        </select>
      </div>
      
      <div class="job-meta">
        ${job.location ? `<div class="job-meta-item">📍 ${escapeHtml(job.location)}</div>` : ''}
        ${job.salary ? `<div class="job-meta-item">💰 ${escapeHtml(job.salary)}</div>` : ''}
        ${job.job_type ? `<div class="job-meta-item">💼 ${escapeHtml(job.job_type)}</div>` : ''}
        ${job.remote_type && job.remote_type !== 'Not specified' ? `<div class="job-meta-item">${getRemoteIcon(job.remote_type)} ${escapeHtml(job.remote_type)}</div>` : ''}
        ${job.posted_date ? `<div class="job-meta-item">📅 Posted: <span title="${escapeHtml(formatAbsoluteDate(job.posted_date))}">${escapeHtml(formatRelativeDate(job.posted_date))}</span></div>` : ''}
        ${job.deadline ? `<div class="job-meta-item">⏰ Deadline: <span title="${escapeHtml(formatAbsoluteDate(job.deadline))}">${escapeHtml(formatRelativeDate(job.deadline))}</span></div>` : ''}
      </div>

      ${job.about_job ? `
        <div class="section">
          <div class="section-title">About the Job</div>
          <div class="section-content">
            ${escapeHtml(job.about_job)}
          </div>
        </div>
      ` : ''}

      ${job.about_company ? `
        <div class="section">
          <div class="section-title">About the Company</div>
          <div class="section-content">
            ${escapeHtml(job.about_company)}
          </div>
        </div>
      ` : ''}

      ${job.responsibilities ? `
        <div class="section">
          <div class="section-title">Responsibilities</div>
          <div class="section-content">
            ${escapeHtml(job.responsibilities)}
          </div>
        </div>
      ` : ''}

      ${job.requirements ? `
        <div class="section">
          <div class="section-title">Requirements</div>
          <div class="section-content">
            ${escapeHtml(job.requirements)}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Notes</div>
        <textarea class="notes-textarea" id="notes-textarea-${index}" rows="3" placeholder="Add your notes about this job...">${escapeHtml(job.notes || '')}</textarea>
        <button class="btn-save-notes" data-index="${index}">Save Notes</button>
      </div>

      <div class="section">
        <div class="section-title">Narrative Strategy</div>
        <textarea class="notes-textarea" id="narrative-textarea-${index}" rows="3" placeholder="How to tailor your resume/cover letter for this job...">${escapeHtml(job.narrative_strategy || '')}</textarea>
        <button class="btn-save-narrative" data-index="${index}">Save Strategy</button>
      </div>

      <div class="job-actions">
        ${job.url ? `<button class="btn btn-link" data-url="${escapeHtml(job.url)}">View Job Posting</button>` : ''}
        <button class="btn btn-delete" data-index="${index}">Delete</button>
      </div>
    </div>
  `;
}

function renderDebugJob(job, index) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    return escapeHtml(String(value));
  };

  return `
    <div class="job-card">
      <div class="debug-info">
        <div class="debug-info-row">
          <span class="debug-label">job_title:</span>
          <span class="debug-value">${formatValue(job.job_title)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">company:</span>
          <span class="debug-value">${formatValue(job.company)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">location:</span>
          <span class="debug-value">${formatValue(job.location)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">salary:</span>
          <span class="debug-value">${formatValue(job.salary)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">job_type:</span>
          <span class="debug-value">${formatValue(job.job_type)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">remote_type:</span>
          <span class="debug-value">${formatValue(job.remote_type)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">posted_date:</span>
          <span class="debug-value">${formatValue(job.posted_date)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">deadline:</span>
          <span class="debug-value">${formatValue(job.deadline)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">application_status:</span>
          <span class="debug-value">${formatValue(job.application_status)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">url:</span>
          <span class="debug-value">${formatValue(job.url)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">source:</span>
          <span class="debug-value">${formatValue(job.source)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">about_job:</span>
          <span class="debug-value">${formatValue(job.about_job)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">about_company:</span>
          <span class="debug-value">${formatValue(job.about_company)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">responsibilities:</span>
          <span class="debug-value">${formatValue(job.responsibilities)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">requirements:</span>
          <span class="debug-value">${formatValue(job.requirements)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">notes:</span>
          <span class="debug-value">${formatValue(job.notes)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">narrative_strategy:</span>
          <span class="debug-value">${formatValue(job.narrative_strategy)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">raw_description:</span>
          <span class="debug-value">${formatValue(job.raw_description)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">updated_at:</span>
          <span class="debug-value">${formatDate(job.updated_at)}</span>
        </div>
        <div class="debug-info-row">
          <span class="debug-label">status_history:</span>
          <span class="debug-value">${job.status_history ? JSON.stringify(job.status_history) : 'N/A'}</span>
        </div>
      </div>
      
      <div class="job-actions">
        ${job.url ? `<button class="btn btn-link" data-url="${escapeHtml(job.url)}">View Job Posting</button>` : ''}
        <button class="btn btn-delete" data-index="${index}">Delete</button>
      </div>
    </div>
  `;
}

function attachButtonListeners() {
  // Attach listeners to job link buttons
  document.querySelectorAll('.btn-link').forEach(btn => {
    btn.addEventListener('click', function() {
      const url = this.dataset.url;
      openJob(url);
    });
  });
  
  // Attach listeners to delete buttons
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      deleteJob(index);
    });
  });

  // Attach listeners to status selectors
  document.querySelectorAll('.status-select').forEach(select => {
    select.addEventListener('change', function() {
      const index = parseInt(this.dataset.index);
      const newStatus = this.value;
      updateJobStatus(index, newStatus);
    });
  });

  // Attach listeners to save notes buttons
  document.querySelectorAll('.btn-save-notes').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      saveNotes(index);
    });
  });
  
  // Attach listeners to save narrative strategy buttons
  document.querySelectorAll('.btn-save-narrative').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      saveNarrativeStrategy(index);
    });
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getRemoteIcon(remoteType) {
  const icons = {
    'Remote': '🏠',
    'Hybrid': '🔄',
    'On-site': '🏢'
  };
  return icons[remoteType] || '📍';
}

function openJob(url) {
  window.open(url, '_blank');
}

async function deleteJob(index) {
  if (!confirm('Are you sure you want to delete this job?')) {
    return;
  }

  const jobToDelete = allJobs[index];
  allJobs.splice(index, 1);
  
  // Convert array back to object format for storage
  const jobsObj = {};
  allJobs.forEach(job => {
    if (job.id) {
      jobsObj[job.id] = job;
    }
  });
  
  await chrome.storage.local.set({ jobs: jobsObj });
  await loadJobs();
}

async function updateJobStatus(index, newStatus) {
  const job = allJobs[index];
  const oldStatus = job.application_status || 'Saved';
  
  // Update the status
  job.application_status = newStatus;
  
  // Update or initialize status history
  if (!job.status_history) {
    job.status_history = [{
      status: oldStatus,
      date: job.updated_at || new Date().toISOString()
    }];
  }
  
  // Add new status to history
  job.status_history.push({
    status: newStatus,
    date: new Date().toISOString()
  });
  
  // Convert array back to object format for storage
  const jobsObj = {};
  allJobs.forEach(j => {
    if (j.id) {
      jobsObj[j.id] = j;
    }
  });
  
  // Save to storage
  await chrome.storage.local.set({ jobs: jobsObj });
  
  console.log(`Updated job status from ${oldStatus} to ${newStatus}`);
}

async function saveNotes(index) {
  const textarea = document.getElementById(`notes-textarea-${index}`);
  if (!textarea) {
    console.error(`Notes textarea not found for index ${index}`);
    return;
  }
  
  const newNotes = textarea.value.trim();
  const job = allJobs[index];
  
  // Update the notes
  job.notes = newNotes;
  job.updated_at = new Date().toISOString();
  
  // Convert array back to object format for storage
  const jobsObj = {};
  allJobs.forEach(j => {
    if (j.id) {
      jobsObj[j.id] = j;
    }
  });
  
  // Save to storage
  await chrome.storage.local.set({ jobs: jobsObj });
  
  // Visual feedback
  const button = document.querySelector(`.btn-save-notes[data-index="${index}"]`);
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'Saved!';
    button.style.backgroundColor = '#1a73e8';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  }
  
  console.log(`Updated notes for job at index ${index}`);
}

async function saveNarrativeStrategy(index) {
  const textarea = document.getElementById(`narrative-textarea-${index}`);
  if (!textarea) {
    console.error(`Narrative strategy textarea not found for index ${index}`);
    return;
  }
  
  const newStrategy = textarea.value.trim();
  const job = allJobs[index];
  
  // Update the narrative strategy
  job.narrative_strategy = newStrategy;
  job.updated_at = new Date().toISOString();
  
  // Convert array back to object format for storage
  const jobsObj = {};
  allJobs.forEach(j => {
    if (j.id) {
      jobsObj[j.id] = j;
    }
  });
  
  // Save to storage
  await chrome.storage.local.set({ jobs: jobsObj });
  
  // Visual feedback
  const button = document.querySelector(`.btn-save-narrative[data-index="${index}"]`);
  if (button) {
    const originalText = button.textContent;
    button.textContent = 'Saved!';
    button.style.backgroundColor = '#1a73e8';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.backgroundColor = '';
    }, 2000);
  }
  
  console.log(`Updated narrative strategy for job at index ${index}`);
}

function filterJobs() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const sourceFilter = document.getElementById('sourceFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;
  const sortFilter = document.getElementById('sortFilter').value;

  // Save filters to localStorage
  saveFilters();

  let filtered = allJobs;

  if (searchTerm) {
    filtered = filtered.filter(job => 
      job.job_title?.toLowerCase().includes(searchTerm) ||
      job.company?.toLowerCase().includes(searchTerm) ||
      job.location?.toLowerCase().includes(searchTerm) ||
      job.raw_description?.toLowerCase().includes(searchTerm) ||
      job.about_job?.toLowerCase().includes(searchTerm) ||
      job.about_company?.toLowerCase().includes(searchTerm) ||
      job.responsibilities?.toLowerCase().includes(searchTerm) ||
      job.requirements?.toLowerCase().includes(searchTerm)
    );
  }

  if (sourceFilter) {
    filtered = filtered.filter(job => job.source === sourceFilter);
  }

  if (statusFilter) {
    filtered = filtered.filter(job => (job.application_status || 'Saved') === statusFilter);
  }

  // Apply sorting
  filtered = sortJobs(filtered, sortFilter);

  renderJobs(filtered);
}

function sortJobs(jobs, sortBy) {
  const sorted = [...jobs]; // Create a copy to avoid mutating the original array
  
  switch(sortBy) {
    case 'newest':
      sorted.sort((a, b) => {
        const dateA = a.updated_at || a.posted_date || '';
        const dateB = b.updated_at || b.posted_date || '';
        return dateB.localeCompare(dateA);
      });
      break;
    
    case 'oldest':
      sorted.sort((a, b) => {
        const dateA = a.updated_at || a.posted_date || '';
        const dateB = b.updated_at || b.posted_date || '';
        return dateA.localeCompare(dateB);
      });
      break;
    
    case 'deadline-soon':
      sorted.sort((a, b) => {
        // Jobs with deadlines come first, then by date ascending
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; // Move jobs without deadline to end
        if (!b.deadline) return -1; // Move jobs without deadline to end
        return a.deadline.localeCompare(b.deadline);
      });
      break;
    
    case 'deadline-latest':
      sorted.sort((a, b) => {
        // Jobs with deadlines come first, then by date descending
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1; // Move jobs without deadline to end
        if (!b.deadline) return -1; // Move jobs without deadline to end
        return b.deadline.localeCompare(a.deadline);
      });
      break;
    
    case 'company-az':
      sorted.sort((a, b) => {
        const companyA = (a.company || '').toLowerCase();
        const companyB = (b.company || '').toLowerCase();
        return companyA.localeCompare(companyB);
      });
      break;
    
    case 'company-za':
      sorted.sort((a, b) => {
        const companyA = (a.company || '').toLowerCase();
        const companyB = (b.company || '').toLowerCase();
        return companyB.localeCompare(companyA);
      });
      break;
    
    case 'title-az':
      sorted.sort((a, b) => {
        const titleA = (a.job_title || '').toLowerCase();
        const titleB = (b.job_title || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
      break;
    
    case 'title-za':
      sorted.sort((a, b) => {
        const titleA = (a.job_title || '').toLowerCase();
        const titleB = (b.job_title || '').toLowerCase();
        return titleB.localeCompare(titleA);
      });
      break;
    
    default:
      // Default to newest first
      sorted.sort((a, b) => {
        const dateA = a.updated_at || a.posted_date || '';
        const dateB = b.updated_at || b.posted_date || '';
        return dateB.localeCompare(dateA);
      });
  }
  
  return sorted;
}

async function createBackup() {
  try {
    // Get ALL data from storage
    const result = await chrome.storage.local.get(['jobs', 'masterResume', 'llmSettings', 'jobInFocus']);
    
    // Create backup object with version info
    const backup = {
      version: "0.1.0",
      exportDate: new Date().toISOString(),
      data: {
        jobs: result.jobs || {},
        masterResume: result.masterResume || null,
        llmSettings: result.llmSettings || null,
        jobInFocus: result.jobInFocus || null
      }
    };

    const dataStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sir-hires-backup-${timestamp}.json`;

    // Download the file
    chrome.downloads.download({
      url: url,
      filename: filename,
      saveAs: true
    });

    const jobCount = Object.keys(backup.data.jobs).length;
    console.log(`Created backup with ${jobCount} jobs`);
  } catch (error) {
    console.error('Error creating backup:', error);
    alert('Error creating backup: ' + error.message);
  }
}

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
          alert('Invalid backup file format.');
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
        });

        console.log('Backup restored successfully');
        alert('Backup restored successfully! Reloading page...');
        
        // Reload page to reflect changes
        window.location.reload();
      } catch (error) {
        console.error('Error restoring backup:', error);
        alert('Error restoring backup: ' + error.message);
      }
    };

    // Trigger file picker
    input.click();
  } catch (error) {
    console.error('Error in restore backup:', error);
    alert('Error in restore backup: ' + error.message);
  }
}

async function clearAllJobs() {
  if (!confirm('Are you sure you want to delete ALL data (jobs, resume, settings)? This cannot be undone.')) {
    return;
  }

  try {
    // Clear ALL storage data
    await chrome.storage.local.clear();
    allJobs = [];
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('jobsList').innerHTML = '';
    updateStats();
    console.log('All data cleared');
    alert('All data deleted successfully! Reloading page...');
    window.location.reload();
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Error clearing data: ' + error.message);
  }
}

function toggleDebugMode() {
  debugMode = document.getElementById('debugToggle').checked;
  
  // Toggle body class for compact styling
  if (debugMode) {
    document.body.classList.add('debug-mode');
  } else {
    document.body.classList.remove('debug-mode');
  }
  
  // Re-render the selected job detail
  if (selectedJobIndex >= 0 && selectedJobIndex < filteredJobs.length) {
    const job = filteredJobs[selectedJobIndex];
    const globalIndex = allJobs.indexOf(job);
    renderJobDetail(job, globalIndex);
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchInput').addEventListener('input', filterJobs);
  document.getElementById('sourceFilter').addEventListener('change', filterJobs);
  document.getElementById('statusFilter').addEventListener('change', filterJobs);
  document.getElementById('sortFilter').addEventListener('change', filterJobs);
  document.getElementById('debugToggle').addEventListener('change', toggleDebugMode);
  document.getElementById('masterResumeBtn').addEventListener('click', openMasterResume);
  document.getElementById('createBackupBtn').addEventListener('click', createBackup);
  document.getElementById('restoreBackupBtn').addEventListener('click', restoreBackup);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllJobs);
  
  // Event delegation for sidebar job cards
  document.getElementById('jobsList').addEventListener('click', function(event) {
    const card = event.target.closest('.job-card-compact');
    if (card) {
      const index = parseInt(card.dataset.index);
      if (!isNaN(index)) {
        selectJob(index);
      }
    }
  });
  
  // Storage change listener for multi-tab sync
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.jobInFocus) {
        console.log('[Viewer] Job in focus changed, updating indicator');
        jobInFocusId = changes.jobInFocus.newValue || null;
        // Re-render sidebar to update focus indicator
        renderSidebar(filteredJobs);
      }
      if (changes.jobs) {
        console.log('[Viewer] Jobs changed, reloading');
        loadJobs();
      }
    }
  });
  
  // Load jobs on page load
  loadJobs();
});
