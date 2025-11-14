// Content script that runs on all pages and extracts job data when requested

// Smart extraction logic for job postings
function extractJobData() {
  const data = {
    job_title: '',
    company: '',
    location: '',
    salary: '',
    job_type: '',
    remote_type: '',
    posted_date: '',
    url: window.location.href,
    raw_description: '',
    about_job: '',
    about_company: '',
    responsibilities: '',
    requirements: '',
    extracted_at: new Date().toISOString(),
    source: extractSource()
  };

  // Try multiple strategies to find job title
  data.job_title = findJobTitle();
  
  // Try multiple strategies to find company name
  data.company = findCompany();
  
  // Find location
  data.location = findLocation();
  
  // Find salary if available
  data.salary = findSalary();
  
  // Find job type (Full-time, Part-time, Contract, etc.)
  data.job_type = findJobType();
  
  // Find remote type (Remote, Hybrid, On-site)
  data.remote_type = findRemoteType();
  
  // Find posted date
  data.posted_date = findPostedDate();
  
  // Extract job description (limit to reasonable length)
  data.raw_description = findDescription();
  
  // Extract about sections
  const aboutSections = extractAboutSections();
  data.about_job = aboutSections.about_job;
  data.about_company = aboutSections.about_company;
  
  // Extract responsibilities and requirements
  const sections = extractResponsibilitiesAndRequirements();
  data.responsibilities = sections.responsibilities;
  data.requirements = sections.requirements;

  return data;
}

function extractSource() {
  const hostname = window.location.hostname;
  if (hostname.includes('linkedin.com')) return 'LinkedIn';
  if (hostname.includes('indeed.com')) return 'Indeed';
  if (hostname.includes('glassdoor.com')) return 'Glassdoor';
  if (hostname.includes('monster.com')) return 'Monster';
  if (hostname.includes('ziprecruiter.com')) return 'ZipRecruiter';
  if (hostname.includes('dice.com')) return 'Dice';
  if (hostname.includes('stackoverflow.com')) return 'Stack Overflow';
  if (hostname.includes('greenhouse.io')) return 'Greenhouse';
  if (hostname.includes('lever.co')) return 'Lever';
  if (hostname.includes('workday.com')) return 'Workday';
  return hostname;
}

function findJobTitle() {
  // Try common selectors and patterns
  const selectors = [
    'h1[class*="job"]',
    'h1[class*="title"]',
    '[data-automation="job-title"]',
    '[class*="jobsearch-JobInfoHeader-title"]',
    '[class*="job-title"]',
    'h1.title',
    'h1',
    '[itemprop="title"]',
    'meta[property="og:title"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.getAttribute('content') || element.textContent?.trim();
      if (text && text.length > 3 && text.length < 200) {
        return text;
      }
    }
  }

  // Fallback: look for the first h1 on the page
  const h1 = document.querySelector('h1');
  return h1?.textContent?.trim() || '';
}

function findCompany() {
  const selectors = [
    // LinkedIn
    '.job-details-jobs-unified-top-card__company-name',
    '.jobs-unified-top-card__company-name',
    '.topcard__org-name-link',
    '.topcard__flavor--black-link',
    // Indeed
    '[data-company-name="true"]',
    '[class*="jobsearch-InlineCompanyRating"] [class*="companyName"]',
    '[data-testid="inlineHeader-companyName"]',
    // Generic
    '[class*="company-name"]',
    '[class*="companyName"]',
    '[data-automation="company-name"]',
    '[class*="employer"]',
    '[itemprop="hiringOrganization"]',
    'a[data-tn-element="companyName"]',
    '[class*="CompanyInfo"]',
    '[class*="company"]',
    // Meta tags
    'meta[property="og:site_name"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.getAttribute('content') || element.textContent?.trim();
      if (text && text.length > 1 && text.length < 100) {
        // Clean up common prefixes/suffixes
        const cleaned = text.replace(/^(at|@)\s+/i, '').replace(/\s+\|.*$/, '').trim();
        if (cleaned) return cleaned;
      }
    }
  }

  return '';
}

