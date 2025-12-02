// Job Template Validator
// Validates parsed MarkdownDB Job Template against schema rules
// Philosophy: Validate structure, celebrate creativity

import type { JobTemplateData } from './job-parser';
import type { BaseValidationResult, ValidationFix } from './validation-types';

/**
 * Job validation result interface
 */
export interface JobValidationResult extends BaseValidationResult {
  fixes?: ValidationFix[];
}

/**
 * Job schema definition (SIMPLIFIED)
 * Philosophy: Only validate REQUIRED fields. Accept everything else.
 * This prevents validator from becoming a maintenance bottleneck.
 */
interface JobSchema {
  topLevelRequired: string[];
  standardSections: Record<
    string,
    {
      isList: boolean;
      required?: boolean;
    }
  >;
}

/**
 * Validation schema for Job Template
 * Only validates REQUIRED fields - optional fields are never validated
 * This ensures schema can evolve without breaking validation
 *
 * Note: Section names use spaces (new format) but we also check underscore variants
 * for backward compatibility
 */
const JOB_SCHEMA: JobSchema = {
  // Top-level required fields (ONLY THESE ARE VALIDATED)
  topLevelRequired: ['TITLE', 'COMPANY'],

  // Standard sections (all are list-based)
  // Using new format with spaces, but we check both formats in validation
  standardSections: {
    'REQUIRED SKILLS': {
      isList: true,
      required: true, // This section is required
    },
    DESCRIPTION: {
      isList: true,
    },
    'PREFERRED SKILLS': {
      isList: true,
    },
    'ABOUT COMPANY': {
      isList: true,
    },
  },
};

/**
 * Map of old section names (underscore) to new format (spaces)
 * Used for backward compatibility
 */
const SECTION_NAME_ALIASES: Record<string, string> = {
  REQUIRED_SKILLS: 'REQUIRED SKILLS',
  PREFERRED_SKILLS: 'PREFERRED SKILLS',
  ABOUT_COMPANY: 'ABOUT COMPANY',
};

/**
 * Find a section by name, checking both new format and legacy underscore format
 */
function findSection(
  sections: Record<string, { list: string[]; fields?: Record<string, string> }>,
  sectionName: string
): { list: string[]; fields?: Record<string, string> } | undefined {
  // Check exact match first (new format)
  if (sections[sectionName]) {
    return sections[sectionName];
  }

  // Check underscore variant (legacy format)
  const underscoreVariant = sectionName.replace(/ /g, '_');
  if (sections[underscoreVariant]) {
    return sections[underscoreVariant];
  }

  return undefined;
}

/**
 * Validate a parsed job template
 * @param parsedJob - Result from parseJobTemplate()
 * @returns Validation result with errors, warnings, and info
 */
function validateJobTemplate(parsedJob: JobTemplateData): JobValidationResult {
  const result: JobValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    customFields: [],
    customSections: [],
    fixes: [],
  };

  if (!parsedJob) {
    result.valid = false;
    result.errors.push({
      type: 'invalid_input',
      message: 'No parsed job provided',
    });
    return result;
  }

  // Validate type declaration
  if (!parsedJob.type) {
    result.errors.push({
      type: 'missing_type',
      message: 'Missing <JOB> type declaration at the start',
    });
    result.valid = false;
  } else if (parsedJob.type !== 'JOB') {
    result.warnings.push({
      type: 'unexpected_type',
      message: `Expected <JOB> but found <${parsedJob.type}>`,
    });
  }

  // Validate top-level fields
  validateTopLevelFields(parsedJob, result);

  // Validate sections
  validateSections(parsedJob, result);

  // Add informational messages about custom content
  if (result.customFields.length > 0) {
    result.info.push({
      type: 'custom_fields',
      message: `Custom fields: ${result.customFields.join(', ')}`,
    });
  }

  if (result.customSections.length > 0) {
    result.info.push({
      type: 'custom_sections',
      message: `Custom sections: ${result.customSections.join(', ')}`,
    });
  }

  return result;
}

/**
 * Validate top-level fields (SIMPLIFIED)
 * Only validates REQUIRED fields exist and are non-empty
 * All optional fields are accepted without validation
 */
