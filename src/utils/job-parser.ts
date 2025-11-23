// Job Template Parser
// Parses MarkdownDB Job Template format into structured data

/**
 * Type definition for parsed job template data
 */
export interface JobTemplateData {
  type: string | null;
  topLevelFields: Record<string, string>;
  sections: Record<string, { list: string[]; fields?: Record<string, string> }>;
  raw: string;
}

/**
 * Type definition for mapped job fields (legacy schema compatibility)
 */
export interface MappedJobFields {
  jobTitle?: string;
  company?: string;
  location?: string;
  jobType?: string;
  remoteType?: string;
  postedDate?: string;
  deadline?: string;
  experienceLevel?: string;
  salary?: string;
}

/**
 * Parse a Job Template string into structured data
 * @param content - The raw job template content
 * @returns Parsed job data
 */
function parseJobTemplate(content: string): JobTemplateData {
  if (!content || typeof content !== 'string') {
    return {
      type: null,
      topLevelFields: {},
      sections: {},
      raw: content || '',
    };
  }

  const lines = content.split('\n');
  const result: JobTemplateData = {
    type: null,
    topLevelFields: {},
    sections: {},
    raw: content,
  };

  let currentSection: string | null = null;

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
    const typeMatch = trimmedLine.match(/^<(\w+)>$/);
    if (typeMatch) {
      result.type = typeMatch[1];
      continue;
    }

    // Check for section header (# SECTION_NAME)
    const sectionMatch = trimmedLine.match(/^#\s+([A-Z_]+):?(\s|\/\/|$)/);
    if (sectionMatch) {
      const sectionName = sectionMatch[1];
      currentSection = sectionName;
      result.sections[currentSection] = {
        list: [],
      };
      continue;
    }

    // Check for list item (- item)
    const listMatch = trimmedLine.match(/^-\s+(.+)$/);
    if (listMatch) {
      const itemValue = listMatch[1];

      if (currentSection) {
        // List item within a section
        result.sections[currentSection].list.push(itemValue);
      }
      continue;
    }

    // Check for key-value pair (KEY: value)
    const kvMatch = trimmedLine.match(/^([A-Z_]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let value = kvMatch[2].trim();

      // Remove inline comments (// comment)
      if (value.includes('//')) {
        value = value.split('//')[0].trim();
      }

      if (currentSection) {
        // Field within a section (not standard for Job template, but support it)
        if (!result.sections[currentSection].fields) {
          result.sections[currentSection].fields = {};
        }
        result.sections[currentSection].fields![key] = value;
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
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of description strings
 */
function extractDescription(parsedJob: JobTemplateData): string[] {
  if (!parsedJob.sections.DESCRIPTION) {
    return [];
  }

  return parsedJob.sections.DESCRIPTION.list || [];
}

/**
 * Extract required skills from parsed job
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of required skill strings
 */
function extractRequiredSkills(parsedJob: JobTemplateData): string[] {
  if (!parsedJob.sections.REQUIRED_SKILLS) {
    return [];
  }

  return parsedJob.sections.REQUIRED_SKILLS.list || [];
}

/**
 * Extract preferred skills from parsed job
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of preferred skill strings
 */
function extractPreferredSkills(parsedJob: JobTemplateData): string[] {
  if (!parsedJob.sections.PREFERRED_SKILLS) {
    return [];
  }

  return parsedJob.sections.PREFERRED_SKILLS.list || [];
}

/**
 * Extract company info from parsed job
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of company info strings
 */
function extractAboutCompany(parsedJob: JobTemplateData): string[] {
  if (!parsedJob.sections.ABOUT_COMPANY) {
    return [];
  }

  return parsedJob.sections.ABOUT_COMPANY.list || [];
}

/**
 * Get a specific top-level field value
 * @param parsedJob - Result from parseJobTemplate()
 * @param fieldName - Name of the field (e.g., 'TITLE', 'COMPANY')
 * @returns Field value or null if not found
 */
function getTopLevelField(
  parsedJob: JobTemplateData,
  fieldName: string
): string | null {
  return parsedJob.topLevelFields[fieldName] || null;
}

/**
 * Get all top-level fields as a flat object
 * @param parsedJob - Result from parseJobTemplate()
 * @returns All top-level fields
 */
function getAllTopLevelFields(
  parsedJob: JobTemplateData
): Record<string, string> {
  return parsedJob.topLevelFields || {};
}

/**
 * Get all sections as an object
 * @param parsedJob - Result from parseJobTemplate()
 * @returns All sections
 */
function getAllSections(
  parsedJob: JobTemplateData
): Record<string, { list: string[]; fields?: Record<string, string> }> {
  return parsedJob.sections || {};
}

/**
 * Map parsed MarkdownDB template fields to legacy job object fields
 * This function converts field names from the MarkdownDB Job Template format
 * to the legacy storage schema field names for backward compatibility.
 *
 * @param fields - Parsed topLevelFields from parseJobTemplate()
 * @returns Job fields compatible with storage schema
 */
function mapMarkdownFieldsToJob(
  fields: Record<string, string>
): MappedJobFields {
  const mapped: MappedJobFields = {};

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

/**
 * Convenience getter: Extract job title from parsed template
 * ✅ CORRECT PATTERN - Use this instead of accessing parsed.topLevelFields['TITLE'] directly
 *
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Job title or null if not found
 *
 * @example
 * const parsed = parseJobTemplate(job.content);
 * const title = getJobTitle(parsed); // ✅ CORRECT
 * // NOT: const title = parsed.topLevelFields['TITLE']; // ❌ WRONG
 */
function getJobTitle(parsedJob: JobTemplateData): string | null {
  return getTopLevelField(parsedJob, 'TITLE');
}

/**
 * Convenience getter: Extract company name from parsed template
 * ✅ CORRECT PATTERN - Use this instead of accessing parsed.topLevelFields['COMPANY'] directly
 *
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Company name or null if not found
 *
 * @example
 * const parsed = parseJobTemplate(job.content);
 * const company = getCompanyName(parsed); // ✅ CORRECT
 * // NOT: const company = parsed.topLevelFields['COMPANY']; // ❌ WRONG
 */
function getCompanyName(parsedJob: JobTemplateData): string | null {
  return getTopLevelField(parsedJob, 'COMPANY');
}

/**
 * Convenience getter: Extract location from parsed template
 *
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Location or null if not found
 */
function getLocation(parsedJob: JobTemplateData): string | null {
  return getTopLevelField(parsedJob, 'ADDRESS');
}

/**
 * Convenience getter: Extract job type from parsed template
 *
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Job type or null if not found
 */
function getJobType(parsedJob: JobTemplateData): string | null {
  return getTopLevelField(parsedJob, 'EMPLOYMENT_TYPE');
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
  getAllTopLevelFields,
  getAllSections,
  mapMarkdownFieldsToJob,
  getJobTitle,
  getCompanyName,
  getLocation,
  getJobType,
};