function findLocation() {
  const selectors = [
    // LinkedIn
    '.job-details-jobs-unified-top-card__bullet',
    '.jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet',
    // Indeed
    '[data-testid="inlineHeader-companyLocation"]',
    '[class*="jobsearch-JobInfoHeader-subtitle"] [class*="location"]',
    // Generic
    '[class*="job-location"]',
    '[class*="jobLocation"]',
    '[data-automation="job-location"]',
    '[itemprop="jobLocation"]',
    '[class*="location"]',
    '[class*="CompanyLocation"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      let text = element.textContent?.trim();
      if (!text) continue;
      
      // Clean up common formatting
      text = text.replace(/^·\s*/, '').replace(/^\|\s*/, '').trim();
      
      // Basic validation - should look like a location
      if (text && text.length > 2 && text.length < 200) {
        // Check if it looks like a location (has comma, state code, or "remote")
        if (text.includes(',') || 
            text.match(/\b[A-Z]{2}\b/) || 
            text.toLowerCase().includes('remote') ||
            text.toLowerCase().includes('hybrid') ||
            text.match(/\d{5}/) || // ZIP code
            text.includes('USA') || text.includes('United States')) {
          return text;
        }
      }
    }
  }

  return '';
}

function findSalary() {
  // Enhanced salary patterns to capture ranges better
  const salaryPatterns = [
    // US Dollars with ranges
    /\$\s*[\d,]+(?:k|K)?\s*[-–—to]\s*\$?\s*[\d,]+(?:k|K)?(?:\s*(?:per|\/|a)\s*(?:hour|year|yr|hr|month|mo|annum))?/gi,
    /\$\s*[\d,]+(?:\s*(?:per|\/|a)\s*(?:hour|year|yr|hr|month|mo|annum))?/gi,
    // Shortened format (e.g., "100k-150k")
    /[\d,]+k\s*[-–—to]\s*[\d,]+k(?:\s*(?:per|\/|a)\s*(?:year|yr|annum))?/gi,
    // British Pounds
    /£\s*[\d,]+(?:k|K)?\s*[-–—to]\s*£?\s*[\d,]+(?:k|K)?/gi,
    /£\s*[\d,]+/gi,
    // Euros
    /€\s*[\d,]+(?:k|K)?\s*[-–—to]\s*€?\s*[\d,]+(?:k|K)?/gi,
    /€\s*[\d,]+/gi
  ];

  const selectors = [
    // LinkedIn
    '.job-details-jobs-unified-top-card__job-insight--highlight',
    '.jobs-unified-top-card__job-insight',
    // Indeed
    '[class*="salary-snippet"]',
    '[id*="salaryInfoAndJobType"]',
    // Generic
    '[class*="salary"]',
    '[class*="compensation"]',
    '[class*="pay-range"]',
    '[class*="payRange"]',
    '[data-automation="job-salary"]',
    '[class*="wage"]'
  ];

  // First try specific salary selectors
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && (text.includes('$') || text.includes('£') || text.includes('€') || text.match(/\d+k/i))) {
        // Try to extract just the salary part if there's other text
        for (const pattern of salaryPatterns) {
          const match = text.match(pattern);
          if (match) return match[0].trim();
        }
        return text;
      }
    }
  }

  // Then search for salary patterns in visible text near the top of the page
  const topSection = document.querySelector('header, [role="main"], main, article')?.innerText || document.body.innerText;
  const firstPart = topSection.substring(0, 3000); // Only search first part
  
  for (const pattern of salaryPatterns) {
    pattern.lastIndex = 0; // Reset regex
    const match = firstPart.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return '';
}

