import type { Browser } from 'wxt/browser';

// Content script that runs on all pages and extracts job data when requested

/**
 * Extracted job data interface
 */
interface ExtractedJobData {
  jobTitle?: string;
  company?: string;
  location?: string;
  remoteType?: string;
  salary?: string;
  jobType?: string;
  postedDate?: string;
  deadline?: string;
  aboutJob?: string;
  rawDescription?: string;
  requirements?: string;
  responsibilities?: string;
  aboutCompany?: string;
}

/**
 * LLM settings interface
 */
interface LLMSettings {
  endpoint: string;
  modelsEndpoint?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',

  main() {
    // All the extraction logic runs when the content script loads
    setupMessageListener();
  },
});

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

/**
 * Generate markdown content field from extracted job data
 * @param data - The extracted job data object
 * @returns Markdown-formatted job template
 */
function generateJobContent(data: ExtractedJobData): string {
  const lines = ['<JOB>'];

  // Top-level fields
  if (data.jobTitle) lines.push(`TITLE: ${data.jobTitle}`);
  if (data.company) lines.push(`COMPANY: ${data.company}`);
  if (data.location) lines.push(`ADDRESS: ${data.location}`);

  // Remote type (convert to uppercase enum)
  if (data.remoteType && data.remoteType !== 'Not specified') {
    const remoteTypeUpper = data.remoteType.toUpperCase().replace('-', '');
    lines.push(`REMOTE_TYPE: ${remoteTypeUpper}`);
  }

  // Parse salary into min/max if possible
  if (data.salary) {
    const salaryMatch = data.salary.match(
      /\$?([\d,]+)(?:\s*(?:-|to)\s*\$?([\d,]+))?/i
    );
    if (salaryMatch) {
      const min = salaryMatch[1].replace(/,/g, '');
      const max = salaryMatch[2] ? salaryMatch[2].replace(/,/g, '') : null;
      if (min) lines.push(`SALARY_RANGE_MIN: ${min}`);
      if (max) lines.push(`SALARY_RANGE_MAX: ${max}`);
    }
  }

  // Employment type (convert to uppercase enum)
  if (data.jobType) {
    const jobTypeUpper = data.jobType.toUpperCase().replace('-', '_');
    lines.push(`EMPLOYMENT_TYPE: ${jobTypeUpper}`);
  }

  // Experience level (try to infer from job title if not available)
  const experienceLevel = inferExperienceLevel(data.jobTitle);
  if (experienceLevel) {
    lines.push(`EXPERIENCE_LEVEL: ${experienceLevel}`);
  }

  // Dates
  if (data.postedDate) lines.push(`POSTED_DATE: ${data.postedDate}`);
  if (data.deadline) lines.push(`CLOSING_DATE: ${data.deadline}`);

  // Add blank line before sections
  lines.push('');

  // Description section
  if (data.aboutJob || data.rawDescription) {
    lines.push('# DESCRIPTION:');
    const description = data.aboutJob || data.rawDescription;
    // Convert to bullet points if not already
    const descLines = description.split('\n').filter((l: string) => l.trim());
    descLines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        lines.push(trimmed.replace(/^[•]\s*/, '- '));
      } else {
        lines.push(`- ${trimmed}`);
      }
    });
    lines.push('');
  }

  // Required skills section
  if (data.requirements) {
    lines.push('# REQUIRED_SKILLS:');
    const reqLines = data.requirements
      .split('\n')
      .filter((l: string) => l.trim());
    reqLines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        lines.push(trimmed.replace(/^[•]\s*/, '- '));
      } else {
        lines.push(`- ${trimmed}`);
      }
    });
    lines.push('');
  }

  // Responsibilities section (if different from description)
  if (data.responsibilities && data.responsibilities !== data.aboutJob) {
    lines.push('# RESPONSIBILITIES:');
    const respLines = data.responsibilities
      .split('\n')
      .filter((l: string) => l.trim());
    respLines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        lines.push(trimmed.replace(/^[•]\s*/, '- '));
      } else {
        lines.push(`- ${trimmed}`);
      }
    });
    lines.push('');
  }

  // About company section
  if (data.aboutCompany) {
    lines.push('# ABOUT_COMPANY:');
    const companyLines = data.aboutCompany
      .split('\n')
      .filter((l: string) => l.trim());
    companyLines.forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        lines.push(trimmed.replace(/^[•]\s*/, '- '));
      } else {
        lines.push(`- ${trimmed}`);
      }
    });
  }

  return lines.join('\n');
}

/**
 * Infer experience level from job title
 * @param {string} title - Job title
 * @returns {string} Experience level (ENTRY|MID|SENIOR|LEAD|null)
 */
function inferExperienceLevel(title: string | undefined): string | null {
  if (!title) return null;
  const titleLower = title.toLowerCase();

  if (titleLower.match(/\b(junior|jr|entry|associate|i\b|1\b)/)) return 'ENTRY';
  if (titleLower.match(/\b(senior|sr|lead|principal|staff|iii\b|iv\b|3\b|4\b)/))
    return 'SENIOR';
  if (titleLower.match(/\b(lead|principal|architect|director|head|chief)/))
    return 'LEAD';
  if (titleLower.match(/\b(ii\b|2\b)/)) return 'MID';

  // Default to MID if no indicator
  return 'MID';
}

