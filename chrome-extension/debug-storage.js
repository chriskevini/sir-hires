// Debug storage script
async function loadStorage() {
  try {
    const result = await chrome.storage.local.get(null);
    document.getElementById('output').textContent = JSON.stringify(result, null, 2);
    console.log('Storage:', result);
  } catch (error) {
    document.getElementById('output').textContent = 'Error: ' + error.message;
    console.error(error);
  }
}

async function clearStorage() {
  if (!confirm('Clear ALL storage?')) return;
  try {
    await chrome.storage.local.clear();
    document.getElementById('output').textContent = 'Storage cleared!';
    console.log('Storage cleared');
  } catch (error) {
    document.getElementById('output').textContent = 'Error: ' + error.message;
    console.error(error);
  }
}

async function addTestJob() {
  try {
    const result = await chrome.storage.local.get(['jobs']);
    const jobs = result.jobs || [];
    
    jobs.push({
      job_title: 'Test Software Engineer',
      company: 'Test Company Inc',
      location: 'Remote',
      salary: '$100k-$150k',
      job_type: 'Full-time',
      remote_type: 'Remote',
      posted_date: '2025-11-13',
      url: 'https://example.com/job/123',
      source: 'Test Source',
      raw_description: 'This is a test job description',
      about_job: 'Test job details',
      about_company: 'Test company details',
      responsibilities: 'Test responsibilities',
      requirements: 'Test requirements',
      extracted_at: new Date().toISOString(),
      saved_at: new Date().toISOString()
    });

    await chrome.storage.local.set({ jobs });
    document.getElementById('output').textContent = 'Test job added! Total jobs: ' + jobs.length;
    console.log('Test job added');
  } catch (error) {
    document.getElementById('output').textContent = 'Error: ' + error.message;
    console.error(error);
  }
}

// Auto-load on page load
document.addEventListener('DOMContentLoaded', loadStorage);