function findJobType() {
  const jobTypes = ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'freelance', 'remote'];
  const pageText = document.body.innerText.toLowerCase();

  for (const type of jobTypes) {
    if (pageText.includes(type)) {
      return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-');
    }
  }

  return '';
}

function findRemoteType() {
  const pageText = document.body.innerText.toLowerCase();
  
  // Check for explicit remote/hybrid/on-site mentions
  if (pageText.includes('fully remote') || pageText.includes('100% remote') || pageText.includes('remote work')) {
    return 'Remote';
  }
  if (pageText.includes('hybrid')) {
    return 'Hybrid';
  }
  if (pageText.includes('on-site') || pageText.includes('onsite') || pageText.includes('in-office') || pageText.includes('in office')) {
    return 'On-site';
  }
  if (pageText.includes('remote')) {
    return 'Remote';
  }
  
  // Check location field for remote indicators
  const location = findLocation().toLowerCase();
  if (location.includes('remote')) {
    return 'Remote';
  }
  if (location.includes('hybrid')) {
    return 'Hybrid';
  }

  return 'Not specified';
}

function findPostedDate() {
  const selectors = [
    '[class*="date"]',
    '[class*="posted"]',
    'time',
    '[datetime]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const datetime = element.getAttribute('datetime');
      if (datetime) return datetime;
      
      const text = element.textContent?.trim();
      if (text && text.match(/\d/)) {
        return text;
      }
    }
  }

  return '';
}

function findDescription() {
  // Strategy 1: Try semantic HTML and common patterns
  const selectors = [
    // Semantic HTML
    'main',
    '[role="main"]',
    'article',
    '[role="article"]',
    // Common job description patterns (substring match)
    '[class*="description"]',
    '[class*="job-detail"]',
    '[class*="job-content"]',
    '[id*="description"]',
    '[id*="job-detail"]',
    '[itemprop="description"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Use innerText for better formatting (respects CSS visibility)
      let text = element.innerText?.trim() || element.textContent?.trim() || '';
      
      // Limit description length to keep data manageable
      if (text.length > 5000) {
        text = text.substring(0, 5000) + '...';
      }
      
      if (text.length > 500) {  // Increased threshold to avoid small snippets
        console.log('[Content] Raw description extracted via selector:', selector, '(length:', text.length, ')');
        console.log('[Content] First 500 chars:', text.substring(0, 500));
        return text;
      }
    }
  }

  // Strategy 2: Find headings that indicate job description sections
  const descriptionKeywords = [
    'job description',
    'about the role',
    'about this role',
    'description',
    'position description',
    'role description'
  ];
  
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b');
  for (const heading of headings) {
    const headingText = heading.textContent.toLowerCase().trim();
    
    if (descriptionKeywords.some(keyword => headingText === keyword || headingText.includes(keyword))) {
      // Found a description heading - get the parent container
      let container = heading.parentElement;
      if (container) {
        let text = container.innerText?.trim() || container.textContent?.trim() || '';
        if (text.length > 5000) {
          text = text.substring(0, 5000) + '...';
        }
        if (text.length > 500) {
          console.log('[Content] Raw description extracted via heading:', headingText, '(length:', text.length, ')');
          console.log('[Content] First 500 chars:', text.substring(0, 500));
          return text;
        }
      }
    }
  }

  // Strategy 3: Find the largest text block on the page (heuristic)
  // This catches job descriptions that don't follow common patterns
  const candidates = document.querySelectorAll('div, section, article, main');
  let largestText = '';
  let largestElement = null;
  
  for (const candidate of candidates) {
    // Skip if it contains too many nested containers (likely a wrapper)
    const nestedDivs = candidate.querySelectorAll('div, section').length;
    if (nestedDivs > 20) continue;
    
    const text = candidate.innerText?.trim() || '';
    
    // Must be substantial text (likely job description)
    if (text.length > largestText.length && text.length > 500 && text.length < 20000) {
      largestText = text;
      largestElement = candidate;
    }
  }
  
  if (largestText.length > 500) {
    let text = largestText;
    if (text.length > 5000) {
      text = text.substring(0, 5000) + '...';
    }
    console.log('[Content] Raw description extracted via largest text block (length:', text.length, ')');
    console.log('[Content] First 500 chars:', text.substring(0, 500));
    return text;
  }

  console.log('[Content] No raw description found via DOM');
  return '';
}

