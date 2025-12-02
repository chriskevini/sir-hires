// Job Template Parser
// Thin wrapper around unified template parser for job-specific functionality
//
// Format:
// - <JOB> wrapper
// - KEY: value for top-level fields (TITLE, COMPANY, etc.)
// - # SECTION for sections (REQUIRED SKILLS, DESCRIPTION, etc.)
// - - bullet for list items within sections

import { parseTemplate, type ParsedTemplate } from './template-parser';

/**
 * Type definition for parsed job template data
 * Extends ParsedTemplate with job-specific section structure
 */
export interface JobTemplateData {
  type: string | null;
  topLevelFields: Record<string, string>;
  sections: Record<
    string,
    {
      list: string[];
      fields?: Record<string, string>;
      text?: string[];
      originalName?: string;
    }
  >;
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
 * Convert unified ParsedTemplate to JobTemplateData format
 * This maintains backward compatibility with existing code
 */
function convertToJobTemplateData(parsed: ParsedTemplate): JobTemplateData {
  const sections: JobTemplateData['sections'] = {};

  for (const [name, section] of Object.entries(parsed.sections)) {
    sections[name] = {
      list: section.list,
    };
    if (Object.keys(section.fields).length > 0) {
      sections[name].fields = section.fields;
    }
    if (section.text && section.text.length > 0) {
      sections[name].text = section.text;
    }
    if (section.originalName) {
      sections[name].originalName = section.originalName;
    }
  }

  return {
    type: parsed.type,
    topLevelFields: parsed.topLevelFields,
    sections,
    raw: parsed.raw,
  };
}

/**
 * Parse a Job Template string into structured data
 * @param content - The raw job template content
 * @returns Parsed job data
 */
function parseJobTemplate(content: string): JobTemplateData {
  const parsed = parseTemplate(content);
  return convertToJobTemplateData(parsed);
}

/**
 * Extract description from parsed job
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of description strings
 */
function extractDescription(parsedJob: JobTemplateData): string[] {
  return parsedJob.sections.DESCRIPTION?.list || [];
}

/**
 * Extract required skills from parsed job
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of required skill strings
 */
function extractRequiredSkills(parsedJob: JobTemplateData): string[] {
  // Support both old format (REQUIRED_SKILLS) and new format (REQUIRED SKILLS)
  return (
    parsedJob.sections['REQUIRED SKILLS']?.list ||
    parsedJob.sections.REQUIRED_SKILLS?.list ||
    []
  );
}

/**
 * Extract preferred skills from parsed job
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of preferred skill strings
 */
function extractPreferredSkills(parsedJob: JobTemplateData): string[] {
  // Support both old format (PREFERRED_SKILLS) and new format (PREFERRED SKILLS)
  return (
    parsedJob.sections['PREFERRED SKILLS']?.list ||
    parsedJob.sections.PREFERRED_SKILLS?.list ||
    []
  );
}

/**
 * Extract company info from parsed job
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Array of company info strings
 */
function extractAboutCompany(parsedJob: JobTemplateData): string[] {
  // Support both old format (ABOUT_COMPANY) and new format (ABOUT COMPANY)
  return (
    parsedJob.sections['ABOUT COMPANY']?.list ||
    parsedJob.sections.ABOUT_COMPANY?.list ||
    []
  );
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
 * Supports both underscore (legacy) and space (new) format field names.
 *
 * @param fields - Parsed topLevelFields from parseJobTemplate()
 * @returns Job fields compatible with storage schema
 */
function mapMarkdownFieldsToJob(
  fields: Record<string, string>
): MappedJobFields {
  const mapped: MappedJobFields = {};

  // Helper to get field by either underscore or space format
  const getField = (underscore: string, space: string): string | undefined =>
    fields[underscore] || fields[space];

  // Map field names from MarkdownDB template to job storage schema
  if (fields.TITLE) mapped.jobTitle = fields.TITLE;
  if (fields.COMPANY) mapped.company = fields.COMPANY;
  if (fields.ADDRESS) mapped.location = fields.ADDRESS;

  const employmentType = getField('EMPLOYMENT_TYPE', 'EMPLOYMENT TYPE');
  if (employmentType) mapped.jobType = employmentType;

  const remoteType = getField('REMOTE_TYPE', 'REMOTE TYPE');
  if (remoteType) mapped.remoteType = remoteType;

  const postedDate = getField('POSTED_DATE', 'POSTED DATE');
  if (postedDate) mapped.postedDate = postedDate;

  const closingDate = getField('CLOSING_DATE', 'CLOSING DATE');
  if (closingDate) mapped.deadline = closingDate;

  const experienceLevel = getField('EXPERIENCE_LEVEL', 'EXPERIENCE LEVEL');
  if (experienceLevel) mapped.experienceLevel = experienceLevel;

  // Handle salary range - combine min/max into single string
  const salaryMin = getField('SALARY_RANGE_MIN', 'SALARY RANGE MIN');
  const salaryMax = getField('SALARY_RANGE_MAX', 'SALARY RANGE MAX');
  if (salaryMin || salaryMax) {
    const min = salaryMin || '';
    const max = salaryMax || '';
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
