// Job Template Validator
// Validates parsed MarkdownDB Job Template against schema rules
// Philosophy: Validate structure, celebrate creativity

/**
 * Validation schema for standard Job Template fields
 * Note: This is NOT exhaustive - custom fields are ENCOURAGED
 */
const JOB_SCHEMA = {
  // Top-level required fields
  topLevelRequired: ['TITLE', 'COMPANY'],
  
  // Top-level optional standard fields
  topLevelOptional: [
    'ADDRESS', 
    'REMOTE_TYPE', 
    'SALARY_RANGE_MIN', 
    'SALARY_RANGE_MAX', 
    'EMPLOYMENT_TYPE', 
    'EXPERIENCE_LEVEL',
    'POSTED_DATE', 
    'CLOSING_DATE'
  ],
  
  // Standard sections (all are list-based)
  standardSections: {
    REQUIRED_SKILLS: { 
      isList: true, 
      required: true  // This section is required
    },
    DESCRIPTION: { 
      isList: true 
    },
    PREFERRED_SKILLS: { 
      isList: true 
    },
    ABOUT_COMPANY: { 
      isList: true 
    }
  },
  
  // Enum field validation
  enums: {
    REMOTE_TYPE: ['ONSITE', 'REMOTE', 'HYBRID'],
    EMPLOYMENT_TYPE: ['FULL-TIME', 'PART-TIME', 'CONTRACT', 'INTERNSHIP', 'COOP'],
    EXPERIENCE_LEVEL: ['ENTRY', 'MID', 'SENIOR', 'LEAD']
  }
};

/**
 * Validate a parsed job template
 * @param {Object} parsedJob - Result from parseJobTemplate()
 * @returns {Object} Validation result with structure:
 *   {
 *     valid: boolean,           // Overall validity (no critical errors)
 *     errors: [],              // Critical issues that should be fixed
 *     warnings: [],            // Non-critical issues
 *     info: [],                // Informational messages
 *     customFields: [],        // Custom top-level fields detected
 *     customSections: []       // Custom sections detected
 *   }
 */
function validateJobTemplate(parsedJob) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    customFields: [],
    customSections: []
  };

  if (!parsedJob) {
    result.valid = false;
    result.errors.push({
      type: 'invalid_input',
      message: 'No parsed job provided'
    });
    return result;
  }

  // Validate type declaration
  if (!parsedJob.type) {
    result.errors.push({
      type: 'missing_type',
      message: 'Missing <JOB> type declaration at the start'
    });
    result.valid = false;
  } else if (parsedJob.type !== 'JOB') {
    result.warnings.push({
      type: 'unexpected_type',
      message: `Expected <JOB> but found <${parsedJob.type}>`
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
      message: `Your job includes ${result.customFields.length} custom field(s): ${result.customFields.join(', ')}. These are fully supported and will be preserved.`
    });
  }

  if (result.customSections.length > 0) {
    result.info.push({
      type: 'custom_sections',
      message: `Your job includes ${result.customSections.length} custom section(s): ${result.customSections.join(', ')}. These are fully supported and will be preserved.`
    });
  }

  return result;
}

/**
 * Validate top-level fields
 */
function validateTopLevelFields(parsedJob, result) {
  const fields = parsedJob.topLevelFields || {};
  const fieldNames = Object.keys(fields);

  // Check required fields
  JOB_SCHEMA.topLevelRequired.forEach(requiredField => {
    if (!fields[requiredField] || fields[requiredField].trim() === '') {
      result.errors.push({
        type: 'missing_required_field',
        field: requiredField,
        message: `Required field "${requiredField}" is missing or empty`
      });
      result.valid = false;
    }
  });

  // Validate enum fields
  Object.keys(JOB_SCHEMA.enums).forEach(enumField => {
    const value = fields[enumField];
    const allowedValues = JOB_SCHEMA.enums[enumField];

    if (value && !allowedValues.includes(value)) {
      result.errors.push({
        type: 'invalid_enum_value',
        field: enumField,
        value: value,
        allowedValues: allowedValues,
        message: `Invalid value "${value}" for ${enumField}. Allowed values: ${allowedValues.join(', ')}`
      });
      result.valid = false;
    }
  });

  // Identify custom fields
  const standardFields = [
    ...JOB_SCHEMA.topLevelRequired, 
    ...JOB_SCHEMA.topLevelOptional
  ];
  fieldNames.forEach(fieldName => {
    if (!standardFields.includes(fieldName)) {
      result.customFields.push(fieldName);
    }
  });
}

/**
 * Validate sections
 */
function validateSections(parsedJob, result) {
  const sections = parsedJob.sections || {};
  const sectionNames = Object.keys(sections);

  // Check for required sections
  Object.keys(JOB_SCHEMA.standardSections).forEach(sectionName => {
    const schema = JOB_SCHEMA.standardSections[sectionName];
    
    if (schema.required) {
      if (!sections[sectionName]) {
        result.errors.push({
          type: 'missing_required_section',
          section: sectionName,
          message: `Required section "${sectionName}" is missing`
        });
        result.valid = false;
      } else if (sections[sectionName].list.length === 0) {
        result.warnings.push({
          type: 'empty_section',
          section: sectionName,
          message: `Required section "${sectionName}" is empty`
        });
      }
    }
  });

  // Validate each section
  sectionNames.forEach(sectionName => {
    const section = sections[sectionName];
    const schema = JOB_SCHEMA.standardSections[sectionName];

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
function validateListSection(sectionName, section, result, isRequired) {
  if (!section.list || section.list.length === 0) {
    if (isRequired) {
      // Already handled in validateSections as a warning
    } else {
      result.warnings.push({
        type: 'empty_section',
        section: sectionName,
        message: `Section "${sectionName}" is empty`
      });
    }
  }
}

/**
 * Get a human-readable summary of validation results
 * @param {Object} validationResult - Result from validateJobTemplate()
 * @returns {string} Summary text
 */
function getValidationSummary(validationResult) {
  const parts = [];

  if (validationResult.valid) {
    parts.push('✅ Job is valid!');
  } else {
    parts.push('❌ Job has errors that should be fixed.');
  }

  if (validationResult.errors.length > 0) {
    parts.push(`\n\n🔴 Errors (${validationResult.errors.length}):`);
    validationResult.errors.forEach(err => {
      parts.push(`  - ${err.message}`);
    });
  }

  if (validationResult.warnings.length > 0) {
    parts.push(`\n\n🟡 Warnings (${validationResult.warnings.length}):`);
    validationResult.warnings.forEach(warn => {
      parts.push(`  - ${warn.message}`);
    });
  }

  if (validationResult.info.length > 0) {
    parts.push(`\n\nℹ️ Info (${validationResult.info.length}):`);
    validationResult.info.forEach(info => {
      parts.push(`  - ${info.message}`);
    });
  }

  return parts.join('\n');
}

// Short aliases for convenience
const validateJob = validateJobTemplate;

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateJobTemplate,
    validateJob,
    getValidationSummary,
    JOB_SCHEMA
  };
}
