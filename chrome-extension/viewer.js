// Viewer script for displaying saved jobs
let allJobs = [];
let debugMode = false;

async function loadJobs() {
  console.log('loadJobs() called');
  try {
    const result = await chrome.storage.local.get(['jobs']);
    console.log('Storage result:', result);
    allJobs = result.jobs || [];
    console.log('allJobs:', allJobs);
    console.log('allJobs.length:', allJobs.length);
    
    if (allJobs.length === 0) {
      console.log('No jobs found, showing empty state');
      document.getElementById('emptyState').classList.remove('hidden');
      document.getElementById('jobsList').innerHTML = '';
    } else {
      console.log('Jobs found, rendering...');
      document.getElementById('emptyState').classList.add('hidden');
      populateSourceFilter();
      renderJobs(allJobs);
    }
    
    updateStats();
  } catch (error) {
    console.error('Error loading jobs:', error);
    document.getElementById('jobsList').innerHTML = '<div style="color: red; padding: 20px;">Error loading jobs: ' + error.message + '</div>';
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
  const jobsList = document.getElementById('jobsList');
  
  if (!jobsList) {
    console.error('jobsList element not found!');
    return;
  }
  
  if (jobs.length === 0) {
    jobsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;">No jobs match your filters.</div>';
    return;
  }

  try {
    jobsList.innerHTML = jobs.map((job, index) => debugMode ? renderDebugJob(job, index) : renderNormalJob(job, index)).join('');
    console.log('Jobs rendered successfully');
    
    // Add event listeners to dynamically created buttons
    attachButtonListeners();
  } catch (error) {
    console.error('Error rendering jobs:', error);
    jobsList.innerHTML = '<div style="color: red; padding: 20px;">Error rendering jobs: ' + error.message + '</div>';
  }
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
        ${job.posted_date ? `<div class="job-meta-item">📅 Posted: ${escapeHtml(job.posted_date)}</div>` : ''}
        ${job.deadline ? `<div class="job-meta-item">⏰ Deadline: ${escapeHtml(job.deadline)}</div>` : ''}
      </div>

      ${job.about_job ? `
        <div class="section">
          <div class="section-title">About the Job</div>
          <div class="section-content" id="about-job-${index}">
            ${escapeHtml(job.about_job)}
            ${job.about_job.length > 150 ? '<div class="section-fade"></div>' : ''}
          </div>
          ${job.about_job.length > 150 ? `<button class="btn-expand" data-section="about-job-${index}" data-index="${index}" data-field="about_job">Show more</button>` : ''}
        </div>
      ` : ''}

      ${job.about_company ? `
        <div class="section">
          <div class="section-title">About the Company</div>
          <div class="section-content" id="about-company-${index}">
            ${escapeHtml(job.about_company)}
            ${job.about_company.length > 150 ? '<div class="section-fade"></div>' : ''}
          </div>
          ${job.about_company.length > 150 ? `<button class="btn-expand" data-section="about-company-${index}" data-index="${index}" data-field="about_company">Show more</button>` : ''}
        </div>
      ` : ''}

      ${job.responsibilities ? `
        <div class="section">
          <div class="section-title">Responsibilities</div>
          <div class="section-content" id="resp-${index}">
            ${escapeHtml(job.responsibilities)}
            ${job.responsibilities.length > 150 ? '<div class="section-fade"></div>' : ''}
          </div>
          ${job.responsibilities.length > 150 ? `<button class="btn-expand" data-section="resp-${index}" data-index="${index}" data-field="responsibilities">Show more</button>` : ''}
        </div>
      ` : ''}

      ${job.requirements ? `
        <div class="section">
          <div class="section-title">Requirements</div>
          <div class="section-content" id="req-${index}">
            ${escapeHtml(job.requirements)}
            ${job.requirements.length > 150 ? '<div class="section-fade"></div>' : ''}
          </div>
          ${job.requirements.length > 150 ? `<button class="btn-expand" data-section="req-${index}" data-index="${index}" data-field="requirements">Show more</button>` : ''}
        </div>
      ` : ''}

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
  // Attach listeners to expand buttons
  document.querySelectorAll('.btn-expand').forEach(btn => {
    btn.addEventListener('click', function() {
      const sectionId = this.dataset.section;
      const index = parseInt(this.dataset.index);
      const fieldName = this.dataset.field;
      toggleSection(sectionId, index, fieldName, this);
    });
  });
  
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

function toggleSection(sectionId, index, fieldName, button) {
  const section = document.getElementById(sectionId);
  const job = allJobs[index];
  
  if (section.classList.contains('expanded')) {
    section.classList.remove('expanded');
    section.innerHTML = `${escapeHtml(job[fieldName]).substring(0, 150)}...
      <div class="section-fade"></div>`;
    button.textContent = 'Show more';
  } else {
    section.classList.add('expanded');
    section.innerHTML = escapeHtml(job[fieldName]);
    button.textContent = 'Show less';
  }
}

function openJob(url) {
  window.open(url, '_blank');
}

async function deleteJob(index) {
  if (!confirm('Are you sure you want to delete this job?')) {
    return;
  }

  allJobs.splice(index, 1);
  await chrome.storage.local.set({ jobs: allJobs });
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
  
  // Save to storage
  await chrome.storage.local.set({ jobs: allJobs });
  
  console.log(`Updated job status from ${oldStatus} to ${newStatus}`);
}

function filterJobs() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const sourceFilter = document.getElementById('sourceFilter').value;
  const statusFilter = document.getElementById('statusFilter').value;

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

  renderJobs(filtered);
}

async function exportJSON() {
  try {
    if (allJobs.length === 0) {
      alert('No jobs to export.');
      return;
    }

    const dataStr = JSON.stringify(allJobs, null, 2);
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

    console.log(`Exported ${allJobs.length} jobs as JSON`);
  } catch (error) {
    console.error('Error exporting JSON:', error);
    alert('Error exporting JSON: ' + error.message);
  }
}

async function exportCSV() {
  try {
    if (allJobs.length === 0) {
      alert('No jobs to export.');
      return;
    }

    // Create CSV headers
    const headers = ['Job Title', 'Company', 'Location', 'Salary', 'Job Type', 'Remote Type', 'Posted Date', 'Deadline', 'Application Status', 'URL', 'Source', 'Raw Description', 'About the Job', 'About the Company', 'Responsibilities', 'Requirements', 'Updated At'];
    
    // Create CSV rows
    const rows = allJobs.map(job => [
      escapeCsvValue(job.job_title),
      escapeCsvValue(job.company),
      escapeCsvValue(job.location),
      escapeCsvValue(job.salary),
      escapeCsvValue(job.job_type),
      escapeCsvValue(job.remote_type),
      escapeCsvValue(job.posted_date),
      escapeCsvValue(job.deadline),
      escapeCsvValue(job.application_status || 'Saved'),
      escapeCsvValue(job.url),
      escapeCsvValue(job.source),
      escapeCsvValue(job.raw_description),
      escapeCsvValue(job.about_job),
      escapeCsvValue(job.about_company),
      escapeCsvValue(job.responsibilities),
      escapeCsvValue(job.requirements),
      escapeCsvValue(job.updated_at)
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

    console.log(`Exported ${allJobs.length} jobs as CSV`);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    alert('Error exporting CSV: ' + error.message);
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
    allJobs = [];
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('jobsList').innerHTML = '';
    updateStats();
    console.log('All jobs cleared');
  } catch (error) {
    console.error('Error clearing jobs:', error);
    alert('Error clearing jobs: ' + error.message);
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
  
  // Re-render jobs with debug info
  filterJobs();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchInput').addEventListener('input', filterJobs);
  document.getElementById('sourceFilter').addEventListener('change', filterJobs);
  document.getElementById('statusFilter').addEventListener('change', filterJobs);
  document.getElementById('debugToggle').addEventListener('change', toggleDebugMode);
  document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('clearAllBtn').addEventListener('click', clearAllJobs);
  
  // Load jobs on page load
  loadJobs();
});