// Helper function to parse various date formats and return YYYY-MM-DD
// Returns dates in local timezone to avoid timezone shift issues
function parseToISODate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';

  try {
    // If it's already YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // If it's a full ISO timestamp, extract just the date part
    if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
      return dateStr.split('T')[0];
    }

    // Handle relative dates like "2 days ago", "1 week ago", etc.
    const relativeMatch = dateStr.match(
      /(\d+)\s*(second|minute|hour|day|week|month|year)s?\s*ago/i
    );
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1]);
      const unit = relativeMatch[2].toLowerCase();
      const now = new Date();

      switch (unit) {
        case 'second':
          now.setSeconds(now.getSeconds() - amount);
          break;
        case 'minute':
          now.setMinutes(now.getMinutes() - amount);
          break;
        case 'hour':
          now.setHours(now.getHours() - amount);
          break;
        case 'day':
          now.setDate(now.getDate() - amount);
          break;
        case 'week':
          now.setDate(now.getDate() - amount * 7);
          break;
        case 'month':
          now.setMonth(now.getMonth() - amount);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() - amount);
          break;
      }

      // Return YYYY-MM-DD format using local timezone
      return formatLocalDate(now);
    }

    // Handle "today", "yesterday"
    if (/^today$/i.test(dateStr.trim())) {
      return formatLocalDate(new Date());
    }
    if (/^yesterday$/i.test(dateStr.trim())) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return formatLocalDate(yesterday);
    }

    // Check if date string lacks a year (e.g., "Nov 13", "December 25")
    // Pattern: month name/abbreviation followed by day, no 4-digit year
    const hasYear = /\b(19|20)\d{2}\b/.test(dateStr);

    if (!hasYear) {
      // Add current year to the date string - user can correct via date picker if wrong
      const currentYear = new Date().getFullYear();
      const parsed = new Date(dateStr + ', ' + currentYear);

      if (!isNaN(parsed.getTime())) {
        return formatLocalDate(parsed);
      }
    }

    // Try to parse as a standard date string
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return formatLocalDate(parsed);
    }

    // If all else fails, return empty string
    return '';
  } catch (error) {
    console.warn('Failed to parse date:', dateStr, error);
    return '';
  }
}

