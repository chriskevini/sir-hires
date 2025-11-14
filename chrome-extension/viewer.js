// Viewer script for displaying saved jobs
let allJobs = [];

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
    jobsList.innerHTML = jobs.map((job, index) => `
      <div class="job-card">
        <div class="job-header">
          <div>
            <div class="job-title">${escapeHtml(job.job_title)}</div>
            <div class="company">${escapeHtml(job.company)}</div>
          </div>
          ${job.source ? `<span class="badge">${escapeHtml(job.source)}</span>` : ''}
        </div>
        
        <div class="job-meta">
          ${job.location ? `<div class="job-meta-item">📍 ${escapeHtml(job.location)}</div>` : ''}
          ${job.salary ? `<div class="job-meta-item">💰 ${escapeHtml(job.salary)}</div>` : ''}
          ${job.job_type ? `<div class="job-meta-item">💼 ${escapeHtml(job.job_type)}</div>` : ''}
          ${job.remote_type && job.remote_type !== 'Not specified' ? `<div class="job-meta-item">${getRemoteIcon(job.remote_type)} ${escapeHtml(job.remote_type)}</div>` : ''}
          ${job.posted_date ? `<div class="job-meta-item">📅 ${escapeHtml(job.posted_date)}</div>` : ''}
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
    `).join('');
    console.log('Jobs rendered successfully');
    
    // Add event listeners to dynamically created buttons
    attachButtonListeners();
  } catch (error) {
    console.error('Error rendering jobs:', error);
    jobsList.innerHTML = '<div style="color: red; padding: 20px;">Error rendering jobs: ' + error.message + '</div>';
  }
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

function filterJobs() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const sourceFilter = document.getElementById('sourceFilter').value;

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

  renderJobs(filtered);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('searchInput').addEventListener('input', filterJobs);
  document.getElementById('sourceFilter').addEventListener('change', filterJobs);
  
  // Load jobs on page load
  loadJobs();
});
