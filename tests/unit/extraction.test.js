/**
 * Unit tests for job data extraction functions
 * 
 * These tests demonstrate testing patterns for the Sir Hires codebase.
 * They mock DOM elements and test extraction logic in isolation.
 */

describe('Job Data Extraction', () => {
  describe('extractSource', () => {
    // Mock window.location for testing
    const mockLocation = (hostname) => {
      delete window.location
      window.location = { hostname }
    }

    afterEach(() => {
      // Restore original location
      jest.restoreAllMocks()
    })

    it('should identify LinkedIn as the source', () => {
      mockLocation('www.linkedin.com')
      const source = extractSource()
      expect(source).toBe('LinkedIn')
    })

    it('should identify Indeed as the source', () => {
      mockLocation('www.indeed.com')
      const source = extractSource()
      expect(source).toBe('Indeed')
    })

    it('should identify Glassdoor as the source', () => {
      mockLocation('www.glassdoor.com')
      const source = extractSource()
      expect(source).toBe('Glassdoor')
    })

    it('should return hostname for unknown job boards', () => {
      mockLocation('example.com')
      const source = extractSource()
      expect(source).toBe('example.com')
    })
  })

  describe('generateJobContent', () => {
    it('should generate markdown content with basic fields', () => {
      const jobData = {
        jobTitle: 'Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
      }

      const content = generateJobContent(jobData)

      expect(content).toContain('<JOB>')
      expect(content).toContain('TITLE: Software Engineer')
      expect(content).toContain('COMPANY: Tech Corp')
      expect(content).toContain('ADDRESS: San Francisco, CA')
    })

    it('should handle salary ranges correctly', () => {
      const jobData = {
        jobTitle: 'Developer',
        salary: '$100,000 - $150,000',
      }

      const content = generateJobContent(jobData)

      expect(content).toContain('SALARY_RANGE_MIN: 100000')
      expect(content).toContain('SALARY_RANGE_MAX: 150000')
    })

    it('should convert remote type to uppercase', () => {
      const jobData = {
        jobTitle: 'Developer',
        remoteType: 'remote',
      }

      const content = generateJobContent(jobData)

      expect(content).toContain('REMOTE_TYPE: REMOTE')
    })

    it('should handle missing optional fields gracefully', () => {
      const jobData = {
        jobTitle: 'Developer',
      }

      const content = generateJobContent(jobData)

      expect(content).toContain('TITLE: Developer')
      expect(content).not.toContain('COMPANY:')
      expect(content).not.toContain('SALARY_RANGE')
    })
  })

  describe('inferExperienceLevel', () => {
    it('should infer Senior level from job title', () => {
      const level = inferExperienceLevel('Senior Software Engineer')
      expect(level).toBe('SENIOR')
    })

    it('should infer Junior level from job title', () => {
      const level = inferExperienceLevel('Junior Developer')
      expect(level).toBe('JUNIOR')
    })

    it('should infer Lead level from job title', () => {
      const level = inferExperienceLevel('Lead Engineer')
      expect(level).toBe('LEAD')
    })

    it('should return null for unclear titles', () => {
      const level = inferExperienceLevel('Software Engineer')
      expect(level).toBeNull()
    })
  })
})

// Note: These are example tests demonstrating the pattern.
// Actual implementation of these functions needs to be imported from content.js
// Currently content.js needs to be refactored to export these functions for testing.

/**
 * Helper functions for tests
 * These would normally be imported from the actual modules
 */

function extractSource() {
  const hostname = window.location.hostname
  if (hostname.includes('linkedin.com')) return 'LinkedIn'
  if (hostname.includes('indeed.com')) return 'Indeed'
  if (hostname.includes('glassdoor.com')) return 'Glassdoor'
  return hostname
}

function generateJobContent(data) {
  const lines = ['<JOB>']
  
  if (data.jobTitle) lines.push(`TITLE: ${data.jobTitle}`)
  if (data.company) lines.push(`COMPANY: ${data.company}`)
  if (data.location) lines.push(`ADDRESS: ${data.location}`)
  
  if (data.remoteType && data.remoteType !== 'Not specified') {
    const remoteTypeUpper = data.remoteType.toUpperCase().replace('-', '')
    lines.push(`REMOTE_TYPE: ${remoteTypeUpper}`)
  }
  
  if (data.salary) {
    const salaryMatch = data.salary.match(/\$?([\d,]+)(?:\s*(?:-|to)\s*\$?([\d,]+))?/i)
    if (salaryMatch) {
      const min = salaryMatch[1].replace(/,/g, '')
      const max = salaryMatch[2] ? salaryMatch[2].replace(/,/g, '') : null
      if (min) lines.push(`SALARY_RANGE_MIN: ${min}`)
      if (max) lines.push(`SALARY_RANGE_MAX: ${max}`)
    }
  }
  
  return lines.join('\n')
}

function inferExperienceLevel(jobTitle) {
  if (!jobTitle) return null
  
  const title = jobTitle.toLowerCase()
  
  if (title.includes('senior') || title.includes('sr.')) return 'SENIOR'
  if (title.includes('junior') || title.includes('jr.')) return 'JUNIOR'
  if (title.includes('lead') || title.includes('principal')) return 'LEAD'
  if (title.includes('staff')) return 'STAFF'
  if (title.includes('entry')) return 'ENTRY_LEVEL'
  
  return null
}