function validateTopLevelFields(
  parsedJob: JobTemplateData,
  result: JobValidationResult
): void {
  const fields = parsedJob.topLevelFields || {};
  const fieldNames = Object.keys(fields);

  // Check required fields only
  JOB_SCHEMA.topLevelRequired.forEach((requiredField) => {
    if (!fields[requiredField] || fields[requiredField].trim() === '') {
      result.errors.push({
        type: 'missing_required_field',
        field: requiredField,
        message: `Missing required field "${requiredField}"`,
      });
      result.valid = false;
    }
  });

  // Identify custom fields (anything not in standard list)
  // Note: We don't validate optional fields, but we still track custom ones
  const knownStandardFields = [
    'TITLE',
    'COMPANY',
    'ADDRESS',
    'REMOTE_TYPE',
    'SALARY_RANGE_MIN',
    'SALARY_RANGE_MAX',
    'PAY_PERIOD',
    'EMPLOYMENT_TYPE',
    'EXPERIENCE_LEVEL',
    'POSTED_DATE',
    'CLOSING_DATE',
  ];
  fieldNames.forEach((fieldName) => {
    if (!knownStandardFields.includes(fieldName)) {
      result.customFields.push(fieldName);
    }
  });
}

/**
 * Validate sections
 */
function validateSections(
  parsedJob: JobTemplateData,
  result: JobValidationResult
): void {
  const sections = parsedJob.sections || {};
  const sectionNames = Object.keys(sections);

  // Check for required sections (using findSection for backward compatibility)
  Object.keys(JOB_SCHEMA.standardSections).forEach((sectionName) => {
    const schema = JOB_SCHEMA.standardSections[sectionName];

    if (schema.required) {
      const section = findSection(sections, sectionName);
      if (!section) {
        result.errors.push({
          type: 'missing_required_section',
          section: sectionName,
          message: `Required section "${sectionName}" is missing`,
        });
        result.valid = false;
      } else if (section.list.length === 0) {
        result.warnings.push({
          type: 'empty_section',
          section: sectionName,
          message: `Required section "${sectionName}" is empty`,
        });
        result.fixes?.push({
          type: 'delete_section',
          section: sectionName,
          buttonLabel: 'Delete',
          description: `Delete empty section "${sectionName}"`,
        });
      }
    }
  });

  // Build list of all known section names (both formats)
  const knownSectionNames = new Set<string>();
  for (const name of Object.keys(JOB_SCHEMA.standardSections)) {
    knownSectionNames.add(name);
    knownSectionNames.add(name.replace(/ /g, '_')); // underscore variant
  }

  // Validate each section
  sectionNames.forEach((sectionName) => {
    const section = sections[sectionName];

    // Normalize section name (convert underscore to space for schema lookup)
    const normalizedName = SECTION_NAME_ALIASES[sectionName] || sectionName;
    const schema = JOB_SCHEMA.standardSections[normalizedName];

    if (!schema) {
      // Custom section - this is encouraged!
      result.customSections.push(sectionName);
      return;
    }

    // Validate standard section
    if (schema.isList) {
      // Section should be a list
      validateListSection(sectionName, section, result, schema.required);
    }
  });
}

/**
 * Validate a list-type section
 */
function validateListSection(
  sectionName: string,
  section: { list: string[]; fields?: Record<string, string> },
  result: JobValidationResult,
  isRequired?: boolean
): void {
  if (!section.list || section.list.length === 0) {
    if (!isRequired) {
      result.warnings.push({
        type: 'empty_section',
        section: sectionName,
        message: `Section "${sectionName}" is empty`,
      });
      result.fixes?.push({
        type: 'delete_section',
        section: sectionName,
        buttonLabel: 'Delete',
        description: `Delete empty section "${sectionName}"`,
      });
    }
  }
}

/**
 * Get a human-readable summary of validation results
 * @param validationResult - Result from validateJobTemplate()
 * @returns Summary text
 */
function getJobValidationSummary(
  validationResult: JobValidationResult
): string {
  const parts: string[] = [];

  if (validationResult.valid) {
    parts.push('✅ Job is valid!');
  } else {
    parts.push('❌ Job has errors that should be fixed.');
  }

  if (validationResult.errors.length > 0) {
    parts.push(`\n\n🔴 Errors (${validationResult.errors.length}):`);
    validationResult.errors.forEach((err) => {
      parts.push(`  - ${err.message}`);
    });
  }

  if (validationResult.warnings.length > 0) {
    parts.push(`\n\n🟡 Warnings (${validationResult.warnings.length}):`);
    validationResult.warnings.forEach((warn) => {
      parts.push(`  - ${warn.message}`);
    });
  }

  if (validationResult.info.length > 0) {
    parts.push(`\n\nℹ️ Info (${validationResult.info.length}):`);
    validationResult.info.forEach((info) => {
      parts.push(`  - ${info.message}`);
    });
  }

  return parts.join('\n');
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