function extractAboutSections() {
  const result = {
    about_job: '',
    about_company: ''
  };

  // Keywords that indicate sections
  const aboutJobKeywords = [
    'about the job', 'about this job', 'about the role', 'about this role',
    'the opportunity', 'job summary', 'position summary', 'role overview'
  ];
  
  const aboutCompanyKeywords = [
    'about the company', 'about us', 'about the team', 'about our company',
    'who we are', 'our company', 'the company', 'company overview', 'company description'
  ];

  // Get the job description element
  const descriptionSelectors = [
    '[class*="description"]',
    '[class*="job-detail"]',
    '[id*="description"]',
    '[itemprop="description"]',
    'article',
    '[role="article"]'
  ];

  let descriptionElement = null;
  for (const selector of descriptionSelectors) {
    descriptionElement = document.querySelector(selector);
    if (descriptionElement && descriptionElement.textContent.length > 200) {
      break;
    }
  }

  if (!descriptionElement) return result;

  // Look for section headings
  const headings = descriptionElement.querySelectorAll('h1, h2, h3, h4, strong, b, [class*="heading"], [class*="title"]');
  
  let aboutJobText = [];
  let aboutCompanyText = [];

  headings.forEach((heading, index) => {
    const headingText = heading.textContent.trim().toLowerCase();
    
    // Check if this heading matches "about the job"
    if (aboutJobKeywords.some(keyword => headingText.includes(keyword))) {
      const content = extractContentAfterHeading(heading, headings[index + 1]);
      if (content) aboutJobText.push(content);
    }
    // Check if this heading matches "about the company"
    else if (aboutCompanyKeywords.some(keyword => headingText.includes(keyword))) {
      const content = extractContentAfterHeading(heading, headings[index + 1]);
      if (content) aboutCompanyText.push(content);
    }
  });

  result.about_job = aboutJobText.join('\n\n').substring(0, 3000);
  result.about_company = aboutCompanyText.join('\n\n').substring(0, 3000);

  return result;
}

function extractResponsibilitiesAndRequirements() {
  const result = {
    responsibilities: '',
    requirements: ''
  };

  // Keywords that indicate sections
  const responsibilityKeywords = [
    'responsibilities', 'what you\'ll do', 'what you will do', 'your role',
    'duties', 'day-to-day', 'you will', 'the role', 'your impact'
  ];
  
  const requirementKeywords = [
    'requirements', 'qualifications', 'what we\'re looking for', 
    'what we are looking for', 'you have', 'you are', 'must have',
    'skills', 'experience', 'ideal candidate', 'you bring'
  ];

  // Get the job description element
  const descriptionSelectors = [
    '[class*="description"]',
    '[class*="job-detail"]',
    '[id*="description"]',
    '[itemprop="description"]',
    'article',
    '[role="article"]'
  ];

  let descriptionElement = null;
  for (const selector of descriptionSelectors) {
    descriptionElement = document.querySelector(selector);
    if (descriptionElement && descriptionElement.textContent.length > 200) {
      break;
    }
  }

  if (!descriptionElement) return result;

  // Look for section headings
  const headings = descriptionElement.querySelectorAll('h1, h2, h3, h4, strong, b, [class*="heading"], [class*="title"]');
  
  let currentSection = null;
  let responsibilitiesText = [];
  let requirementsText = [];

  headings.forEach((heading, index) => {
    const headingText = heading.textContent.trim().toLowerCase();
    
    // Check if this heading matches responsibilities
    if (responsibilityKeywords.some(keyword => headingText.includes(keyword))) {
      currentSection = 'responsibilities';
      
      // Extract content after this heading until next major heading
      const content = extractContentAfterHeading(heading, headings[index + 1]);
      if (content) responsibilitiesText.push(content);
    }
    // Check if this heading matches requirements
    else if (requirementKeywords.some(keyword => headingText.includes(keyword))) {
      currentSection = 'requirements';
      
      // Extract content after this heading until next major heading
      const content = extractContentAfterHeading(heading, headings[index + 1]);
      if (content) requirementsText.push(content);
    }
  });

  result.responsibilities = responsibilitiesText.join('\n\n').substring(0, 3000);
  result.requirements = requirementsText.join('\n\n').substring(0, 3000);

  return result;
}

