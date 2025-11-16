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
      jobTitle: 'Test Software Engineer',
      company: 'Test Company Inc',
      location: 'Remote',
      salary: '$100k-$150k',
      jobType: 'Full-time',
      remoteType: 'Remote',
      postedDate: '2025-11-13',
      url: 'https://example.com/job/123',
      source: 'Test Source',
      rawDescription: 'This is a test job description',
      aboutJob: 'Test job details',
      aboutCompany: 'Test company details',
      responsibilities: 'Test responsibilities',
      requirements: 'Test requirements',
      updatedAt: new Date().toISOString(),
      applicationStatus: 'Saved'
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
