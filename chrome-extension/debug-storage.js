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
    const jobs = result.jobs || {};
    
    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create test job with new schema (including content field)
    const testJob = {
      id: jobId,
      jobTitle: 'Senior Cloud Infrastructure Engineer',
      company: 'Stellar Innovations Inc',
      location: 'San Francisco, CA',
      salary: '$100,000 - $150,000',
      jobType: 'Full-time',
      remoteType: 'Hybrid',
      postedDate: '2025-11-15',
      deadline: '2025-12-31',
      url: 'https://example.com/job/cloud-engineer',
      source: 'Test Source',
      rawDescription: 'Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.',
      aboutJob: 'Senior-level cloud infrastructure role at a high-growth FinTech startup.',
      aboutCompany: 'Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.',
      responsibilities: 'Design and maintain cloud infrastructure, develop CI/CD pipelines, provide expertise on security and optimization.',
      requirements: '7+ years DevOps/SRE experience, Terraform, Kubernetes, Python or Go.',
      updatedAt: new Date().toISOString(),
      applicationStatus: 'Researching',
      statusHistory: [
        { status: 'Researching', date: new Date().toISOString() }
      ],
      checklist: {
        'Researching': [
          { id: 'check_1', text: 'Review job requirements', checked: false, order: 0 },
          { id: 'check_2', text: 'Research company culture', checked: false, order: 1 },
          { id: 'check_3', text: 'Analyze tech stack fit', checked: false, order: 2 }
        ]
      },
      // NEW: content field (markdown-formatted job template)
      content: `<JOB>
TITLE: Senior Cloud Infrastructure Engineer
COMPANY: Stellar Innovations Inc
ADDRESS: San Francisco, CA
REMOTE_TYPE: HYBRID
SALARY_RANGE_MIN: 100,000
SALARY_RANGE_MAX: 150,000
EMPLOYMENT_TYPE: FULL-TIME
EXPERIENCE_LEVEL: SENIOR
POSTED_DATE: 2025-11-15
CLOSING_DATE: 2025-12-31

# DESCRIPTION:
- Design, implement, and maintain scalable cloud infrastructure on AWS/Azure.
- Develop and manage CI/CD pipelines using GitLab or Jenkins.
- Provide subject matter expertise on security, reliability, and cost optimization.

# REQUIRED_SKILLS:
- 7+ years of experience in DevOps or SRE roles.
- Expert-level proficiency with Terraform and Kubernetes.
- Strong knowledge of Python or Go for scripting.

# PREFERRED_SKILLS:
- Experience with FinOps principles and tooling.
- AWS Certified DevOps Engineer - Professional.
- Background in the FinTech industry.

# ABOUT_COMPANY:
- Stellar Innovations is a high-growth Series C FinTech startup based in the Bay Area.
- Culture: We emphasize radical ownership, transparency, and continuous learning.
- Team Structure: Teams are cross-functional, highly autonomous, and empowered to make core product decisions.
- Benefits: We offer unlimited PTO, 100% 401(k) matching and excellent health coverage.
- Values: We are committed to fostering diversity, equity, and inclusion in the workplace.`
    };
    
    // Store job (jobs is now an object keyed by ID, not array)
    jobs[jobId] = testJob;

    await chrome.storage.local.set({ 
      jobs,
      jobInFocus: jobId // Set this job as focused
    });
    
    const jobCount = Object.keys(jobs).length;
    document.getElementById('output').textContent = `Test job added with content field! Total jobs: ${jobCount}`;
    console.log('Test job added with ID:', jobId);
  } catch (error) {
    document.getElementById('output').textContent = 'Error: ' + error.message;
    console.error(error);
  }
}

// Auto-load on page load and attach event listeners
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  
  // Attach button event listeners
  document.getElementById('loadBtn').addEventListener('click', loadStorage);
  document.getElementById('clearBtn').addEventListener('click', clearStorage);
  document.getElementById('testBtn').addEventListener('click', addTestJob);
});