function extractContentAfterHeading(startElement, endElement) {
  let content = [];
  let currentElement = startElement.nextElementSibling;
  
  while (currentElement) {
    // Stop if we hit the next heading
    if (endElement && currentElement === endElement) break;
    
    // Stop if we hit another heading
    const tagName = currentElement.tagName?.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) break;
    
    // Collect text content
    const text = currentElement.textContent?.trim();
    if (text && text.length > 10) {
      content.push(text);
    }
    
    // Don't go too far
    if (content.length > 20) break;
    
    currentElement = currentElement.nextElementSibling;
  }
  
  return content.join('\n').trim();
}

// Extract raw text from the page for LLM processing
function extractRawJobText() {
  // Strategy 1: Try semantic HTML and common patterns
  const selectors = [
    // Semantic HTML
    'main',
    '[role="main"]',
    'article',
    '[role="article"]',
    // Common description patterns
    '[class*="description"]',
    '[class*="job-detail"]',
    '[class*="job-content"]',
    '[id*="description"]',
    '[id*="job-detail"]',
    '[itemprop="description"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Use innerText for better formatted text
      let text = element.innerText || element.textContent || '';
      text = text.trim();
      
      // Get a reasonable amount of text (not too much for the LLM)
      if (text.length > 10000) {
        text = text.substring(0, 10000);
      }
      
      if (text.length > 500) {  // Increased threshold
        console.log('[Content] Raw text extracted for LLM via selector:', selector, '(length:', text.length, ')');
        console.log('[Content] First 500 chars:', text.substring(0, 500));
        return text;
      }
    }
  }

  // Strategy 2: Find headings that indicate job description sections
  const descriptionKeywords = [
    'job description',
    'about the role',
    'about this role',
    'description',
    'position description'
  ];
  
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b');
  for (const heading of headings) {
    const headingText = heading.textContent.toLowerCase().trim();
    
    if (descriptionKeywords.some(keyword => headingText === keyword || headingText.includes(keyword))) {
      let container = heading.parentElement;
      if (container) {
        let text = container.innerText || container.textContent || '';
        text = text.trim();
        if (text.length > 10000) {
          text = text.substring(0, 10000);
        }
        if (text.length > 500) {
          console.log('[Content] Raw text extracted for LLM via heading:', headingText, '(length:', text.length, ')');
          console.log('[Content] First 500 chars:', text.substring(0, 500));
          return text;
        }
      }
    }
  }

  // Strategy 3: Find the largest text block on the page
  const candidates = document.querySelectorAll('div, section, article, main');
  let largestText = '';
  
  for (const candidate of candidates) {
    // Skip if it contains too many nested containers (likely a wrapper)
    const nestedDivs = candidate.querySelectorAll('div, section').length;
    if (nestedDivs > 20) continue;
    
    const text = candidate.innerText?.trim() || '';
    
    // Must be substantial text (likely job description)
    if (text.length > largestText.length && text.length > 500 && text.length < 20000) {
      largestText = text;
    }
  }
  
  if (largestText.length > 500) {
    let text = largestText;
    if (text.length > 10000) {
      text = text.substring(0, 10000);
    }
    console.log('[Content] Raw text extracted for LLM via largest text block (length:', text.length, ')');
    console.log('[Content] First 500 chars:', text.substring(0, 500));
    return text;
  }

  // Last resort: get body text
  const bodyText = document.body.innerText || document.body.textContent || '';
  const truncated = bodyText.substring(0, 10000);
  console.log('[Content] Raw text extracted for LLM - fallback to body (length:', truncated.length, ')');
  console.log('[Content] First 500 chars:', truncated.substring(0, 500));
  return truncated;
}

