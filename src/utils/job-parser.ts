// Job Template Parser
// Parses MarkdownDB Job Template format into structured data

/**
 * Parse a Job Template string into structured data
 * @param {string} content - The raw job template content
 * @returns {Object} Parsed job data with structure:
 *   {
 *     type: string,           // Should be "JOB"
 *     topLevelFields: {},     // Top-level KEY: value pairs
 *     sections: {},           // Sections (# SECTION_NAME)
 *     raw: string             // Original content
 *   }
 */
function parseJobTemplate(content) {
  if (!content || typeof content !== 'string') {
    return {
      type: null,
      topLevelFields: {},
      sections: {},
      raw: content || '',
    };
  }

  const lines = content.split('\n');
  const result = {
    type: null,
    topLevelFields: {},
    sections: {},
    raw: content,
  };

  let currentSection = null;
  let currentList = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//')) {
      continue;
    }

    // Skip closing tags (</JOB>, </PROFILE>, etc.)
    if (trimmedLine.match(/^<\/\w+>$/)) {
      continue;
    }

    // Check for <JOB> type declaration
    if (trimmedLine.match(/^<(\w+)>$/)) {
      result.type = trimmedLine.match(/^<(\w+)>$/)[1];
      continue;
    }

    // Check for section header (# SECTION_NAME)
    if (trimmedLine.match(/^#\s+([A-Z_]+):?(\s|\/\/|$)/)) {
      const sectionName = trimmedLine.match(/^#\s+([A-Z_]+):?(\s|\/\/|$)/)[1];
      currentSection = sectionName;
      currentList = null;
      result.sections[currentSection] = {
        list: [],
      };
      continue;
    }

    // Check for list item (- item)
    if (trimmedLine.match(/^-\s+(.+)$/)) {
      const itemValue = trimmedLine.match(/^-\s+(.+)$/)[1];

      if (currentSection) {
        // List item within a section
        result.sections[currentSection].list.push(itemValue);
      }
      continue;
    }

    // Check for key-value pair (KEY: value)
    if (trimmedLine.match(/^([A-Z_]+):\s*(.*)$/)) {
      const match = trimmedLine.match(/^([A-Z_]+):\s*(.*)$/);
      const key = match[1];
      let value = match[2].trim();

      // Remove inline comments (// comment)
      if (value.includes('//')) {
        value = value.split('//')[0].trim();
      }

      if (currentSection) {
        // Field within a section (not standard for Job template, but support it)
        result.sections[currentSection].fields =
          result.sections[currentSection].fields || {};
        result.sections[currentSection].fields[key] = value;
      } else {
        // Top-level field
        result.topLevelFields[key] = value;
      }
      continue;
    }
  }

  return result;
}

/**
 * Extract description from parsed job
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @returns {Array} Array of description strings
 */
function extractDescription(parsedJob) {
  if (!parsedJob.sections.DESCRIPTION) {
    return [];
  }

  return parsedJob.sections.DESCRIPTION.list || [];
}

/**
 * Extract required skills from parsed job
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @returns {Array} Array of required skill strings
 */
function extractRequiredSkills(parsedJob) {
  if (!parsedJob.sections.REQUIRED_SKILLS) {
    return [];
  }

  return parsedJob.sections.REQUIRED_SKILLS.list || [];
}

/**
 * Extract preferred skills from parsed job
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @returns {Array} Array of preferred skill strings
 */
function extractPreferredSkills(parsedJob) {
  if (!parsedJob.sections.PREFERRED_SKILLS) {
    return [];
  }

  return parsedJob.sections.PREFERRED_SKILLS.list || [];
}

/**
 * Extract company info from parsed job
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @returns {Array} Array of company info strings
 */
function extractAboutCompany(parsedJob) {
  if (!parsedJob.sections.ABOUT_COMPANY) {
    return [];
  }

  return parsedJob.sections.ABOUT_COMPANY.list || [];
}

/**
 * Get a specific top-level field value
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @param {string} fieldName - Name of the field (e.g., 'TITLE', 'COMPANY')
 * @returns {string|null} Field value or null if not found
 */
function getTopLevelField(parsedJob, fieldName) {
  return parsedJob.topLevelFields[fieldName] || null;
}

/**
 * Get all top-level fields as a flat object
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @returns {Object} All top-level fields
 */
function getAllTopLevelFields(parsedJob) {
  return parsedJob.topLevelFields || {};
}

/**
 * Get all sections as an object
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @returns {Object} All sections
 */
function getAllSections(parsedJob) {
  return parsedJob.sections || {};
}

/**
 * Map parsed MarkdownDB template fields to legacy job object fields
 * This function converts field names from the MarkdownDB Job Template format
 * to the legacy storage schema field names for backward compatibility.
 *
 * @param {Object} fields - Parsed topLevelFields from parseJobTemplate()
 * @returns {Object} Job fields compatible with storage schema
 */
function mapMarkdownFieldsToJob(fields) {
  const mapped = {};

  // Map field names from MarkdownDB template to job storage schema
  if (fields.TITLE) mapped.jobTitle = fields.TITLE;
  if (fields.COMPANY) mapped.company = fields.COMPANY;
  if (fields.ADDRESS) mapped.location = fields.ADDRESS;
  if (fields.EMPLOYMENT_TYPE) mapped.jobType = fields.EMPLOYMENT_TYPE;
  if (fields.REMOTE_TYPE) mapped.remoteType = fields.REMOTE_TYPE;
  if (fields.POSTED_DATE) mapped.postedDate = fields.POSTED_DATE;
  if (fields.CLOSING_DATE) mapped.deadline = fields.CLOSING_DATE;
  if (fields.EXPERIENCE_LEVEL) mapped.experienceLevel = fields.EXPERIENCE_LEVEL;

  // Handle salary range - combine min/max into single string
  if (fields.SALARY_RANGE_MIN || fields.SALARY_RANGE_MAX) {
    const min = fields.SALARY_RANGE_MIN || '';
    const max = fields.SALARY_RANGE_MAX || '';
    mapped.salary = min && max ? `${min} - ${max}` : min || max;
  }

  return mapped;
}

// Short aliases for convenience
const parseJob = parseJobTemplate;

// Export functions for use in other modules (ES6 modules)
export {
  parseJobTemplate,
  parseJob,
  extractDescription,
  extractRequiredSkills,
  extractPreferredSkills,
  extractAboutCompany,
  getTopLevelField,
  getAllTopLevelFields,
  getAllSections,
  mapMarkdownFieldsToJob,
};
