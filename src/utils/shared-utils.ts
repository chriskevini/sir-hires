// Shared utility functions for sir-hires Chrome extension

// ===========================
// ID Generation Utilities
// ===========================

/**
 * Generate unique job ID
 * @returns Unique job ID in format: job_<timestamp>_<random>
 */
export function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Generate unique checklist item ID
 * @param status - The checklist status category (e.g., "Researching", "Applied")
 * @param index - The item index within the status category
 * @returns Unique item ID in format: item_<timestamp>_<status>_<index>_<random>
 */
export function generateItemId(status: string, index: number): string {
  return `item_${Date.now()}_${status}_${index}_${Math.random().toString(36).substring(2, 11)}`;
}

// ===========================
// HTML & Display Utilities
// ===========================

/**
 * Escape HTML to prevent XSS attacks
 * @param text - The text to escape
 * @returns HTML-safe text
 */
export function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===========================
// URL Utilities
// ===========================

/**
 * Normalize URL for comparison
 * Removes tracking params, www prefix, query strings, hashes, trailing slashes
 * Case-insensitive comparison
 * @param url - URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);

    // Remove 'www.' prefix from hostname
    let hostname = urlObj.hostname.toLowerCase();
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    // Get pathname and remove trailing slash
    let pathname = urlObj.pathname.toLowerCase().replace(/\/$/, '');

    // For LinkedIn job URLs, remove tracking parameters from pathname
    // Example: /jobs/view/1234567890/?trackingId=xyz → /jobs/view/1234567890
    if (hostname.includes('linkedin.com') && pathname.includes('/jobs/')) {
      // Extract job ID pattern: /jobs/view/[digits]
      const jobIdMatch = pathname.match(/\/jobs\/view\/(\d+)/);
      if (jobIdMatch) {
        pathname = `/jobs/view/${jobIdMatch[1]}`;
      }
    }

    // Combine protocol + normalized hostname + normalized pathname
    // Ignore all query params and hash
    return `${urlObj.protocol}//${hostname}${pathname}`;
  } catch {
    // Fallback for invalid URLs
    return url.trim().toLowerCase();
  }
}