// Use LLM to extract ALL fields from raw job posting text
// Following NuExtract 2.0 best practices: https://huggingface.co/numind/NuExtract-2.0-8B
//
// NuExtract is a specialized model for structured information extraction.
// Key features:
// - Uses a JSON template with type annotations (verbatim-string, string, integer, enum, etc.)
// - Requires temperature at or very close to 0 for consistent extraction
// - Expects format: # Template:\n{json_template}\n# Context:\n{input_text}
// - Returns clean JSON directly without markdown wrapping
//
// Supported types:
// - "verbatim-string": Extract text exactly as it appears
// - "string": Generic string (can paraphrase/abstract)
// - "integer", "number": Numeric values
// - "date-time": ISO formatted dates
// - ["option1", "option2"]: Enum (single choice)
// - [["A", "B", "C"]]: Multi-label (multiple choices)
async function extractAllFieldsWithLLM(rawText, llmSettings) {
  try {
    // Define the extraction template using NuExtract's type system
    const extractionTemplate = {
      "job_title": "verbatim-string",
      "company": "verbatim-string",
      "location": "verbatim-string",
      "salary": "verbatim-string",
      "job_type": ["Full-time", "Part-time", "Contract", "Temporary", "Internship", "Freelance"],
      "remote_type": ["Remote", "Hybrid", "On-site", "Not specified"],
      "posted_date": "verbatim-string",
      "raw_description": "string",
      "about_job": "string",
      "about_company": "string",
      "responsibilities": "string",
      "requirements": "string"
    };

    // Format for NuExtract: use the template in the prompt structure
    // NuExtract expects: # Template:\n{template}\n# Context:\n{context}
    const templateStr = JSON.stringify(extractionTemplate, null, 2);
    const promptContent = `# Template:\n${templateStr}\n# Context:\n${rawText}`;

    const requestBody = {
      model: llmSettings.model || 'local-model',
      messages: [
        {
          role: 'user',
          content: promptContent
        }
      ],
      max_tokens: 2000,
      temperature: 0.0  // NuExtract recommends temperature at or very close to 0
    };

    // Call background script to make the API request
    const response = await chrome.runtime.sendMessage({
      action: 'callLLM',
      endpoint: llmSettings.endpoint,
      requestBody: requestBody
    });

    console.log('[Content] LLM response received:', response);

    if (!response) {
      throw new Error('No response from background script - message channel may have closed');
    }

    if (!response.success) {
      throw new Error(response.error || 'LLM API call failed');
    }

    const data = response.data;
    
    // Extract the response text from LM Studio format
    const llmResponse = data.choices?.[0]?.message?.content || '';
    
    if (!llmResponse) {
      throw new Error('Empty response from LLM');
    }

    console.log('LLM Response:', llmResponse); // Debug

    // NuExtract returns clean JSON directly (no markdown formatting)
    // But we'll still handle edge cases
    let jsonStr = llmResponse.trim();
    
    // Remove markdown code blocks if present (shouldn't be needed with NuExtract)
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    }
    
    // Try to find JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const extracted = JSON.parse(jsonStr);

    console.log('[Content] LLM extracted raw_description (length:', (extracted.raw_description || '').length, '):', extracted.raw_description);

    // Return the extracted data
    return {
      job_title: extracted.job_title || '',
      company: extracted.company || '',
      location: extracted.location || '',
      salary: extracted.salary || '',
      job_type: extracted.job_type || '',
      remote_type: extracted.remote_type || '',
      posted_date: extracted.posted_date || '',
      raw_description: extracted.raw_description || '',
      about_job: extracted.about_job || '',
      about_company: extracted.about_company || '',
      responsibilities: extracted.responsibilities || '',
      requirements: extracted.requirements || '',
      url: '',  // Will be set by caller
      source: '', // Will be set by caller
      extracted_at: '' // Will be set by caller
    };

  } catch (error) {
    console.error('Error in LLM extraction:', error);
    throw error;
  }
}