// Helper to format a Date object as YYYY-MM-DD in local timezone
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    '[itemprop="description"]',
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      // Use innerText for better formatted text
      let text =
        (element as HTMLElement).innerText || element.textContent || '';
      text = text.trim();

      // Get a reasonable amount of text (not too much for the LLM)
      if (text.length > 10000) {
        text = text.substring(0, 10000);
      }

      if (text.length > 500) {
        // Increased threshold
        console.info(
          '[Content] Raw text extracted for LLM via selector:',
          selector,
          '(length:',
          text.length,
          ')'
        );
        console.info('[Content] First 500 chars:', text.substring(0, 500));
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
  ];

  const headings = document.querySelectorAll(
    'h1, h2, h3, h4, h5, h6, strong, b'
  );
  for (const heading of headings) {
    const headingText = heading.textContent.toLowerCase().trim();

    if (
      descriptionKeywords.some(
        (keyword) => headingText === keyword || headingText.includes(keyword)
      )
    ) {
      let container = heading.parentElement;
      if (container) {
        let text =
          (container as HTMLElement).innerText || container.textContent || '';
        text = text.trim();
        if (text.length > 10000) {
          text = text.substring(0, 10000);
        }
        if (text.length > 500) {
          console.info(
            '[Content] Raw text extracted for LLM via heading:',
            headingText,
            '(length:',
            text.length,
            ')'
          );
          console.info('[Content] First 500 chars:', text.substring(0, 500));
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

    const text = (candidate as HTMLElement).innerText?.trim() || '';

    // Must be substantial text (likely job description)
    if (
      text.length > largestText.length &&
      text.length > 500 &&
      text.length < 20000
    ) {
      largestText = text;
    }
  }

  if (largestText.length > 500) {
    let text = largestText;
    if (text.length > 10000) {
      text = text.substring(0, 10000);
    }
    console.info(
      '[Content] Raw text extracted for LLM via largest text block (length:',
      text.length,
      ')'
    );
    console.info('[Content] First 500 chars:', text.substring(0, 500));
    return text;
  }

  // Last resort: get body text
  const bodyText = document.body.innerText || document.body.textContent || '';
  const truncated = bodyText.substring(0, 10000);
  console.info(
    '[Content] Raw text extracted for LLM - fallback to body (length:',
    truncated.length,
    ')'
  );
  console.info('[Content] First 500 chars:', truncated.substring(0, 500));
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
async function _extractAllFieldsWithLLM(
  rawText: string,
  llmSettings: LLMSettings
): Promise<ExtractedJobData> {
  try {
    // Define the extraction template using NuExtract's type system
    const extractionTemplate = {
      jobTitle: 'verbatim-string',
      company: 'verbatim-string',
      location: 'verbatim-string',
      salary: 'verbatim-string',
      jobType: [
        'Full-time',
        'Part-time',
        'Contract',
        'Temporary',
        'Internship',
        'Freelance',
      ],
      remoteType: ['Remote', 'Hybrid', 'On-site', 'Not specified'],
      postedDate: 'verbatim-string',
      deadline: 'verbatim-string',
      aboutJob: 'verbatim-string',
      aboutCompany: 'verbatim-string',
      responsibilities: 'verbatim-string',
      requirements: 'verbatim-string',
    };

    // Format for NuExtract: use the template in the prompt structure
    // NuExtract expects: # Template:\n{template}\n# Context:\n{context}
    const templateStr = JSON.stringify(extractionTemplate, null, 2);
    const promptContent = `# Template:\n${templateStr}\n# Context:\n${rawText}`;

    console.info(
      '[Content] Extraction template being sent to LLM:',
      extractionTemplate
    );

    const requestBody = {
      model: llmSettings.model || 'local-model',
      messages: [
        {
          role: 'user',
          content: promptContent,
        },
      ],
      max_tokens: 2000,
      temperature: 0.0, // NuExtract recommends temperature at or very close to 0
    };

    // Call background script to make the API request
    const response = await browser.runtime.sendMessage({
      action: 'callLLM',
      endpoint: llmSettings.endpoint,
      requestBody: requestBody,
    });

    console.info('[Content] LLM response received:', response);

    if (!response) {
      throw new Error(
        'No response from background script - message channel may have closed'
      );
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

    // Log the parsed JSON object for easy inspection in Chrome DevTools
    console.info('[Content] LLM extracted object:', extracted);

    // Parse dates through parseToISODate() to convert to YYYY-MM-DD format
    const postedDate = parseToISODate(extracted.postedDate || '');
    const deadline = parseToISODate(extracted.deadline || '');

    console.info(
      '[Content] Parsed dates - postedDate:',
      postedDate,
      'deadline:',
      deadline
    );

    // Build the data object
    const extractedData = {
      jobTitle: extracted.jobTitle || '',
      company: extracted.company || '',
      location: extracted.location || '',
      salary: extracted.salary || '',
      jobType: extracted.jobType || '',
      remoteType: extracted.remoteType || '',
      postedDate: postedDate,
      deadline: deadline,
      aboutJob: extracted.aboutJob || '',
      aboutCompany: extracted.aboutCompany || '',
      responsibilities: extracted.responsibilities || '',
      requirements: extracted.requirements || '',
      url: '', // Will be set by caller
      source: '', // Will be set by caller
      content: '', // Will be generated below
    };

    // Generate markdown content field from extracted data
    extractedData.content = generateJobContent(extractedData);

    return extractedData;
  } catch (error) {
    console.error('Error in LLM extraction:', error);
    throw error;
  }
}

/**
 * Message request interface
 */
interface MessageRequest {
  action: string;
  [key: string]: unknown;
}

/**
 * Message response interface
 */
interface MessageResponse {
  success?: boolean;
  url?: string;
  source?: string;
  rawText?: string;
  jobData?: ExtractedJobData;
  content?: string;
  error?: string;
}

// Setup message listener
function setupMessageListener() {
  // Listen for messages from popup
  browser.runtime.onMessage.addListener(
    (
      request: MessageRequest,
      _sender: Browser.runtime.MessageSender,
      sendResponse: (response?: MessageResponse) => void
    ) => {
      if (request.action === 'getJobUrl') {
        // Simple URL getter for duplicate detection
        try {
          const url = window.location.href;
          const source = extractSource();
          sendResponse({ success: true, url, source });
        } catch (error) {
          console.error('[Content] Failed to get URL:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          sendResponse({ success: false, error: errorMessage });
        }
        return true; // Keep message channel open for async response
      }

      if (request.action === 'streamExtractJobData') {
        (async () => {
          try {
            const llmSettings = request.llmSettings || {};
            const jobId = request.jobId;

            // Check if LLM endpoint is configured (enabled field is optional)
            if (!llmSettings.endpoint) {
              throw new Error(
                'LLM endpoint not configured. Streaming extraction requires LLM.'
              );
            }

            console.info(
              '[Content] Starting streaming extraction for job:',
              jobId
            );

            // Extract basic metadata and raw text
            const url = window.location.href;
            const source = extractSource();
            const rawText = extractRawJobText();

            console.info(
              '[Content] Extracted raw text length:',
              rawText.length
            );

            // Send extraction request to background which has access to LLMClient
            sendResponse({
              success: true,
              url,
              source,
              rawText,
              jobId,
            });
          } catch (error) {
            console.error('[Content] Streaming extraction error:', error);
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            sendResponse({ success: false, error: errorMessage });
          }
        })();
        return true; // Keep message channel open for async response
      }
    }
  );
}
