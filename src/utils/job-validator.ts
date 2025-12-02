// Job Template Validator
// Thin wrapper around unified template validator with job-specific schema

import type { JobTemplateData } from './job-parser';
import type { ParsedTemplate } from './template-parser';
import {
  validateTemplate,
  getValidationSummary,
  type ValidationResult,
  type ValidationSchema,
} from './template-validator';

/**
 * Job validation result interface (alias for unified result)
 */
export type JobValidationResult = ValidationResult;

/**
 * Standard top-level fields for jobs
 */
const STANDARD_JOB_FIELDS = [
  'TITLE',
  'COMPANY',
  'ADDRESS',
  'EMPLOYMENT TYPE',
  'REMOTE TYPE',
  'POSTED DATE',
  'CLOSING DATE',
  'EXPERIENCE LEVEL',
  'SALARY RANGE MIN',
  'SALARY RANGE MAX',
];

/**
 * Standard section names for jobs
 */
const STANDARD_JOB_SECTIONS = [
  'REQUIRED SKILLS',
  'PREFERRED SKILLS',
  'DESCRIPTION',
  'ABOUT COMPANY',
];

/**
 * Job validation schema
 */
const JOB_SCHEMA: ValidationSchema = {
  expectedType: 'JOB',
  missingTypeIsError: true,
  requiredFields: ['TITLE', 'COMPANY'],
  standardFields: STANDARD_JOB_FIELDS,
  sections: {
    'REQUIRED SKILLS': { required: true },
    'PREFERRED SKILLS': {},
    DESCRIPTION: {},
    'ABOUT COMPANY': {},
  },
  standardSections: STANDARD_JOB_SECTIONS,
  validateItems: false, // Jobs don't have ## items
};

/**
 * Convert JobTemplateData to ParsedTemplate for validation
 * JobTemplateData has a simplified section structure (list + fields + text)
 * ParsedTemplate has full structure (items, list, text, fields)
 */
function convertToParssedTemplate(jobData: JobTemplateData): ParsedTemplate {
  const sections: ParsedTemplate['sections'] = {};

  for (const [name, section] of Object.entries(jobData.sections)) {
    sections[name] = {
      items: [],
      list: section.list || [],
      text: section.text || [],
      fields: section.fields || {},
      originalName: section.originalName,
    };
  }

  return {
    type: jobData.type,
    topLevelFields: jobData.topLevelFields,
    sections,
    raw: jobData.raw,
  };
}

/**
 * Validate a parsed job template
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Validation result with errors, warnings, and info
 */
function validateJobTemplate(parsedJob: JobTemplateData): JobValidationResult {
  if (!parsedJob) {
    return {
      valid: false,
      errors: [{ type: 'invalid_input', message: 'No parsed job provided' }],
      warnings: [],
      info: [],
      customFields: [],
      customSections: [],
      fixes: [],
    };
  }

  const parsed = convertToParssedTemplate(parsedJob);
  return validateTemplate(parsed, JOB_SCHEMA);
}

/**
 * Get a human-readable summary of validation results
 * @param validationResult - Result from validateJobTemplate()
 * @returns Summary text
 */
function getJobValidationSummary(
  validationResult: JobValidationResult
): string {
  return getValidationSummary(validationResult);
}

// Short aliases for convenience
const validateJob = validateJobTemplate;

// Export functions for use in other modules (ES6 modules)
export {
  validateJobTemplate,
  validateJob,
  getJobValidationSummary,
  JOB_SCHEMA,
};