// LLM-powered extraction (legacy - for partial extraction)
async function extractWithLLM(jobData, llmSettings) {
  try {
    const prompt = `You are a job posting analyzer. Extract the responsibilities and requirements from this job posting.

Job Description:
${jobData.raw_description}

Please analyze the above job description and provide:
1. A list of key responsibilities (what the person will do in this role)
2. A list of requirements/qualifications (skills, experience, education needed)

Return ONLY a JSON object in this exact format with no additional text:
{
  "responsibilities": "List of responsibilities as a single text string with line breaks",
  "requirements": "List of requirements as a single text string with line breaks"
}`;

    const requestBody = {
      model: llmSettings.model || 'local-model',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that extracts structured information from job postings. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.3  // Lower temperature for more consistent extraction
    };

    // Call background script to make the API request (content scripts can't access localhost)
    const response = await chrome.runtime.sendMessage({
      action: 'callLLM',
      endpoint: llmSettings.endpoint,
      requestBody: requestBody
    });

    if (!response.success) {
      throw new Error(response.error || 'LLM API call failed');
    }

    const data = response.data;
    
    // Extract the response text from LM Studio format
    const llmResponse = data.choices?.[0]?.message?.content || '';
    
    if (!llmResponse) {
      throw new Error('Empty response from LLM');
    }

    // Try to parse JSON from the response
    // Sometimes LLMs add markdown code blocks, so we need to extract the JSON
    let jsonStr = llmResponse;
    const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const extracted = JSON.parse(jsonStr);

    // Update job data with LLM-extracted information
    if (extracted.responsibilities) {
      jobData.responsibilities = extracted.responsibilities;
    }
    if (extracted.requirements) {
      jobData.requirements = extracted.requirements;
    }

    return jobData;

  } catch (error) {
    console.error('Error in LLM extraction:', error);
    throw error;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractJobData') {
    (async () => {
      try {
        const llmSettings = request.llmSettings || { enabled: false };
        let jobData;
        let usedLlm = false;

        // If LLM is enabled, try to extract everything with LLM
        if (llmSettings.enabled && llmSettings.endpoint) {
          try {
            console.log('[Content] Using LLM for full extraction...');
            const rawText = extractRawJobText();
            console.log('[Content] Extracted raw text length:', rawText.length);
            
            jobData = await extractAllFieldsWithLLM(rawText, llmSettings);
            
            // Add fields that LLM doesn't set
            jobData.url = window.location.href;
            jobData.source = extractSource();
            jobData.extracted_at = new Date().toISOString();
            
            usedLlm = true;
            console.log('[Content] LLM extraction successful');
          } catch (error) {
            console.error('[Content] LLM extraction failed:', error.message);
            console.warn('[Content] Falling back to DOM extraction');
            
            // Fall back to DOM extraction if LLM fails
            jobData = extractJobData();
            
            // Add a note about the failure
            jobData.extraction_note = `LLM extraction failed: ${error.message}. Using DOM extraction instead.`;
          }
        } else {
          // Use traditional DOM extraction
          console.log('[Content] Using DOM extraction (LLM disabled)...');
          jobData = extractJobData();
        }

        sendResponse({ success: true, data: jobData, usedLlm: usedLlm });
      } catch (error) {
        console.error('Error extracting job data:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Keep the message channel open for async response
  }
});
